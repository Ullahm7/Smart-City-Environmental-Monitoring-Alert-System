package sfwreng3a04.t03.g01.demo;

import java.util.ArrayList;

import io.vertx.core.Vertx;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import sfwreng3a04.t03.g01.demo.repo.Region;
import sfwreng3a04.t03.g01.demo.repo.RegionManagement;

public class RegionController {

    private final RegionManagement regionRepo;

    private RegionController(RegionManagement regionRepo) {
        this.regionRepo = regionRepo;
    }

    public static Router createRouter(Vertx vertx, RegionManagement regionRepo) {
        var controller = new RegionController(regionRepo);
        var router = Router.router(vertx);

        router.get("/").handler(controller::getAll);
        router.get("/:id").handler(controller::getById);
        router.post("/").handler(controller::create);
        router.delete("/:id").handler(controller::deleteById);

        return router;
    }

    // Retrieves list of regions
    private void getAll(RoutingContext ctx) {

        ArrayList<Region> regionList = regionRepo.retrieveRegionList();
        ctx.response()
            .putHeader("Content-Type", "application/json")
            .end(Json.encode(regionList)); 
    }

    // Retrieves single region by ID
    private void getById(RoutingContext ctx) {

        int id = Integer.parseInt(ctx.pathParam("id"));

        Region region = regionRepo.retrieveRegion(id);

        ctx.response()
            .putHeader("Content-Type", "application/json")
            .end(Json.encode(region));
    }

    // Creates a single region
    private void create(RoutingContext ctx) {
        ctx.request().body().onSuccess(body -> {
            JsonObject data = body.toJsonObject();

            regionRepo.addRegion(data.getString("regionName"),
                                 data.getInteger("regionID"),
                                 data.getDouble("minLat"),
                                 data.getDouble("minLon"),
                                 data.getDouble("maxLat"),
                                 data.getDouble("maxLon"));

            ctx.response().setStatusCode(201).end();
        });
    }

    // Deletes a single region by ID
    private void deleteById(RoutingContext ctx) {
        
        int id = Integer.parseInt(ctx.pathParam("id"));
        regionRepo.deleteRegion(id);

        ctx.response().setStatusCode(201).end();
    }
}