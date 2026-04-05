package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import sfwreng3a04.t03.g01.demo.alert.*;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
 
/**
 * REST API for administrators to manage alert rules and review/action alert history.
 *
 * <pre>
 * POST /api/alerts/rules/create   – create a new alert rule
 * POST /api/alerts/rules/delete   – delete a rule by id
 * GET  /api/alerts/rules          – list all rules
 * GET  /api/alerts/history        – list all triggered alerts (full history)
 * POST /api/alerts/acknowledge    – move an alert to ACKNOWLEDGED
 * POST /api/alerts/resolve        – move an alert to RESOLVED
 * </pre>
 */
public class AlertController extends VerticleBase {
 
  private final Router router;
  private final AlertManagement alertManagement;
 
  public AlertController(Router router, AlertManagement alertManagement) {
    this.router = router;
    this.alertManagement = alertManagement;
  }
 
  @Override
  public Future<?> start() {
    router.route().handler(BodyHandler.create());
 
    // ── Rules ────────────────────────────────────────────────────────────────
 
    /*
     * POST /api/alerts/rules/create
     * Body: { "name": "High PM2.5", "region": 2, "type": "AIR_QUALITY",
     *         "threshold": 100.0, "condition": "GREATER_THAN" }
     */
    router.post("/api/alerts/rules/create").handler(ctx -> {
      JsonObject body = ctx.body().asJsonObject();
      if (body == null) {
        ctx.response().setStatusCode(400).end("Request body is required");
        return;
      }
 
      String name      = body.getString("name");
      String region    = body.getString("region");   // was body.getInteger()
      String typeStr   = body.getString("type");
      Double threshold = body.getDouble("threshold");
      String condStr   = body.getString("condition");
 
      if (name == null || region == null || typeStr == null || threshold == null || condStr == null) {
        ctx.response().setStatusCode(400).end("Missing required fields: name, region, type, threshold, condition");
        return;
      }
 
      SensorType type;
      ThresholdCondition condition;
      try {
        type      = SensorType.valueOf(typeStr.toUpperCase());
        condition = ThresholdCondition.valueOf(condStr.toUpperCase());
      } catch (IllegalArgumentException e) {
        ctx.response().setStatusCode(400)
          .end("Invalid 'type' or 'condition' value. "
            + "Valid types: AIR_QUALITY, TEMPERATURE, HUMIDITY, NOISE, UV_INDEX, RAINFALL, WIND. "
            + "Valid conditions: GREATER_THAN, LESS_THAN");
        return;
      }
 
      AlertRule rule = alertManagement.addRule(name, region, type, threshold, condition);
      ctx.response()
        .setStatusCode(201)
        .putHeader("content-type", "application/json")
        .end(JsonObject.mapFrom(rule).encode());
    });
 
    /*
     * POST /api/alerts/rules/delete
     * Body: { "id": 3 }
     */
    router.post("/api/alerts/rules/delete").handler(ctx -> {
      JsonObject body = ctx.body().asJsonObject();
      Integer id = body == null ? null : body.getInteger("id");
 
      if (id == null) {
        ctx.response().setStatusCode(400).end("Missing required field: id");
        return;
      }
 
      if (!alertManagement.deleteRule(id)) {
        ctx.response().setStatusCode(404).end("Alert rule not found");
        return;
      }
 
      ctx.response().setStatusCode(204).end();
    });
 
    /*
     * GET /api/alerts/rules
     * Returns the full list of configured alert rules.
     */
    router.get("/api/alerts/rules").handler(ctx -> {
      JsonArray arr = new JsonArray();
      for (AlertRule rule : alertManagement.getAllRules()) {
        arr.add(JsonObject.mapFrom(rule));
      }
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(arr.encode());
    });
 
    // ── Alert history / lifecycle ─────────────────────────────────────────────
 
    /*
     * GET /api/alerts/history
     * Returns all triggered alerts with their current status.
     * Supports optional ?status=ACTIVE|ACKNOWLEDGED|RESOLVED filter.
     */
    router.get("/api/alerts/history").handler(ctx -> {
      String statusFilter = ctx.queryParams().get("status");
      JsonArray arr = new JsonArray();
 
      for (Alert alert : alertManagement.getAllAlerts()) {
        if (statusFilter != null) {
          try {
            AlertStatus filterStatus = AlertStatus.valueOf(statusFilter.toUpperCase());
            if (alert.status() != filterStatus) continue;
          } catch (IllegalArgumentException e) {
            ctx.response().setStatusCode(400)
              .end("Invalid status filter. Valid values: ACTIVE, ACKNOWLEDGED, RESOLVED");
            return;
          }
        }
        arr.add(JsonObject.mapFrom(alert));
      }
 
      ctx.response()
        .putHeader("content-type", "application/json")
        .end(arr.encode());
    });
 
    /*
     * POST /api/alerts/acknowledge
     * Body: { "id": 7 }
     */
    router.post("/api/alerts/acknowledge").handler(ctx -> {
      updateAlertStatus(ctx, AlertStatus.ACKNOWLEDGED);
    });
 
    /*
     * POST /api/alerts/resolve
     * Body: { "id": 7 }
     */
    router.post("/api/alerts/resolve").handler(ctx -> {
      updateAlertStatus(ctx, AlertStatus.RESOLVED);
    });
 
    return Future.succeededFuture();
  }
 
  // ── Helpers ─────────────────────────────────────────────────────────────────
 
  private void updateAlertStatus(io.vertx.ext.web.RoutingContext ctx, AlertStatus newStatus) {
    JsonObject body = ctx.body().asJsonObject();
    Integer id = body == null ? null : body.getInteger("id");
 
    if (id == null) {
      ctx.response().setStatusCode(400).end("Missing required field: id");
      return;
    }
 
    Alert updated = alertManagement.updateStatus(id, newStatus);
    if (updated == null) {
      ctx.response().setStatusCode(404).end("Alert not found");
      return;
    }
 
    ctx.response()
      .putHeader("content-type", "application/json")
      .end(JsonObject.mapFrom(updated).encode());
  }
}