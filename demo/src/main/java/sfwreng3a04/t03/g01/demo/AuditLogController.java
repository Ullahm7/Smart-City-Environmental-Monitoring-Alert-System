package sfwreng3a04.t03.g01.demo;
import java.util.ArrayList;

import io.vertx.core.Vertx;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;
import sfwreng3a04.t03.g01.demo.repo.Log;
import sfwreng3a04.t03.g01.demo.repo.AuditLogManagement;

public class AuditLogController {

    private final AuditLogManagement auditLogRepo;

    private AuditLogController(AuditLogManagement auditLogRepo) {
        this.auditLogRepo = auditLogRepo;
    }

    public static Router createRouter(Vertx vertx, AuditLogManagement auditLogRepo) {

        var controller = new AuditLogController(auditLogRepo);
        var router = Router.router(vertx);

        router.route().handler(BodyHandler.create());

        router.get("/").handler(controller::getAll);
        router.get("/:id").handler(controller::getById);
        router.post("/").handler(controller::create);

        return router;
    }

    // Retrieves list of logs
    private void getAll(RoutingContext ctx) {

        ArrayList<Log> logList = auditLogRepo.retrieveLogList();

        System.out.println(Json.encode(logList));

        ctx.response()
            .putHeader("Content-Type", "application/json")
            .end(Json.encode(logList)); 
    }

    // Retrieves single log by ID
    private void getById(RoutingContext ctx) {

        String id = ctx.pathParam("id");
        Log log = auditLogRepo.retrieveLog(id);

        ctx.response()
            .putHeader("Content-Type", "application/json")
            .end(Json.encode(log));
    }

    // Creates a single log
    private void create(RoutingContext ctx) {
        JsonObject data = ctx.body().asJsonObject();

        System.out.println(data);

        auditLogRepo.addLog(data.getString("logID"),
                            data.getString("description"));

        ctx.response().setStatusCode(201).end();
    }

    // // Deletes a single log by ID
    // private void deleteById(RoutingContext ctx) {
        
    //     String id = ctx.pathParam("id");
    //     auditLogRepo.deleteRegion(id);

    //     ctx.response().setStatusCode(201).end();
    // }
}