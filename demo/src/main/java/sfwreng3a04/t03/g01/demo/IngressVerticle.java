package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.mqtt.MqttClient;
import io.vertx.mqtt.MqttClientOptions;
import io.vertx.mqtt.messages.MqttPublishMessage;
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorRepository;

public class IngressVerticle extends VerticleBase {

  private final SensorRepository repo;

  public IngressVerticle(SensorRepository repo) {
    this.repo = repo;
  }

  @Override
  public Future<?> start() {
    String host = config().getString("host");
    int port = config().getInteger("port");

    MqttClientOptions options = new MqttClientOptions()
      .setSsl(true)
      .setTrustAll(true);

    MqttClient client = MqttClient.create(vertx, options);

    return client.connect(port, host)
      .compose(conn -> client.publishHandler(this::handleDeviceMessage).subscribe("/device/#", 0))
      .onSuccess(subAck -> System.out.println("Connected to MQTTS broker at " + host + ":" + port))
      .onFailure(err -> System.err.println("Failed to connect to MQTTS broker: " + err.getMessage()));
  }

  private void handleDeviceMessage(MqttPublishMessage message) {
    var topicName = message.topicName();
    //TODO: Lookup sensor in repo, `

    // Stub handler for /device/# messages
  }
}
