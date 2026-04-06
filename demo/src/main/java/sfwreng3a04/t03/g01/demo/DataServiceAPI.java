package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAmount;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;

/**
 * Caches the most recent sensor readings from the event bus and exposes them
 * via a read-only REST API suitable for public/third-party consumption.
 * <p>
 * Event bus topics consumed:
 * region.{regionId}.ingress    – raw AnonymizedSensorData
 * region.{regionId}.agg.avg   – 5-minute rolling averages
 * region.{regionId}.agg.max   – hourly maximums
 * <p>
 * Also listens on mgmt.region.created to dynamically subscribe to new regions
 * without requiring a restart.
 * <p>
 * HTTP endpoints (all read-only, no auth required — public API):
 *
 *   GET /api/data/current
 *       ?region={regionId}       – filter by region ID string (optional)
 *       &type={SENSOR_TYPE}      – filter by SensorType name (optional)
 *       &start={RFC3339}         – start timestamp for data range (optional, defaults to 30 minutes ago)
 *       &end={RFC3339}           – end timestamp for data range (optional, defaults to current time)
 *       Returns a JSON array of the latest raw reading per region+sensor+type.
 *
 *   GET /api/data/aggregated
 *       ?region={regionId}       – required
 *       &type={SENSOR_TYPE}      – required
 *       &metric=avg|max          – optional, defaults to "avg"
 *       &start={RFC3339}         – start timestamp for data range (optional, defaults to 30 minutes ago)
 *       &end={RFC3339}           – end timestamp for data range (optional, defaults to current time)
 *       Returns the latest rolling-average or hourly-maximum for that region+type.
 */
public class DataServiceAPI extends VerticleBase {

  private final Router router;
  private final RegionManagement regionRepo;
  private final SensorDataManagement dataRepo;

  public DataServiceAPI(Router router, RegionManagement regionRepo, SensorDataManagement dataRepo) {
    this.router = router;
    this.regionRepo = regionRepo;
    this.dataRepo = dataRepo;
  }

  @Override
  public Future<?> start() {
    // ── HTTP routes ───────────────────────────────────────────────────────────

    /*
     * GET /api/data/current
     *
     * Optional query params:
     *   region – region ID string
     *   type   – SensorType name (case-insensitive)
     *   start  – RFC3339 timestamp for range start (defaults to 30 minutes ago)
     *   end    – RFC3339 timestamp for range end (defaults to null/unbounded)
     *
     * Returns a JSON array of all cached raw readings matching the filters.
     * If no filters are supplied, returns everything currently cached.
     */
    router.get("/api/data/current").handler(ctx -> {
      String regionParam = ctx.queryParams().get("region");
      String typeParam = ctx.queryParams().get("type");
      String startParam = ctx.queryParams().get("start");
      String endParam = ctx.queryParams().get("end");

      SensorType typeFilter = null;

      if (typeParam != null) {
        try {
          typeFilter = SensorType.valueOf(typeParam.toUpperCase());
        } catch (IllegalArgumentException e) {
          ctx.response().setStatusCode(400)
            .end("Invalid type. Valid values: "
              + "AIR_QUALITY, TEMPERATURE, HUMIDITY, NOISE, UV_INDEX, RAINFALL, WIND");
          return;
        }
      }

      Instant start;
      Instant end;
      try {
        start = startParam != null ? Instant.parse(startParam) : Instant.now().minus(Duration.of(30, ChronoUnit.MINUTES));
        end = endParam != null ? Instant.parse(endParam) : null;
      } catch (Exception e) {
        ctx.response().setStatusCode(400)
          .end("Invalid timestamp format. Use RFC3339 format (e.g., 2024-01-15T10:30:00Z)");
        return;
      }

      // Capture for lambda use
      final SensorType finalTypeFilter = typeFilter;

      JsonArray results = new JsonArray();

      dataRepo.getData(regionParam, SensorDataManagement.DataType.RAW, start, end)
        .stream().filter(d -> d.type() == finalTypeFilter)
        .sorted(Comparator.comparing(AnonymizedSensorData::timestamp).reversed())
        .forEach(d -> results.add(anonymizedToJson(d, regionParam)));

      ctx.response()
        .putHeader("content-type", "application/json")
        .end(results.encode());
    });

    /*
     * GET /api/data/aggregated
     *
     * Required query params:
     *   region – region ID string
     *   type   – SensorType name (case-insensitive)
     *
     * Optional query params:
     *   metric – "avg" (default) or "max"
     *   start  – RFC3339 timestamp for range start (defaults to 30 minutes ago)
     *   end    – RFC3339 timestamp for range end (defaults to null/unbounded)
     *
     * Returns a single JSON object with the latest aggregated value for the
     * given region+type pair, plus a "metric" field indicating which aggregate
     * was returned.
     */
    router.get("/api/data/aggregated").handler(ctx -> {
      String regionParam = ctx.queryParams().get("region");
      String typeParam = ctx.queryParams().get("type");
      String metricParam = ctx.queryParams().get("metric");
      String startParam = ctx.queryParams().get("start");
      String endParam = ctx.queryParams().get("end");

      if (regionParam == null || typeParam == null) {
        ctx.response().setStatusCode(400)
          .end("Both 'region' and 'type' query parameters are required");
        return;
      }

      SensorType type;
      try {
        type = SensorType.valueOf(typeParam.toUpperCase());
      } catch (IllegalArgumentException e) {
        ctx.response().setStatusCode(400)
          .end("Invalid type. Valid values: "
            + "AIR_QUALITY, TEMPERATURE, HUMIDITY, NOISE, UV_INDEX, RAINFALL, WIND");
        return;
      }

      Instant start;
      Instant end;
      try {
        start = startParam != null ? Instant.parse(startParam) : Instant.now().minus(Duration.of(30, ChronoUnit.MINUTES));
        end = endParam != null ? Instant.parse(endParam) : null;
      } catch (Exception e) {
        ctx.response().setStatusCode(400)
          .end("Invalid timestamp format. Use RFC3339 format (e.g., 2024-01-15T10:30:00Z)");
        return;
      }

      var dataType = "max".equalsIgnoreCase(metricParam) ? SensorDataManagement.DataType.MAX : SensorDataManagement.DataType.AVG;

      var arr = new JsonArray();

      dataRepo.getData(regionParam, dataType, start, end)
        .stream()
        .filter(d -> d.type() == type)
        .sorted(Comparator.comparing(AnonymizedSensorData::timestamp).reversed())
        .forEach(d -> arr.add(anonymizedToJson(d, regionParam)));

      ctx.response()
        .putHeader("content-type", "application/json")
        .end(arr.encode());
    });

    return Future.succeededFuture();
  }

  /**
   * Converts an {@link AnonymizedSensorData} to a {@link JsonObject} for the
   * HTTP response, adding an explicit {@code region} string field.
   * Note: sensorId is intentionally absent — this is anonymized data.
   */
  private JsonObject anonymizedToJson(AnonymizedSensorData d, String region) {
    return new JsonObject()
      .put("region", region)
      .put("regionId", d.regionId().toString())
      .put("type", d.type().name())
      .put("data", d.data())
      .put("timestamp", d.timestamp());
  }
}
