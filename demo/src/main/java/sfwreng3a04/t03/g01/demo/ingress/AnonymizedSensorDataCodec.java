package sfwreng3a04.t03.g01.demo.ingress;
 
import io.vertx.core.buffer.Buffer;
import io.vertx.core.eventbus.MessageCodec;
import io.vertx.core.json.JsonObject;
 
import java.util.UUID;
 
public class AnonymizedSensorDataCodec implements MessageCodec<AnonymizedSensorData, AnonymizedSensorData> {
 
  @Override
  public void encodeToWire(Buffer buffer, AnonymizedSensorData data) {
    JsonObject json = new JsonObject()
      .put("regionId",  data.regionId().toString())
      .put("data",      data.data())
      .put("type",      data.type().name())
      .put("timestamp", data.timestamp());
    String encoded = json.encode();
    buffer.appendInt(encoded.length());
    buffer.appendString(encoded);
  }
 
  @Override
  public AnonymizedSensorData decodeFromWire(int pos, Buffer buffer) {
    int length = buffer.getInt(pos);
    pos += 4;
    String encoded = buffer.getString(pos, pos + length);
    JsonObject json = new JsonObject(encoded);
    return new AnonymizedSensorData(
      UUID.fromString(json.getString("regionId")),
      json.getDouble("data"),
      SensorType.valueOf(json.getString("type")),
      json.getString("timestamp")
    );
  }
 
  @Override
  public AnonymizedSensorData transform(AnonymizedSensorData data) {
    // For local delivery, no transformation needed
    return data;
  }
 
  @Override
  public String name() {
    return "AnonymizedSensorDataCodec";
  }
 
  @Override
  public byte systemCodecID() {
    return -1; // User codec
  }
}