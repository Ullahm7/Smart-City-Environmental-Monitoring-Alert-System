package sfwreng3a04.t03.g01.demo;

import io.vertx.core.DeploymentOptions;
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorDataCodec;
import sfwreng3a04.t03.g01.demo.repo.SensorManagement;

import java.security.Security;

public class MainVerticle extends VerticleBase {

  static {
    Security.addProvider(new BouncyCastleProvider());
  }

  @Override
  public Future<?> start() {
    // Register codec for SensorData event bus messages
    vertx.eventBus().registerDefaultCodec(SensorData.class, new SensorDataCodec());

    var router = Router.router(vertx);
    var sensorRepo = new SensorManagement();

    return vertx.deployVerticle(new SensorController(router, sensorRepo), new DeploymentOptions()
        .setConfig(new JsonObject()
          .put("caCertPath", "certs/ca.crt")
          .put("caKeyPath", "certs/ca.key")))
      .compose(id -> vertx.deployVerticle(new IngressVerticle(sensorRepo), new DeploymentOptions()
        .setConfig(new JsonObject()
          .put("host", "0.0.0.0")
          .put("port", 8883)
          .put("caCertPath", "certs/ca.crt")
          .put("certPath", "certs/mqtt.crt")
          .put("keyPath", "certs/mqtt.key"))))
      .compose(id -> vertx.createHttpServer().requestHandler(router).listen(8888).onSuccess(http -> {
        System.out.println("HTTP server started on port 8888");
      }));
  }
}
