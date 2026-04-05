package sfwreng3a04.t03.g01.demo.ingress.filters;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

public class RawDataFilter extends IngressFilterVerticle {

  public RawDataFilter(RegionManagement regionRepo) {
    super(regionRepo);
  }

  @Override
  public void filter(String region, AnonymizedSensorData payload) {
    System.out.println("Raw data received for region " + region + ": " + payload);
  }
}
