package sfwreng3a04.t03.g01.demo.repo;

import java.util.HashMap;
import java.util.Map;

public class SensorManagement {

  private Map<Integer, Sensor> sensors;
  private int nextId = 4;

  public SensorManagement() {
    sensors = new HashMap<>(Map.of(
      0, new Sensor(0, "Sensor A", 1),
      1, new Sensor(1, "Sensor B", 1),
      2, new Sensor(2, "Sensor C", 1),
      3, new Sensor(3, "Sensor D", 1)
    ));
  }

  public Sensor getSensor(int id) {
    return sensors.get(id);
  }

  public boolean sensorExists(int id) { return sensors.containsKey(id); }

  public Sensor addSensor(String name, int region) {
    var sensor = new Sensor(nextId++, name, region);
    sensors.put(sensor.id(), sensor);
    return sensor;
  }

  public void deleteSensor(int id) {
    sensors.remove(id);
  }
}
