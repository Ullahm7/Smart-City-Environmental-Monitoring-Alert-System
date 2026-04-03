package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
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
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorManagement;

import java.io.FileReader;
import java.io.StringWriter;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.X509Certificate;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

public class SensorController extends VerticleBase {

  private final SensorManagement sensorRepository;
  private final Router router;

  private X509Certificate caCert;
  private PrivateKey caPrivateKey;

  public SensorController(Router router, SensorManagement sensorRepository) {
    this.sensorRepository = sensorRepository;
    this.router = router;
  }

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
      //TODO: Take in more limited request body that just has a human readable sensor name and region id
      Sensor sensor = ctx.body().asJsonObject().mapTo(Sensor.class);
      if (sensorRepository.sensorExists(sensor.id())) {
        ctx.response().setStatusCode(409).end("Sensor already exists");
        return;
      }
      this.sensorRepository.addSensor(sensor);

      try {
        // Generate key pair for sensor, P-256 because of crypto limitations internal to vert.x
        KeyPair sensorKeyPair;
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("EC", "BC");
        keyGen.initialize(new ECGenParameterSpec("secp256r1"));
        sensorKeyPair = keyGen.generateKeyPair();

        // Build certificate with CN = sensor ID
        // Use encoded form to preserve exact DN ordering from CA cert in Issuer. Leads to issues in TLS handshake otherwise
        X500Name issuer = X500Name.getInstance(caCert.getSubjectX500Principal().getEncoded());
        X500Name subject = new X500Name("CN=" + sensor.id());
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
          .put("certificate", certWriter.toString())
          .put("privateKey", keyWriter.toString());

        ctx.response()
          .setStatusCode(201)
          .putHeader("content-type", "application/json")
          .end(response.encode());
      } catch (Exception e) {
        ctx.response().setStatusCode(500).end("Failed to generate certificate: " + e.getMessage());
      }
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
