package sfwreng3a04.t03.g01.demo.repo;

import java.util.HashMap;
import java.util.Map;

public class SensorManagement {

  private Map<Integer, Sensor> sensors;

  public SensorManagement() {
    sensors = new HashMap<>(Map.of(
      0, new Sensor(0, 1),
      1, new Sensor(1, 1),
      2, new Sensor(2, 1),
      3, new Sensor(3, 1)
    ));
  }

  public Sensor getSensor(int id) {
    return sensors.get(id);
  }

  public boolean sensorExists(int id) { return sensors.containsKey(id); }

  public void addSensor(Sensor sensor) {
    sensors.put(sensor.id(), sensor);
  }

  public void deleteSensor(int id) {
    sensors.remove(id);
  }
}
