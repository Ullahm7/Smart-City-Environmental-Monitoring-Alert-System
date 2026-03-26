package sfwreng3a04.t03.g01.demo;

import io.vertx.core.DeploymentOptions;
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.repo.SensorRepository;

public class MainVerticle extends VerticleBase {

  @Override
  public Future<?> start() {
    var router = Router.router(vertx);
    var sensorRepo = new SensorRepository();
      //.deployVerticle(new IngressVerticle(sensorRepo), new DeploymentOptions())
      //.compose(id -> vertx.deployVerticle(new SensorController(router, sensorRepo)))
    return vertx.deployVerticle(new SensorController(router, sensorRepo))
      .compose(id -> vertx.createHttpServer().requestHandler(router).listen(8888).onSuccess(http -> {
        System.out.println("HTTP server started on port 8888");
      }));
  }
}
