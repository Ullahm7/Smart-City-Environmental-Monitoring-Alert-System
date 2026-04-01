package sfwreng3a04.t03.g01.demo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.mqtt.MqttClient;
import io.vertx.mqtt.MqttClientOptions;
import io.vertx.mqtt.messages.MqttPublishMessage;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.filters.RawDataFilter;
import sfwreng3a04.t03.g01.demo.ingress.filters.RollingAverageFilter;
import sfwreng3a04.t03.g01.demo.ingress.filters.TimeframeMaxFilter;
import sfwreng3a04.t03.g01.demo.repo.Sensor;
import sfwreng3a04.t03.g01.demo.repo.SensorRepository;

public class IngressVerticle extends VerticleBase {

  private final SensorRepository repo;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public IngressVerticle(SensorRepository repo) {
    this.repo = repo;
  }

  @Override
  public Future<?> start() {
    String host = config().getString("host");
    int port = config().getInteger("port");

    // First, deploy filters for data handling
    return vertx.deployVerticle(new RawDataFilter())
      .compose(id -> vertx.deployVerticle(new RollingAverageFilter()))
      .compose(id -> vertx.deployVerticle(new TimeframeMaxFilter()))
      .compose(id -> {
        // Then configure MQTT
        MqttClientOptions options = new MqttClientOptions()
          .setSsl(true)
          .setTrustAll(true);

        MqttClient client = MqttClient.create(vertx, options);

        return client.connect(port, host)
          .compose(conn -> client.publishHandler(this::handleDeviceMessage).subscribe("sensor/#", 0))
          .onSuccess(subAck -> System.out.println("Connected to MQTTS broker at " + host + ":" + port))
          .onFailure(err -> System.err.println("Failed to connect to MQTTS broker: " + err.getMessage()));
      });
  }

  private void handleDeviceMessage(MqttPublishMessage message) {
    var topicName = message.topicName();

    // Ensure topic matches sensor/[0-9]+ pattern
    if (!topicName.matches("sensor/[0-9]+")) {
      return;
    }

    // Parse sensor ID from second component of topic
    String[] parts = topicName.split("/");
    if (parts.length < 2) {
      return;
    }

    int sensorId;
    try {
      sensorId = Integer.parseInt(parts[1]);
    } catch (NumberFormatException e) {
      System.err.println("Invalid sensor ID in topic: " + parts[1]);
      return;
    }

    // Look up sensor to get region
    Sensor sensor = repo.getSensor(sensorId);
    if (sensor == null) {
      System.err.println("Unknown sensor ID: " + sensorId);
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
    vertx.eventBus().publish(address, sensorData);
  }
}
