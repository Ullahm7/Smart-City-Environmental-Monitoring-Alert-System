package sfwreng3a04.t03.g01.demo;

import java.security.Security;

import org.bouncycastle.jce.provider.BouncyCastleProvider;

import io.vertx.core.DeploymentOptions;
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.CorsHandler;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorDataCodec;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorDataCodec;
import sfwreng3a04.t03.g01.demo.repo.AuditLogManagement;
import sfwreng3a04.t03.g01.demo.repo.DashboardManagement;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;
import sfwreng3a04.t03.g01.demo.repo.SensorManagement;

public class MainVerticle extends VerticleBase {

  static {
    Security.addProvider(new BouncyCastleProvider());
  }

  @Override
  public Future<?> start() {
    // Register codec for SensorData event bus messages
    vertx.eventBus().registerDefaultCodec(SensorData.class, new SensorDataCodec());
    vertx.eventBus().registerDefaultCodec(AnonymizedSensorData.class, new AnonymizedSensorDataCodec()); // add this back

    var router = Router.router(vertx);

    router.route().handler(CorsHandler.create()
        .addOrigin("*")
        .allowedMethod(HttpMethod.GET)
        .allowedMethod(HttpMethod.PUT)
        .allowedMethod(HttpMethod.POST)
        .allowedMethod(HttpMethod.OPTIONS)
        .allowedHeader("Content-Type")
        .allowedHeader("Authorization"));

    var regionRepo = new RegionManagement(vertx.eventBus());
    var sensorRepo = new SensorManagement(vertx.eventBus());
    var auditLogRepo = new AuditLogManagement();
    var alertMgmt = new AlertManagement();
    var authMgmt = new AuthenticationManagement();
    var sensorDataMgmt = new SensorDataManagement();
    var dashboardMgmt = new DashboardManagement(vertx.eventBus());

    router.route("/region*").subRouter(RegionController.createRouter(vertx, regionRepo, auditLogRepo));
    router.route("/audit*").subRouter(AuditLogController.createRouter(vertx, auditLogRepo));
    router.route("/api/auth*").subRouter(AuthenticationController.createRouter(vertx, authMgmt));
    //router.route("/api/data*").subRouter(SensorDataController.createRouter(vertx, sensorDataMgmt));
    router.route("/api/dashboard*").subRouter(DashboardController.createRouter(vertx, dashboardMgmt));

    return vertx.deployVerticle(new SensorController(router, sensorRepo, auditLogRepo), new DeploymentOptions()
        .setConfig(new JsonObject()
          .put("caCertPath", "certs/ca.crt")
          .put("caKeyPath", "certs/ca.key")))
      .compose(id -> vertx.deployVerticle(new AlertController(router, alertMgmt)))
      .compose(id -> vertx.deployVerticle(new AlertServiceAPI(router, alertMgmt, regionRepo)))
      .compose(id -> vertx.deployVerticle(new DataServiceAPI(router, regionRepo)))
      .compose(id -> vertx.deployVerticle(new SensorDataController(sensorDataMgmt, regionRepo, vertx.eventBus())))
      .compose(id -> vertx.deployVerticle(new IngressVerticle(sensorRepo, regionRepo), new DeploymentOptions()
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
