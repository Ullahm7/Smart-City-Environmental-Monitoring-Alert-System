package sfwreng3a04.t03.g01.demo.alert;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;

/**
 * An alert rule defined by an administrator.
 * When sensor data in {@code region} of {@code type} crosses {@code threshold}
 * in the direction indicated by {@code condition}, an alert is triggered.
 */
public record AlertRule(
  int id,
  String name,
  int region,
  SensorType type,
  double threshold,
  ThresholdCondition condition
) {}
