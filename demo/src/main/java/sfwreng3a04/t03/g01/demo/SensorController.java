package sfwreng3a04.t03.g01.demo;

import java.io.FileReader;
import java.io.StringWriter;
import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.X509v3CertificateBuilder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.util.io.pem.PemObject;
import org.bouncycastle.util.io.pem.PemWriter;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;
import sfwreng3a04.t03.g01.demo.repo.AuditLogManagement;
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorManagement;

public class SensorController extends VerticleBase {

  private final SensorManagement sensorRepository;
  private final AuditLogManagement auditLogRepo;
  private final Router parentRouter;
  private final Router router;

  private X509Certificate caCert;
  private PrivateKey caPrivateKey;

  public SensorController(Router router, SensorManagement sensorRepository, AuditLogManagement auditLogRepo) {
    this.sensorRepository = sensorRepository;
    this.router = Router.router(vertx);
    this.parentRouter = router;
    this.auditLogRepo = auditLogRepo;
  }

  private record CreateSensorRequest(String name, UUID region) {}

  @Override
  public Future<?> start() {
    String caPath = config().getString("caCertPath");
    String caKeyPath = config().getString("caKeyPath");

    try {
      // Load CA certificate
      try (PEMParser parser = new PEMParser(new FileReader(caPath))) {
        X509CertificateHolder certHolder = (X509CertificateHolder) parser.readObject();
        caCert = new JcaX509CertificateConverter()
          .setProvider("BC")
          .getCertificate(certHolder);
      }

      // Load CA private key
      try (PEMParser parser = new PEMParser(new FileReader(caKeyPath))) {
        PrivateKeyInfo keyObject = (PrivateKeyInfo) parser.readObject();
        JcaPEMKeyConverter converter = new JcaPEMKeyConverter().setProvider("BC");
        caPrivateKey = converter.getPrivateKey(keyObject);
      }
    } catch (Exception e) {
      return Future.failedFuture(e);
    }

    router.route().handler(BodyHandler.create());

    router.get("/:id").handler(this::getById);
    router.post("/").handler(this::create);
    router.delete("/:id").handler(this::delete);
    router.get("/").handler(this::getAll);
    router.get("/regions/:regionId/data").handler(this::getRegionalAverage);

    router.post("/sensors/:id/data").handler(this::handleSensorData);

    parentRouter.route("/sensors*").subRouter(router);

    return Future.succeededFuture();
  }

  private void getById(RoutingContext ctx) {
    String idParam = ctx.pathParam("id");
    if (idParam == null) {
      ctx.response().setStatusCode(400).end("Missing id parameter");
      return;
    }

    try {
      UUID id = UUID.fromString(idParam);
      Sensor sensor = this.sensorRepository.getSensor(id);

      if (sensor == null) {
        ctx.response().setStatusCode(404).end("Sensor not found");
        return;
      }

      ctx.response()
        .putHeader("content-type", "application/json")
        .end(JsonObject.mapFrom(sensor).encode());
    }catch(IllegalArgumentException e) {
      ctx.response().setStatusCode(400).end("Invalid sensor ID");
    }
  }

  private void getAll(RoutingContext ctx) {
    var sensors = sensorRepository.retrieveSensorList();

    ctx.response()
      .putHeader("content-type", "application/json")
      .end(Json.encode(sensors));
  }

  private void create(RoutingContext ctx) {
    var sensor = ctx.body().asJsonObject().mapTo(CreateSensorRequest.class);
    var newSensor = this.sensorRepository.addSensor(UUID.randomUUID(), sensor.name(), sensor.region());

    try {
      // Generate key pair for sensor, P-256 because of crypto limitations internal to vert.x
      KeyPair sensorKeyPair;
      KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC", "BC");
      keyGen.initialize(new ECGenParameterSpec("secp256r1"));
      sensorKeyPair = keyGen.generateKeyPair();

      // Build certificate with CN = sensor ID
      // Use encoded form to preserve exact DN ordering from CA cert in Issuer. Leads to issues in TLS handshake otherwise
      X500Name issuer = X500Name.getInstance(caCert.getSubjectX500Principal().getEncoded());
      X500Name subject = new X500Name("CN=" + newSensor.id());
      BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());
      Instant now = Instant.now();
      Date notBefore = Date.from(now);
      Date notAfter = Date.from(now.plus(365, ChronoUnit.DAYS));

      X509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
        issuer,
        serial,
        notBefore,
        notAfter,
        subject,
        sensorKeyPair.getPublic()
      );

      // Sign with CA private key (P-256)
      ContentSigner signer = new JcaContentSignerBuilder("SHA256withECDSA")
        .setProvider("BC")
        .build(caPrivateKey);
      X509CertificateHolder certHolder = certBuilder.build(signer);
      X509Certificate sensorCert = new JcaX509CertificateConverter()
        .setProvider("BC")
        .getCertificate(certHolder);

      // Convert to PEM format
      StringWriter certWriter = new StringWriter();
      try (JcaPEMWriter pemWriter = new JcaPEMWriter(certWriter)) {
        pemWriter.writeObject(sensorCert);
      }

      StringWriter keyWriter = new StringWriter();
      try (PemWriter pemWriter = new PemWriter(keyWriter)) {
        // Use PemObject with explicit type for PKCS#8 format
        PemObject pkcs8Pem = new PemObject("PRIVATE KEY", sensorKeyPair.getPrivate().getEncoded());
        pemWriter.writeObject(pkcs8Pem);
      }

      JsonObject response = new JsonObject()
        .put("sensor", newSensor)
        .put("certificate", certWriter.toString())
        .put("privateKey", keyWriter.toString());

      // auditLogRepo.addLog(UUID.randomUUID().toString(), "Sensor created by " + UUID.randomUUID());

      ctx.response()
        .setStatusCode(201)
        .putHeader("content-type", "application/json")
        .end(response.encode());
    } catch (Exception e) {
      ctx.response().setStatusCode(500).end("Failed to generate certificate: " + e.getMessage());
    }
  }

  private void handleSensorData(RoutingContext ctx) {
    String idParam = ctx.pathParam("id");
    if (idParam == null) {
      ctx.response().setStatusCode(400).end("Missing sensor ID");
      return;
    }

    UUID sensorId;
    try {
      sensorId = UUID.fromString(idParam);
    } catch (IllegalArgumentException e) {
      ctx.response().setStatusCode(400).end("Invalid sensor ID");
      return;
    }

    Sensor sensor = this.sensorRepository.getSensor(sensorId);
    if (sensor == null) {
      ctx.response().setStatusCode(404).end("Sensor not found");
      return;
    }

    JsonObject payload = ctx.body() != null ? ctx.body().asJsonObject() : null;
    if (payload == null) {
      ctx.response().setStatusCode(400).end("Missing or invalid JSON body");
      return;
    }

    //auditLogRepo.addLog(UUID.randomUUID().toString(), "Sensor data received for " + sensorId);

    ctx.response()
      .setStatusCode(202)
      .putHeader("content-type", "application/json")
      .end(new JsonObject().put("status", "accepted").put("sensorId", sensorId.toString()).encode());
  }

  private void delete(RoutingContext ctx) {
    String id = ctx.pathParam("id");

    if (id == null) {
      ctx.response().setStatusCode(400).end("Missing id");
      return;
    }

    try {
      this.sensorRepository.deleteSensor(UUID.fromString(id));
      // auditLogRepo.addLog(UUID.randomUUID().toString(), "Sensor deleted by " + UUID.randomUUID());
      ctx.response().setStatusCode(204).end();
    } catch(IllegalArgumentException e) {
      ctx.response().setStatusCode(400).end("Invalid sensor ID");
    }
  }

  private void getRegionalAverage(RoutingContext ctx) {
    String regionId = ctx.pathParam("regionId");

    // Create a JSON object to tell the filter which region we want
    JsonObject requestBody = new JsonObject().put("regionId", regionId);

    // Use the Event Bus to request the average from the RollingAverageFilter
    // The filter now listens for the general "region.data.request" address
    vertx.eventBus().request("region.data.request", requestBody).onComplete(reply -> {
      if (reply.succeeded()) {
        // We expect the filter to reply with a Double (the average)
        Object body = reply.result().body();

        JsonObject response = new JsonObject()
          .put("regionId", regionId)
          .put("averageValue", body)
          .put("unit", "AQI");

        ctx.response()
          .putHeader("content-type", "application/json")
          .end(response.encodePrettily());
      } else {
        // If the filter doesn't respond (e.g., no data yet or filter not running)
        ctx.response()
          .setStatusCode(404)
          .end("No regional data available or filter timeout.");
      }
    });
}
}