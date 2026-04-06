package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Vertx;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;

public class AuthenticationController {

    // Note that we pass the AuthenticationManagement repository in as a dependency
    public static Router createRouter(Vertx vertx, AuthenticationManagement authRepo) {
        Router router = Router.router(vertx);
        
        // Required to parse incoming JSON bodies from React
        router.route().handler(BodyHandler.create());

        router.post("/login").handler(ctx -> {
            JsonObject body = ctx.body().asJsonObject();
            String username = body != null ? body.getString("username", "Admin") : "Admin";
            String password = body != null ? body.getString("password", "") : "";

            // Delegate the logic to the Management/Repository layer
            JsonObject response = authRepo.authenticateUser(username, password);

            ctx.response()
                .putHeader("content-type", "application/json")
                .end(response.encode());
        });

        return router;
    }
}