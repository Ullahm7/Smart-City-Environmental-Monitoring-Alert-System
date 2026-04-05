package sfwreng3a04.t03.g01.demo;

import sfwreng3a04.t03.g01.demo.alert.*;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;

import java.util.*;
import java.util.stream.Collectors;

public class AlertManagement {

  private final Map<Integer, AlertRule> rules = new HashMap<>();
  private final Map<Integer, Alert> alertHistory = new HashMap<>();

  private int nextRuleId = 1;
  private int nextAlertId = 1;

  public AlertRule addRule(String name, String region, SensorType type,
                           double threshold, ThresholdCondition condition) {
    AlertRule rule = new AlertRule(nextRuleId++, name, region, type, threshold, condition);
    rules.put(rule.id(), rule);
    return rule;
  }

  public boolean deleteRule(int id) {
    return rules.remove(id) != null;
  }

  public AlertRule getRule(int id) {
    return rules.get(id);
  }

  public List<AlertRule> getAllRules() {
    return new ArrayList<>(rules.values());
  }

  // region is now String
  public List<AlertRule> getRulesFor(String region, SensorType type) {
    return rules.values().stream()
      .filter(r -> r.region().equals(region) && r.type() == type)
      .collect(Collectors.toList());
  }

  // no sensorId — anonymized data doesn't carry it
  public Alert recordAlert(int ruleId, String ruleName, UUID regionId, String region,
                           SensorType type, double triggeringValue,
                           double threshold, ThresholdCondition condition,
                           String timestamp) {
    Alert alert = new Alert(nextAlertId++, ruleId, ruleName, regionId, region,
      type, triggeringValue, threshold, condition, timestamp, AlertStatus.ACTIVE);
    alertHistory.put(alert.id(), alert);
    return alert;
  }

  public Alert updateStatus(int alertId, AlertStatus newStatus) {
    Alert existing = alertHistory.get(alertId);
    if (existing == null) return null;
    Alert updated = existing.withStatus(newStatus);
    alertHistory.put(alertId, updated);
    return updated;
  }

  public Alert getAlert(int id) {
    return alertHistory.get(id);
  }

  public List<Alert> getAllAlerts() {
    return new ArrayList<>(alertHistory.values());
  }
}