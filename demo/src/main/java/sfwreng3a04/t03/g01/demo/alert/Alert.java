package sfwreng3a04.t03.g01.demo.alert;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
import java.util.UUID;

public record Alert(
  int id,
  int ruleId,
  String ruleName,
  UUID regionId,        // from AnonymizedSensorData.regionId()
  String region,        // the string region key used for routing
  SensorType type,
  double triggeringValue,
  double threshold,
  ThresholdCondition condition,
  String timestamp,
  AlertStatus status
) {
  public Alert withStatus(AlertStatus newStatus) {
    return new Alert(id, ruleId, ruleName, regionId, region, type,
      triggeringValue, threshold, condition, timestamp, newStatus);
  }
}