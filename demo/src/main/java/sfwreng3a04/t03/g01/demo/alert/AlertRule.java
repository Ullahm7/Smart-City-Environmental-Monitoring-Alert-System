package sfwreng3a04.t03.g01.demo.alert;

import sfwreng3a04.t03.g01.demo.ingress.SensorType;

public record AlertRule(
  int id,
  String name,
  String region,        // was int, now String (UUID string)
  SensorType type,
  double threshold,
  ThresholdCondition condition
) {}