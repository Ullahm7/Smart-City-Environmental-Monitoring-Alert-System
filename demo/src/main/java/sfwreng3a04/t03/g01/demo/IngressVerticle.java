package sfwreng3a04.t03.g01.demo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.handler.codec.mqtt.MqttConnectReturnCode;
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.http.ClientAuth;
import io.vertx.core.net.PemKeyCertOptions;
import io.vertx.core.net.PemTrustOptions;
import io.vertx.mqtt.MqttEndpoint;
import io.vertx.mqtt.MqttServer;
import io.vertx.mqtt.MqttServerOptions;
import io.vertx.mqtt.messages.MqttPublishMessage;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.filters.RawDataFilter;
import sfwreng3a04.t03.g01.demo.ingress.filters.RollingAverageFilter;
import sfwreng3a04.t03.g01.demo.ingress.filters.TimeframeMaxFilter;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorManagement;

import javax.naming.InvalidNameException;
import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;
import javax.net.ssl.SSLPeerUnverifiedException;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.UUID;

public class IngressVerticle extends VerticleBase {

  private final SensorManagement repo;
  private final RegionManagement regionRepo;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public IngressVerticle(SensorManagement repo, RegionManagement regionRepo) {
    this.repo = repo;
    this.regionRepo = regionRepo;
  }

  @Override
  public Future<?> start() {
    String host = config().getString("host");
    int port = config().getInteger("port");
    String caCertPath = config().getString("caCertPath");
    String certPath = config().getString("certPath");
    String keyPath = config().getString("keyPath");

    MqttServerOptions opts = new MqttServerOptions()
      .setSsl(true)
      .setKeyCertOptions(new PemKeyCertOptions()
        .addCertPath(certPath)
        .addKeyPath(keyPath))
      .setClientAuth(ClientAuth.REQUIRED)
      .setTrustOptions(new PemTrustOptions()
        .addCertPath(caCertPath));

    // First, deploy filters for data handling
    return vertx.deployVerticle(new RawDataFilter(regionRepo))
      .compose(id -> vertx.deployVerticle(new RollingAverageFilter(regionRepo)))
      .compose(id -> vertx.deployVerticle(new TimeframeMaxFilter(regionRepo)))
      .compose(id -> MqttServer.create(vertx, opts)
        .endpointHandler(endpoint -> {
          System.out.println("endpointHandler called");
          endpoint.publishAutoAck(true);
          endpoint.publishHandler(msg -> handleDeviceMessage(endpoint, msg));
          Certificate[] certs;
          try {
            certs = endpoint.sslSession().getPeerCertificates();
          } catch (SSLPeerUnverifiedException e) {
            // Should be unreachable
            throw new RuntimeException(e);
          }

          var leaf = certs[0];

          if (leaf instanceof X509Certificate x509Cert) {
            try {
              String dn = x509Cert.getSubjectX500Principal().getName();
              LdapName ldapDN = new LdapName(dn);
              for (Rdn rdn : ldapDN.getRdns()) {
                if (rdn.getType().equalsIgnoreCase("CN")) {
                  String cn = rdn.getValue().toString();
                  try {
                    UUID sensorId = UUID.fromString(cn);
                    if (repo.sensorExists(sensorId)) {
                      endpoint.accept(false);
                      return;
                    }
                  } catch(IllegalArgumentException _) {}
                }
              }
            } catch (InvalidNameException | NumberFormatException e) {
              // Invalid DN or non-numeric CN, continue checking other certs
            }
          }

          endpoint.reject(MqttConnectReturnCode.CONNECTION_REFUSED_NOT_AUTHORIZED);
        })
        .listen(port, host))
      .onSuccess(server -> System.out.println("MQTT server started on " + host + ":" + port));
  }

  private void handleDeviceMessage(MqttEndpoint ep, MqttPublishMessage message) {
    var topicName = message.topicName();
    System.out.println("handleDeviceMessage: " + topicName);


    // Ensure topic matches sensor/[0-9]+ pattern
    if (!topicName.matches("sensor/[a-zA-Z0-9-]+")) {

      return;
    }

    // Parse sensor ID from second component of topic
    String[] parts = topicName.split("/");
    if (parts.length < 2) {
      return;
    }

    UUID sensorId;
    try {
      sensorId = UUID.fromString(parts[1]);
    } catch (IllegalArgumentException e) {
      System.err.println("Invalid sensor ID in topic: " + parts[1]);
      return;
    }

    // Look up sensor to get region
    Sensor sensor = repo.getSensor(sensorId);
    if (sensor == null) {
      System.err.println("Unknown sensor ID: " + sensorId);
      ep.close();
      return;
    }

    // Decode message body as SensorData
    SensorData sensorData;
    try {
      sensorData = objectMapper.readValue(message.payload().toString(), SensorData.class);
    } catch (JsonProcessingException e) {
      System.err.println("Failed to parse sensor data JSON: " + e.getMessage());
      return;
    }

    // Publish to region ingress address
    String address = "region." + sensor.region() + ".ingress";
    vertx.eventBus().publish(address, new AnonymizedSensorData(sensor.region(), sensorData.data(), sensorData.type(), sensorData.timestamp()));
  }
}
