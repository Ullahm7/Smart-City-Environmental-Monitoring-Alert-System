package sfwreng3a04.t03.g01.demo.ingress.filters;

import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorType;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalUnit;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class RollingAverageFilter extends IngressFilterVerticle {
  private static final long WINDOW_MILLIS = 5 * 60 * 1000; // 5 minutes

  private record DataPoint(double value, Instant timestamp) {
  }

  private final Map<String, Deque<DataPoint>> windowData = new HashMap<>();

  @Override
  public void filter(int region, SensorData payload) {
    SensorType type = payload.type();
    String key = region + ":" + type.name();

    Instant timestamp = DateTimeFormatter.ISO_DATE_TIME
      .parse(payload.timestamp(), Instant::from);

    Deque<DataPoint> window = windowData.computeIfAbsent(key, k -> new ArrayDeque<>());

    window.addLast(new DataPoint(payload.data(), timestamp));

    Instant cutoff = timestamp.minusMillis(WINDOW_MILLIS);

    // Don't emit until we have at least 5 minutes worth of data in the buffer
    if(window.isEmpty() || window.peekFirst().timestamp().until(timestamp, ChronoUnit.SECONDS) < 5*60) {
      return;
    }

    while (!window.isEmpty() && window.peekFirst().timestamp().isBefore(cutoff)) {
      window.removeFirst();
    }

    double average = window.stream()
      .mapToDouble(DataPoint::value)
      .average()
      .orElse(0.0);

    SensorData aggregated = new SensorData(
      payload.sensorId(),
      average,
      type,
      payload.timestamp()
    );

    System.out.println("5-min rolling average for " + region + ": " + aggregated);

    vertx.eventBus().publish("region." + region + ".agg.avg", aggregated);
  }
}
