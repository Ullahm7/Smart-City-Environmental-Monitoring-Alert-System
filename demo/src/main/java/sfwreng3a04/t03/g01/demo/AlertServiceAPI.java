package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.alert.*;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class AlertServiceAPI extends VerticleBase {

  private final Router router;
  private final AlertManagement alertManagement;
  private final RegionManagement regionRepo;

  private final List<HttpServerResponse> subscribers = new CopyOnWriteArrayList<>();

  public AlertServiceAPI(Router router, AlertManagement alertManagement, RegionManagement regionRepo) {
    this.router = router;
    this.alertManagement = alertManagement;
    this.regionRepo = regionRepo;
  }

  @Override
  public Future<?> start() {
    // Subscribe to existing regions
    for (var region : regionRepo.retrieveRegionList()) {
      String regionId = region.getRegionID();
      vertx.eventBus().<AnonymizedSensorData>consumer("region." + regionId + ".ingress",
        msg -> evaluateRules(regionId, msg.body()));
    }

    // Dynamically subscribe when new regions are added
    vertx.eventBus().<String>consumer("mgmt.region.created", msg -> {
      String regionId = msg.body();
      vertx.eventBus().<AnonymizedSensorData>consumer("region." + regionId + ".ingress",
        msg2 -> evaluateRules(regionId, msg2.body()));
    });

    // SSE endpoint
    router.get("/api/alerts/subscribe").handler(ctx -> {
      HttpServerResponse response = ctx.response();
      response
        .putHeader("Content-Type", "text/event-stream")
        .putHeader("Cache-Control", "no-cache")
        .putHeader("Connection", "keep-alive")
        .putHeader("Access-Control-Allow-Origin", "*")
        .setChunked(true);

      response.write("event: connected\ndata: {\"message\":\"Subscribed to alert stream\"}\n\n");
      subscribers.add(response);

      response.closeHandler(v -> subscribers.remove(response));
    });

    // Subscriber count health check
    router.get("/api/alerts/subscribers").handler(ctx -> {
      subscribers.removeIf(HttpServerResponse::closed);
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(new JsonObject().put("activeSubscribers", subscribers.size()).encode());
    });

    return Future.succeededFuture();
  }

  private void evaluateRules(String region, AnonymizedSensorData data) {
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
          data.regionId(),    // UUID from AnonymizedSensorData
          region,             // String region key
          data.type(),
          data.data(),
          rule.threshold(),
          rule.condition(),
          data.timestamp()
        );

        System.out.printf("ALERT [id=%d] rule='%s' region=%s %s %.2f %s threshold %.2f%n",
          alert.id(), rule.name(), region,
          data.type(), data.data(), rule.condition(), rule.threshold());

        broadcastAlert(alert);
      }
    }
  }

  private void broadcastAlert(Alert alert) {
    String ssePayload = "event: alert\ndata: " + JsonObject.mapFrom(alert).encode() + "\n\n";
    List<HttpServerResponse> stale = new ArrayList<>();
    for (HttpServerResponse subscriber : subscribers) {
      if (subscriber.closed()) stale.add(subscriber);
      else subscriber.write(ssePayload);
    }
    subscribers.removeAll(stale);
  }
}