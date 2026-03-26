package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorRepository;

public class SensorController extends VerticleBase {

  private final SensorRepository sensorRepository;
  private final Router router;

  public SensorController(Router router, SensorRepository sensorRepository) {
    this.sensorRepository = sensorRepository;
    this.router = router;
  }

  @Override
  public Future<?> start() {
    router.route().handler(BodyHandler.create());

    router.get("/api/sensors/get").handler(ctx -> {
      String idParam = ctx.queryParams().get("id");
      if (idParam == null) {
        ctx.response().setStatusCode(400).end("Missing id parameter");
        return;
      }

      int id = Integer.parseInt(idParam);
      Sensor sensor = this.sensorRepository.getSensor(id);

      if (sensor == null) {
        ctx.response().setStatusCode(404).end("Sensor not found");
        return;
      }

      ctx.response()
        .putHeader("content-type", "application/json")
        .end(JsonObject.mapFrom(sensor).encode());
    });

    router.post("/api/sensors/create").handler(ctx -> {
      Sensor sensor = ctx.body().asJsonObject().mapTo(Sensor.class);
      this.sensorRepository.addSensor(sensor);

      ctx.response().setStatusCode(201).end();
    });

    router.post("/api/sensors/delete").handler(ctx -> {
      JsonObject body = ctx.body().asJsonObject();
      Integer id = body.getInteger("id");

      if (id == null) {
        ctx.response().setStatusCode(400).end("Missing id");
        return;
      }

      this.sensorRepository.deleteSensor(id);
      ctx.response().setStatusCode(204).end();
    });

    return Future.succeededFuture();
  }
}
