package sfwreng3a04.t03.g01.demo.repo;

import io.vertx.core.eventbus.EventBus;

import java.util.*;

public class SensorManagement {

  private Map<UUID, Sensor> sensors;
  private final EventBus eventBus;

  public SensorManagement(EventBus eventBus) {
    sensors = new HashMap<>();
    this.eventBus = eventBus;
  }

  public Sensor getSensor(UUID id) {
    return sensors.get(id);
  }

  public boolean sensorExists(UUID id) { return sensors.containsKey(id); }

  public Sensor addSensor(UUID id, String name, UUID regionId) {
    var sensor = new Sensor(id, name, regionId);
    sensors.put(sensor.id(), sensor);
    eventBus.publish("mgmt.sensor.created", sensor.id());
    return sensor;
  }

  public void deleteSensor(UUID id) {
    sensors.remove(id);
    eventBus.publish("mgmt.sensor.deleted", id);
  }

  public List<Sensor> retrieveSensorList() {
    return new ArrayList<>(sensors.values());
  }
}
