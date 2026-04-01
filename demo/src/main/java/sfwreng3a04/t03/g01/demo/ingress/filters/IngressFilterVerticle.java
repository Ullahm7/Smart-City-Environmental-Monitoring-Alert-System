package sfwreng3a04.t03.g01.demo.ingress.filters;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;

public abstract class IngressFilterVerticle extends VerticleBase {
  int[] regions = {1,2,3,4}; // TODO: Replace with repo

  @Override
  public Future<?> start() {
    for(int region : regions) {
      vertx.eventBus().consumer("region." + region + ".ingress", msg -> filter(region, (SensorData) msg.body()));
    }

    return Future.succeededFuture();
  }

  public abstract void filter(int region, SensorData payload);
}
