package sfwreng3a04.t03.g01.demo.alert;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
/**
 * A triggered alert event. Immutable; use {@link #withStatus(AlertStatus)} to
 * produce an updated copy when the status changes.
 */
public record Alert(
  int id,
  int ruleId,
  String ruleName,
  int sensorId,
  int region,
  SensorType type,
  double triggeringValue,
  double threshold,
  ThresholdCondition condition,
  String timestamp,
  AlertStatus status
) {
  /** Returns a copy of this alert with a new status (for acknowledge / resolve). */
  public Alert withStatus(AlertStatus newStatus) {
    return new Alert(id, ruleId, ruleName, sensorId, region, type,
      triggeringValue, threshold, condition, timestamp, newStatus);
  }
}
