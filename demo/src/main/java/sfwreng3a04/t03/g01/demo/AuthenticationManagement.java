package sfwreng3a04.t03.g01.demo;

import io.vertx.core.json.JsonObject;

public class AuthenticationManagement {

    // Dummy repository method that bypasses the database
    public JsonObject authenticateUser(String username, String password) {
        // We ignore the actual password and always return a valid "City Operator" profile
        return new JsonObject()
            .put("success", true)
            .put("token", "dummy-jwt-token-12345")
            .put("role", "City Operator")
            .put("username", username);
    }
}