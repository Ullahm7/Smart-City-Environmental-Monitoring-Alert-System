package sfwreng3a04.t03.g01.demo.ingress.filters;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;

public class RawDataFilter extends IngressFilterVerticle {

  int[] regions = {1,2,3,4}; // TODO: Region repository here

  @Override
  public void filter(int region, SensorData payload) {
    //TODO: Save raw data to repo
  }
}
