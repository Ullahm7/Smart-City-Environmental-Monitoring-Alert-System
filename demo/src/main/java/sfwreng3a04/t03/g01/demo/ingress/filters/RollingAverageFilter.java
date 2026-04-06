package sfwreng3a04.t03.g01.demo.ingress.filters;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

import io.vertx.core.json.JsonObject;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

public class RollingAverageFilter extends IngressFilterVerticle {
  private static final long WINDOW_MILLIS = 5 * 60 * 1000; // 5 minutes

    public RollingAverageFilter(RegionManagement regionRepo) {
    super(regionRepo);
  }
  @Override
public io.vertx.core.Future<?> start() {
    // 1. Keep the original logic from IngressFilterVerticle
    return super.start().onSuccess(v -> {
        // 2. Add the listener for your Third-Party API
        vertx.eventBus().consumer("region.data.request", msg -> {
            JsonObject req = (JsonObject) msg.body();
            String regionId = req.getString("regionId");
            
            // Look up the data in this filter's internal Map
            String key = regionId + ":" + SensorType.AIR_QUALITY.name();
            var window = windowData.get(key);

            if (window == null || window.isEmpty()) {
                msg.reply(0.0);
            } else {
                double avg = window.stream()
                    .mapToDouble(DataPoint::value)
                    .average()
                    .orElse(0.0);
                msg.reply(avg);
            }
        });
    });
}

  private record DataPoint(double value, Instant timestamp) {
  }

  private final Map<String, Deque<DataPoint>> windowData = new HashMap<>();

  @Override
  public void filter(String region, AnonymizedSensorData payload) {
    SensorType type = payload.type();
    String key = region + ":" + type.name();

    Instant timestamp = DateTimeFormatter.ISO_DATE_TIME
      .parse(payload.timestamp(), Instant::from);

    Deque<DataPoint> window = windowData.computeIfAbsent(key, k -> new ArrayDeque<>());

    window.addLast(new DataPoint(payload.data(), timestamp));

    Instant cutoff = timestamp.minusMillis(WINDOW_MILLIS);

    // Don't emit until we have at least 5 minutes worth of data in the buffer
    if(window.isEmpty() || window.peekFirst().timestamp().until(timestamp, ChronoUnit.SECONDS) < 0.5*60) {
      return;
    }

    while (!window.isEmpty() && window.peekFirst().timestamp().isBefore(cutoff)) {
      window.removeFirst();
    }

    double average = window.stream()
      .mapToDouble(DataPoint::value)
      .average()
      .orElse(0.0);

    var aggregated = new AnonymizedSensorData(
      payload.regionId(),
      average,
      type,
      payload.timestamp()
    );

    System.out.println("5-min rolling average for " + region + ": " + aggregated);

    vertx.eventBus().publish("region." + region + ".agg.avg", aggregated);
  }
  
  
}
