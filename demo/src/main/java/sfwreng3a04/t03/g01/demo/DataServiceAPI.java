package sfwreng3a04.t03.g01.demo;
 
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;
 
import java.util.HashMap;
import java.util.Map;
 
/**
 * Caches the most recent sensor readings from the event bus and exposes them
 * via a read-only REST API suitable for public/third-party consumption.
 *
 * Event bus topics consumed:
 *   region.{regionId}.ingress    – raw AnonymizedSensorData
 *   region.{regionId}.agg.avg   – 5-minute rolling averages
 *   region.{regionId}.agg.max   – hourly maximums
 *
 * Also listens on mgmt.region.created to dynamically subscribe to new regions
 * without requiring a restart.
 *
 * HTTP endpoints (all read-only, no auth required — public API):
 *
 *   GET /api/data/current
 *       ?region={regionId}       – filter by region ID string (optional)
 *       &type={SENSOR_TYPE}      – filter by SensorType name (optional)
 *       Returns a JSON array of the latest raw reading per region+sensor+type.
 *
 *   GET /api/data/aggregated
 *       ?region={regionId}       – required
 *       &type={SENSOR_TYPE}      – required
 *       &metric=avg|max          – optional, defaults to "avg"
 *       Returns the latest rolling-average or hourly-maximum for that region+type.
 */
public class DataServiceAPI extends VerticleBase {
 
  private final Router router;
  private final RegionManagement regionRepo;
 
  /**
   * Key: "{regionId}:{regionUUID}:{TYPE}"  → latest raw AnonymizedSensorData
   * We include regionUUID in the key so that multiple sensors in the same
   * region each get their own cache entry (regionId in AnonymizedSensorData
   * carries the UUID assigned at publish time).
   */
  private final Map<String, AnonymizedSensorData> latestRaw = new HashMap<>();
 
  /**
   * Key: "{regionId}:{TYPE}"  → latest 5-minute rolling-average
   */
  private final Map<String, AnonymizedSensorData> latestAvg = new HashMap<>();
 
  /**
   * Key: "{regionId}:{TYPE}"  → latest hourly-maximum
   */
  private final Map<String, AnonymizedSensorData> latestMax = new HashMap<>();
 
  public DataServiceAPI(Router router, RegionManagement regionRepo) {
    this.router = router;
    this.regionRepo = regionRepo;
  }
 
  @Override
  public Future<?> start() {
 
    // ── Subscribe to all regions that already exist ───────────────────────────
    for (var region : regionRepo.retrieveRegionList()) {
      subscribeToRegion(region.getRegionID());
    }
 
    // ── Dynamically subscribe when new regions are created ────────────────────
    vertx.eventBus().<String>consumer("mgmt.region.created", msg ->
      subscribeToRegion(msg.body())
    );
 
    // ── HTTP routes ───────────────────────────────────────────────────────────
 
    /*
     * GET /api/data/current
     *
     * Optional query params:
     *   region – region ID string
     *   type   – SensorType name (case-insensitive)
     *
     * Returns a JSON array of all cached raw readings matching the filters.
     * If no filters are supplied, returns everything currently cached.
     */
    router.get("/api/data/current").handler(ctx -> {
      String regionParam = ctx.queryParams().get("region");
      String typeParam   = ctx.queryParams().get("type");
 
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
 
      // Capture for lambda use
      final SensorType finalTypeFilter = typeFilter;
 
      JsonArray results = new JsonArray();
 
      for (Map.Entry<String, AnonymizedSensorData> entry : latestRaw.entrySet()) {
        // Key format: "{regionId}:{regionUUID}:{TYPE}"
        String[] parts = entry.getKey().split(":");
        String entryRegion = parts[0];
        AnonymizedSensorData d = entry.getValue();
 
        if (regionParam != null && !entryRegion.equals(regionParam)) continue;
        if (finalTypeFilter != null && d.type() != finalTypeFilter)   continue;
 
        results.add(anonymizedToJson(d, entryRegion));
      }
 
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
     *
     * Returns a single JSON object with the latest aggregated value for the
     * given region+type pair, plus a "metric" field indicating which aggregate
     * was returned.
     */
    router.get("/api/data/aggregated").handler(ctx -> {
      String regionParam = ctx.queryParams().get("region");
      String typeParam   = ctx.queryParams().get("type");
      String metricParam = ctx.queryParams().get("metric");
 
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
 
      boolean useMax = "max".equalsIgnoreCase(metricParam);
      String metric  = useMax ? "max" : "avg";
      String key     = regionParam + ":" + type.name();
 
      AnonymizedSensorData data = useMax ? latestMax.get(key) : latestAvg.get(key);
 
      if (data == null) {
        ctx.response().setStatusCode(404)
          .end("No aggregated data yet for region=" + regionParam + " type=" + type
            + " metric=" + metric);
        return;
      }
 
      JsonObject response = anonymizedToJson(data, regionParam)
        .put("metric", metric);
 
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(response.encode());
    });
 
    return Future.succeededFuture();
  }
 
  // ── Private helpers ───────────────────────────────────────────────────────────
 
  /**
   * Registers event bus consumers for all three topics of a given region.
   * Safe to call once per region — triggered either at startup (existing
   * regions) or dynamically via mgmt.region.created events.
   */
  private void subscribeToRegion(String regionId) {
    // Raw ingress — keyed per regionUUID so multiple data points coexist
    vertx.eventBus().<AnonymizedSensorData>consumer("region." + regionId + ".ingress", msg -> {
      AnonymizedSensorData d = msg.body();
      String key = regionId + ":" + d.regionId().toString() + ":" + d.type().name();
      latestRaw.put(key, d);
    });
 
    // 5-minute rolling average — one entry per region+type
    vertx.eventBus().<AnonymizedSensorData>consumer("region." + regionId + ".agg.avg", msg -> {
      AnonymizedSensorData d = msg.body();
      latestAvg.put(regionId + ":" + d.type().name(), d);
    });
 
    // Hourly maximum — one entry per region+type
    vertx.eventBus().<AnonymizedSensorData>consumer("region." + regionId + ".agg.max", msg -> {
      AnonymizedSensorData d = msg.body();
      latestMax.put(regionId + ":" + d.type().name(), d);
    });
 
    System.out.println("DataServiceAPI: subscribed to region " + regionId);
  }
 
  /**
   * Converts an {@link AnonymizedSensorData} to a {@link JsonObject} for the
   * HTTP response, adding an explicit {@code region} string field.
   * Note: sensorId is intentionally absent — this is anonymized data.
   */
  private JsonObject anonymizedToJson(AnonymizedSensorData d, String region) {
    return new JsonObject()
      .put("region",    region)
      .put("regionId",  d.regionId().toString())
      .put("type",      d.type().name())
      .put("data",      d.data())
      .put("timestamp", d.timestamp());
  }
}