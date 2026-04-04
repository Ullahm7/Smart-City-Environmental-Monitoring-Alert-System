package sfwreng3a04.t03.g01.demo;

import sfwreng3a04.t03.g01.demo.alert.*;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
 
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
 
/**
 * In-memory store for alert rules and the history of triggered alerts.
 * Not thread-safe — intended for use within a single Vert.x event-loop context.
 */
public class AlertManagement {
 
  private final Map<Integer, AlertRule> rules = new HashMap<>();
  private final Map<Integer, Alert> alertHistory = new HashMap<>();
 
  private int nextRuleId = 1;
  private int nextAlertId = 1;
 
  // ── Rule management ────────────────────────────────────────────────────────
 
  public AlertRule addRule(String name, int region, SensorType type,
                           double threshold, ThresholdCondition condition) {
    AlertRule rule = new AlertRule(nextRuleId++, name, region, type, threshold, condition);
    rules.put(rule.id(), rule);
    return rule;
  }
 
  /**
   * @return {@code true} if the rule existed and was removed, {@code false} otherwise.
   */
  public boolean deleteRule(int id) {
    return rules.remove(id) != null;
  }
 
  public AlertRule getRule(int id) {
    return rules.get(id);
  }
 
  public List<AlertRule> getAllRules() {
    return new ArrayList<>(rules.values());
  }
 
  /**
   * Returns all rules that apply to the given region and sensor type.
   * Called by {@link AlertServiceAPI} for every incoming data point.
   */
  public List<AlertRule> getRulesFor(int region, SensorType type) {
    return rules.values().stream()
      .filter(r -> r.region() == region && r.type() == type)
      .collect(Collectors.toList());
  }
 
  // ── Alert history ──────────────────────────────────────────────────────────
 
  public Alert recordAlert(int ruleId, String ruleName, int sensorId, int region,
                           SensorType type, double triggeringValue,
                           double threshold, ThresholdCondition condition,
                           String timestamp) {
    Alert alert = new Alert(nextAlertId++, ruleId, ruleName, sensorId, region,
      type, triggeringValue, threshold, condition, timestamp, AlertStatus.ACTIVE);
    alertHistory.put(alert.id(), alert);
    return alert;
  }
 
  /**
   * Transitions an alert to {@code newStatus}.
   *
   * @return the updated alert, or {@code null} if the id was not found.
   */
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