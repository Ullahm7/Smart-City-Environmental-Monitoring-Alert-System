package sfwreng3a04.t03.g01.demo.ingress.filters;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.ingress.SensorData;
import sfwreng3a04.t03.g01.demo.repo.Region;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

public abstract class IngressFilterVerticle extends VerticleBase {
  RegionManagement regionRepo;

  public IngressFilterVerticle(RegionManagement regionRepo) {
    this.regionRepo = regionRepo;
  }

  @Override
  public Future<?> start() {
    vertx.eventBus().consumer("mgmt.region.created", msg -> subscribeToNewRegion((String)msg.body()));
    for(String region : regionRepo.retrieveRegionList().stream().map(Region::getRegionID).toList()) {
      vertx.eventBus().consumer("region." + region + ".ingress", msg -> filter(region, (AnonymizedSensorData) msg.body()));
    }

    return Future.succeededFuture();
  }

  private void subscribeToNewRegion(String regionID) {
    vertx.eventBus().consumer("region." + regionID + ".ingress", msg -> filter(regionID, (AnonymizedSensorData) msg.body()));
  }

  public abstract void filter(String region, AnonymizedSensorData payload);
}
