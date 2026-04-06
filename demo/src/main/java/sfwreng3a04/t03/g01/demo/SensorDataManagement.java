package sfwreng3a04.t03.g01.demo;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;

public class SensorDataManagement {

    // This acts as your Repository/DB layer for the demo
    private final Map<String, AnonymizedSensorData> latestDataCache = new ConcurrentHashMap<>();

    public void saveLatestData(String region, AnonymizedSensorData data) {
        latestDataCache.put(region, data);
    }

    public AnonymizedSensorData getLatestData(String region) {
        return latestDataCache.get(region);
    }
}