package sfwreng3a04.t03.g01.demo.ingress;

import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.MessageCodec;
import io.vertx.core.json.JsonObject;

import java.util.UUID;

public class SensorDataCodec implements MessageCodec<SensorData, SensorData> {

  @Override
  public void encodeToWire(Buffer buffer, SensorData sensorData) {
    JsonObject json = new JsonObject()
      .put("sensorId", sensorData.sensorId())
      .put("data", sensorData.data())
      .put("type", sensorData.type().name())
      .put("timestamp", sensorData.timestamp());
    String encoded = json.encode();
    buffer.appendInt(encoded.length());
    buffer.appendString(encoded);
  }

  @Override
  public SensorData decodeFromWire(int pos, Buffer buffer) {
    int length = buffer.getInt(pos);
    pos += 4;
    String encoded = buffer.getString(pos, pos + length);
    JsonObject json = new JsonObject(encoded);
    return new SensorData(
      UUID.fromString(json.getString("sensorId")),
      json.getDouble("data"),
      SensorType.valueOf(json.getString("type")),
      json.getString("timestamp")
    );
  }

  @Override
  public SensorData transform(SensorData sensorData) {
    // For local delivery, no transformation needed
    return sensorData;
  }

  @Override
  public String name() {
    return "SensorDataCodec";
  }

  @Override
  public byte systemCodecID() {
    return -1; // User codec
  }
}
