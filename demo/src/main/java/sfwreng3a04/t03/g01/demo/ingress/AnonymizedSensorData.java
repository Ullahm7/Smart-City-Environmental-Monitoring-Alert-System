package sfwreng3a04.t03.g01.demo.ingress;

import java.util.UUID;

public record AnonymizedSensorData(UUID regionId, double data, SensorType type, String timestamp) {
}
