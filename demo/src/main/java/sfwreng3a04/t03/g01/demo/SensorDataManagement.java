package sfwreng3a04.t03.g01.demo;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;

public class SensorDataManagement {

  public enum DataType {
    RAW,
    AVG,
    MAX
  }

  private record DataKey(String region, DataType type) {
  }

  // This acts as your Repository/DB layer for the demo
  private final Map<DataKey, List<AnonymizedSensorData>> latestDataCache = new ConcurrentHashMap<>();

  public void saveRawData(String region, AnonymizedSensorData data) {
    latestDataCache.compute(new DataKey(region, DataType.RAW), (k, v) -> {
      if (v == null) {
        return new ArrayList<>(List.of(data));
      } else {
        v.add(data);
        return v;
      }
    });
  }

  public void saveAvgData(String region, AnonymizedSensorData data) {
    latestDataCache.compute(new DataKey(region, DataType.AVG), (k, v) -> {
      if (v == null) {
        return new ArrayList<>(List.of(data));
      } else {
        v.add(data);
        return v;
      }
    });
  }

  public void saveMaxData(String region, AnonymizedSensorData data) {
    latestDataCache.compute(new DataKey(region, DataType.MAX), (k, v) -> {
      if (v == null) {
        return new ArrayList<>(List.of(data));
      } else {
        v.add(data);
        return v;
      }
    });
  }

  public List<AnonymizedSensorData> getData(String region, DataType type, Instant start, Instant end) {
    var data = latestDataCache.get(new DataKey(region, type));

    return data.stream().filter(pt -> {
        if (start != null) {
          return DateTimeFormatter.ISO_DATE_TIME.parse(pt.timestamp(), Instant::from).isAfter(start);
        } else {
          return true;
        }
      })
      .filter(pt -> {
        if (end != null) {
          return DateTimeFormatter.ISO_DATE_TIME.parse(pt.timestamp(), Instant::from).isBefore(end);
        } else {
          return true;
        }
      })
      .toList();
  }
}
