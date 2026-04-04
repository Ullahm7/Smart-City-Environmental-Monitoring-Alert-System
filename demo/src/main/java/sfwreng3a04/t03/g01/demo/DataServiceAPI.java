package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
 
import java.util.HashMap;
import java.util.Map;
 
/**
 * Caches the most recent sensor readings from the event bus and exposes them
 * via a read-only REST API suitable for public/third-party consumption.
 *
 * <pre>
 * Event bus (consumed):
 *   region.{N}.ingress     – raw SensorData   → stored under key "region:sensorId:TYPE"
 *   region.{N}.agg.avg     – 5-min averages   → stored under key "avg:region:TYPE"
 *   region.{N}.agg.max     – hourly maximums  → stored under key "max:region:TYPE"
 *
 * HTTP endpoints (all read-only):
 *   GET /api/data/current
 *       ?region={N}            – filter by region (optional)
 *       &type={SENSOR_TYPE}    – filter by SensorType (optional)
 *       Returns the latest raw reading for every matching sensor.
 *
 *   GET /api/data/aggregated
 *       ?region={N}            – required
 *       &type={SENSOR_TYPE}    – required
 *       &metric=avg|max        – optional, defaults to "avg"
 *       Returns the latest rolling-average or hourly-maximum for the region+type pair.
 * </pre>
 */
public class DataServiceAPI extends VerticleBase {
 
  // Must stay in sync with IngressFilterVerticle / IngressVerticle.
  // TODO: Replace with shared RegionManagement repo.
  private static final int[] REGIONS = {1, 2, 3, 4};
 
  private final Router router;
 
  /**
   * Key: "{region}:{sensorId}:{TYPE}"  → latest raw SensorData from that sensor
   */
  private final Map<String, SensorData> latestRaw = new HashMap<>();
 
  /**
   * Key: "{region}:{TYPE}"  → latest 5-minute rolling-average SensorData
   */
  private final Map<String, SensorData> latestAvg = new HashMap<>();
 
  /**
   * Key: "{region}:{TYPE}"  → latest hourly-maximum SensorData
   */
  private final Map<String, SensorData> latestMax = new HashMap<>();
 
  public DataServiceAPI(Router router) {
    this.router = router;
  }
 
  @Override
  public Future<?> start() {
    // ── Event bus subscriptions ──────────────────────────────────────────────
    for (int region : REGIONS) {
      int r = region;
 
      // Raw readings — key includes sensorId so we keep one entry per sensor
      vertx.eventBus().<SensorData>consumer("region." + region + ".ingress", msg -> {
        SensorData d = msg.body();
        latestRaw.put(r + ":" + d.sensorId() + ":" + d.type().name(), d);
      });
 
      // 5-minute rolling averages — one entry per region+type
      vertx.eventBus().<SensorData>consumer("region." + region + ".agg.avg", msg -> {
        SensorData d = msg.body();
        latestAvg.put(r + ":" + d.type().name(), d);
      });
 
      // Hourly maximums — one entry per region+type
      vertx.eventBus().<SensorData>consumer("region." + region + ".agg.max", msg -> {
        SensorData d = msg.body();
        latestMax.put(r + ":" + d.type().name(), d);
      });
    }
 
    // ── HTTP routes ──────────────────────────────────────────────────────────
 
    /*
     * GET /api/data/current
     *
     * Query params (all optional):
     *   region – integer region ID
     *   type   – SensorType name (case-insensitive)
     *
     * Returns a JSON array of the latest raw SensorData objects matching
     * the supplied filters.  If no filters are given, returns everything.
     */
    router.get("/api/data/current").handler(ctx -> {
      String regionParam = ctx.queryParams().get("region");
      String typeParam   = ctx.queryParams().get("type");
 
      Integer regionFilter = null;
      SensorType typeFilter = null;
 
      if (regionParam != null) {
        try {
          regionFilter = Integer.parseInt(regionParam);
        } catch (NumberFormatException e) {
          ctx.response().setStatusCode(400).end("Invalid region — must be an integer");
          return;
        }
      }
 
      if (typeParam != null) {
        try {
          typeFilter = SensorType.valueOf(typeParam.toUpperCase());
        } catch (IllegalArgumentException e) {
          ctx.response().setStatusCode(400)
            .end("Invalid type. Valid values: AIR_QUALITY, TEMPERATURE, HUMIDITY, "
              + "NOISE, UV_INDEX, RAINFALL, WIND");
          return;
        }
      }
 
      JsonArray results = new JsonArray();
      for (Map.Entry<String, SensorData> entry : latestRaw.entrySet()) {
        // Key format: "{region}:{sensorId}:{TYPE}"
        String[] parts = entry.getKey().split(":");
        int entryRegion = Integer.parseInt(parts[0]);
        SensorData d = entry.getValue();
 
        if (regionFilter != null && entryRegion != regionFilter) continue;
        if (typeFilter   != null && d.type() != typeFilter)       continue;
 
        results.add(sensorDataToJson(d, entryRegion));
      }
 
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(results.encode());
    });
 
    /*
     * GET /api/data/aggregated
     *
     * Query params:
     *   region – required integer region ID
     *   type   – required SensorType name (case-insensitive)
     *   metric – optional "avg" (default) or "max"
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
 
      int region;
      try {
        region = Integer.parseInt(regionParam);
      } catch (NumberFormatException e) {
        ctx.response().setStatusCode(400).end("Invalid region — must be an integer");
        return;
      }
 
      SensorType type;
      try {
        type = SensorType.valueOf(typeParam.toUpperCase());
      } catch (IllegalArgumentException e) {
        ctx.response().setStatusCode(400)
          .end("Invalid type. Valid values: AIR_QUALITY, TEMPERATURE, HUMIDITY, "
            + "NOISE, UV_INDEX, RAINFALL, WIND");
        return;
      }
 
      boolean useMax = "max".equalsIgnoreCase(metricParam);
      String metric  = useMax ? "max" : "avg";
      String key     = region + ":" + type.name();
      SensorData data = useMax ? latestMax.get(key) : latestAvg.get(key);
 
      if (data == null) {
        ctx.response().setStatusCode(404)
          .end("No aggregated data yet for region=" + region + " type=" + type);
        return;
      }
 
      JsonObject response = sensorDataToJson(data, region)
        .put("metric", metric);
 
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(response.encode());
    });
 
    return Future.succeededFuture();
  }
 
  // ── Helpers ──────────────────────────────────────────────────────────────────
 
  /**
   * Converts a {@link SensorData} to a {@link JsonObject}, adding an explicit
   * {@code region} field (which SensorData itself does not carry).
   */
  private JsonObject sensorDataToJson(SensorData d, int region) {
    return new JsonObject()
      .put("sensorId",  d.sensorId())
      .put("region",    region)
      .put("type",      d.type().name())
      .put("data",      d.data())
      .put("timestamp", d.timestamp());
  }
}