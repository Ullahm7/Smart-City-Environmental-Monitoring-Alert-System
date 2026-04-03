package sfwreng3a04.t03.g01.demo.ingress.filters;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;

public class RawDataFilter extends IngressFilterVerticle {

  @Override
  public void filter(int region, SensorData payload) {
    System.out.println("Raw data received for region " + region + ": " + payload);
  }
}
