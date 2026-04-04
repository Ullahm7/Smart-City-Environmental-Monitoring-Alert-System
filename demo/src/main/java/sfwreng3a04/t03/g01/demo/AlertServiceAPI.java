package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.alert.*;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
 
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
 
/**
 * Evaluates incoming sensor data against active alert rules and pushes
 * triggered alerts to subscribed external systems via Server-Sent Events (SSE).
 *
 * <pre>
 * Event bus (consumed):
 *   region.{N}.ingress  – raw SensorData from every sensor in region N
 *
 * HTTP endpoints:
 *   GET /api/alerts/subscribe  – SSE stream; clients receive "alert" events in real-time
 * </pre>
 *
 * SSE event format:
 * <pre>
 *   event: alert
 *   data: { ...Alert JSON... }
 * </pre>
 *
 * A heartbeat "ping" event is sent to each new subscriber on connect so the
 * client can confirm the connection is live.
 */
public class AlertServiceAPI extends VerticleBase {
 
  // Regions must match those configured in IngressFilterVerticle / IngressVerticle.
  // TODO: Replace with a shared RegionManagement / repo in a future iteration.
  private static final int[] REGIONS = {1, 2, 3, 4};
 
  private final Router router;
  private final AlertManagement alertManagement;
 
  /**
   * Thread-safe list of currently connected SSE response streams.
   * CopyOnWriteArrayList means iteration (during broadcast) never blocks writers.
   */
  private final List<HttpServerResponse> subscribers = new CopyOnWriteArrayList<>();
 
  public AlertServiceAPI(Router router, AlertManagement alertManagement) {
    this.router = router;
    this.alertManagement = alertManagement;
  }
 
  @Override
  public Future<?> start() {
    // Subscribe to raw sensor data on every region's ingress address.
    for (int region : REGIONS) {
      int r = region; // effectively-final capture for lambda
      vertx.eventBus().<SensorData>consumer("region." + region + ".ingress", msg ->
        evaluateRules(r, msg.body())
      );
    }
 
    // SSE endpoint — external systems connect here to receive push notifications.
    router.get("/api/alerts/subscribe").handler(ctx -> {
      HttpServerResponse response = ctx.response();
 
      // Standard SSE headers
      response
        .putHeader("Content-Type", "text/event-stream")
        .putHeader("Cache-Control", "no-cache")
        .putHeader("Connection", "keep-alive")
        .putHeader("Access-Control-Allow-Origin", "*")
        .setChunked(true);
 
      // Confirm the connection is live
      response.write("event: connected\ndata: {\"message\":\"Subscribed to alert stream\"}\n\n");
 
      subscribers.add(response);
      System.out.println("AlertServiceAPI: new subscriber connected, total=" + subscribers.size());
 
      // Clean up when the client disconnects
      response.closeHandler(v -> {
        subscribers.remove(response);
        System.out.println("AlertServiceAPI: subscriber disconnected, total=" + subscribers.size());
      });
    });
 
    return Future.succeededFuture();
  }
 
  // ── Core evaluation logic ───────────────────────────────────────────────────
 
  /**
   * Checks every active rule that matches {@code region} + {@code data.type()}.
   * For each violated rule a new {@link Alert} is created (persisted in
   * {@link AlertManagement}) and broadcast to all SSE subscribers.
   */
  private void evaluateRules(int region, SensorData data) {
    List<AlertRule> matchingRules = alertManagement.getRulesFor(region, data.type());
 
    for (AlertRule rule : matchingRules) {
      boolean violated = switch (rule.condition()) {
        case GREATER_THAN -> data.data() > rule.threshold();
        case LESS_THAN    -> data.data() < rule.threshold();
      };
 
      if (violated) {
        Alert alert = alertManagement.recordAlert(
          rule.id(),
          rule.name(),
          data.sensorId(),
          region,
          data.type(),
          data.data(),
          rule.threshold(),
          rule.condition(),
          data.timestamp()
        );
 
        System.out.printf("ALERT [id=%d] rule='%s' sensor=%d region=%d %s %.2f %s threshold %.2f%n",
          alert.id(), rule.name(), data.sensorId(), region,
          data.type(), data.data(), rule.condition(), rule.threshold());
 
        broadcastAlert(alert);
      }
    }
  }
 
  // ── SSE broadcast ───────────────────────────────────────────────────────────
 
  /**
   * Sends a Server-Sent Event to every connected subscriber.
   * Stale (closed) connections are removed lazily during the broadcast pass.
   */
  private void broadcastAlert(Alert alert) {
    String ssePayload = "event: alert\ndata: " + JsonObject.mapFrom(alert).encode() + "\n\n";
 
    List<HttpServerResponse> stale = new ArrayList<>();
    for (HttpServerResponse subscriber : subscribers) {
      if (subscriber.closed()) {
        stale.add(subscriber);
      } else {
        subscriber.write(ssePayload);
      }
    }
    subscribers.removeAll(stale);
  }
}