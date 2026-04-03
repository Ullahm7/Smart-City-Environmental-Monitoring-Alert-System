package sfwreng3a04.t03.g01.demo.ingress.filters;

import sfwreng3a04.t03.g01.demo.ingress.SensorData;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

public class TimeframeMaxFilter extends IngressFilterVerticle {

  private record HourBucket(Instant hourStart, double maxValue, int sensorId) {
  }

  private final Map<String, HourBucket> buckets = new HashMap<>();

  @Override
  public void filter(int region, SensorData payload) {
    String key = region + ":" + payload.type().name();

    Instant timestamp = DateTimeFormatter.ISO_DATE_TIME
      .parse(payload.timestamp(), Instant::from);

    Instant hourStart = timestamp.truncatedTo(ChronoUnit.HOURS);

    HourBucket current = buckets.computeIfAbsent(key, k -> new HourBucket(hourStart, payload.data(), payload.sensorId()));

    if (!current.hourStart().equals(hourStart)) {
      SensorData aggregated = new SensorData(
        current.sensorId(),
        current.maxValue(),
        payload.type(),
        current.hourStart().toString()
      );
      System.out.println("Hourly max for " + region + ": " + aggregated);
      vertx.eventBus().publish("region." + region + ".agg.max", aggregated);

      buckets.put(key, new HourBucket(hourStart, payload.data(), payload.sensorId()));
    } else {
      double newMax = Math.max(current.maxValue(), payload.data());
      buckets.put(key, new HourBucket(current.hourStart(), newMax, current.sensorId()));
    }
  }
}
