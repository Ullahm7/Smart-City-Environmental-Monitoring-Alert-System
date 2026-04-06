package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Vertx;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import sfwreng3a04.t03.g01.demo.ingress.AnonymizedSensorData;

public class SensorDataController {

    // Now it takes SensorDataManagement as the second argument
    public static Router createRouter(Vertx vertx, SensorDataManagement dataMgmt) {
        Router router = Router.router(vertx);

        // 1. Consume from the Event Bus and tell the Management layer to save it
        vertx.eventBus().<AnonymizedSensorData>consumer("region.downtown.agg.avg", message -> {
            dataMgmt.saveLatestData("downtown", message.body());
        });

        // 2. Fetch the data from the Management layer to send to React
        router.get("/latest/:region").handler(ctx -> {
            String region = ctx.pathParam("region");
            AnonymizedSensorData data = dataMgmt.getLatestData(region);

            if (data != null) {
                ctx.response()
                    .putHeader("content-type", "application/json")
                    .end(JsonObject.mapFrom(data).encode());
            } else {
                ctx.response()
                    .setStatusCode(404)
                    .putHeader("content-type", "application/json")
                    .end(new JsonObject().put("message", "No aggregated data available yet").encode());
            }
        });

        return router;
    }
}