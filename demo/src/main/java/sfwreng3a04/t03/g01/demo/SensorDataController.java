package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Future;
import io.vertx.core.VerticleBase;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

public class SensorDataController extends VerticleBase {

  private final EventBus eventBus;
  private final SensorDataManagement dataMgmt;
  private final RegionManagement regionMgmt;

  public SensorDataController(SensorDataManagement dataMgmt, RegionManagement regionMgmt, EventBus eventBus) {

    this.eventBus = eventBus;
    this.dataMgmt = dataMgmt;
    this.regionMgmt = regionMgmt;
  }

  @Override
  public Future<?> start() {
    for (var region : regionMgmt.retrieveRegionList()) {
      subscribeToNewRegion(region.getRegionID());
    }

    eventBus.consumer("mgmt.region.created", msg -> subscribeToNewRegion((String) msg.body()));

    return Future.succeededFuture();
  }

  private void subscribeToNewRegion(String region) {
    eventBus.consumer("region." + region + ".ingress", message -> {
      dataMgmt.saveRawData(region, (AnonymizedSensorData) message.body());
    });

    eventBus.consumer("region." + region + ".agg.avg", message -> {
      dataMgmt.saveAvgData(region, (AnonymizedSensorData) message.body());
    });

    eventBus.consumer("region." + region + ".agg.max", message -> {
      dataMgmt.saveMaxData(region, (AnonymizedSensorData) message.body());
    });
  }
}
