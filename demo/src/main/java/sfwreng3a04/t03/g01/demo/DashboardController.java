package sfwreng3a04.t03.g01.demo;

import io.vertx.core.Vertx;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.client.WebClient;
import io.vertx.ext.web.handler.BodyHandler;

public class DashboardController {

    private final Vertx vertx;
    private final WebClient client;
    private static final String BASE_URL = "localhost";
    private static final int PORT = 8888;

    private DashboardController(Vertx vertx) {
        this.vertx = vertx;
        this.client = WebClient.create(vertx);
    }

    public static Router createRouter(Vertx vertx) {
        var controller = new DashboardController(vertx);
        var router = Router.router(vertx);

        router.route().handler(BodyHandler.create());

        // Dashboard overview endpoint - aggregates key metrics
        router.get("/overview").handler(controller::getOverview);

        // Get all active alerts with sensor and region context
        router.get("/active-alerts").handler(controller::getActiveAlerts);

        // Get latest data for all regions
        router.get("/regions-data").handler(controller::getRegionsData);

        // Get system statistics
        router.get("/stats").handler(controller::getSystemStats);

        return router;
    }

    /**
     * GET /api/dashboard/overview
     * Returns aggregated dashboard data including counts and recent activity
     */
    private void getOverview(io.vertx.ext.web.RoutingContext ctx) {
        JsonObject overview = new JsonObject();

        // Fetch sensors from SensorController
        client.get(PORT, BASE_URL, "/sensors/")
            .send()
            .compose(sensorsResp -> {
                if (sensorsResp.statusCode() == 200) {
                    JsonArray sensors = sensorsResp.bodyAsJsonArray();
                    overview.put("totalSensors", sensors.size());
                } else {
                    overview.put("totalSensors", 0);
                }

                // Fetch regions from RegionController
                return client.get(PORT, BASE_URL, "/region/").send();
            })
            .compose(regionsResp -> {
                if (regionsResp.statusCode() == 200) {
                    JsonArray regions = regionsResp.bodyAsJsonArray();
                    overview.put("totalRegions", regions.size());
                } else {
                    overview.put("totalRegions", 0);
                }

                // Fetch alerts from AlertController
                return client.get(PORT, BASE_URL, "/api/alerts/history").send();
            })
            .compose(alertsResp -> {
                if (alertsResp.statusCode() == 200) {
                    JsonArray alerts = alertsResp.bodyAsJsonArray();
                    long activeCount = alerts.stream()
                        .filter(obj -> obj instanceof JsonObject)
                        .map(obj -> (JsonObject) obj)
                        .filter(alert -> "ACTIVE".equals(alert.getString("status")))
                        .count();
                    overview.put("activeAlerts", activeCount);
                } else {
                    overview.put("activeAlerts", 0);
                }

                // Fetch alert rules from AlertController
                return client.get(PORT, BASE_URL, "/api/alerts/rules").send();
            })
            .onSuccess(rulesResp -> {
                if (rulesResp.statusCode() == 200) {
                    JsonArray rules = rulesResp.bodyAsJsonArray();
                    overview.put("totalAlertRules", rules.size());
                } else {
                    overview.put("totalAlertRules", 0);
                }

                ctx.response()
                    .putHeader("content-type", "application/json")
                    .end(overview.encode());
            })
            .onFailure(err -> {
                ctx.response()
                    .setStatusCode(500)
                    .putHeader("content-type", "application/json")
                    .end(new JsonObject()
                        .put("error", "Failed to fetch dashboard overview: " + err.getMessage())
                        .encode());
            });
    }

    /**
     * GET /api/dashboard/active-alerts
     * Returns all active alerts with enriched region information
     */
    private void getActiveAlerts(io.vertx.ext.web.RoutingContext ctx) {
        // Fetch active alerts from AlertController
        client.get(PORT, BASE_URL, "/api/alerts/history")
            .addQueryParam("status", "ACTIVE")
            .send()
            .compose(alertsResp -> {
                if (alertsResp.statusCode() == 200) {
                    JsonArray alerts = alertsResp.bodyAsJsonArray();
                    
                    // Fetch regions to enrich alert data
                    return client.get(PORT, BASE_URL, "/region/")
                        .send()
                        .map(regionsResp -> {
                            JsonArray enrichedAlerts = new JsonArray();
                            
                            if (regionsResp.statusCode() == 200) {
                                JsonArray regions = regionsResp.bodyAsJsonArray();
                                
                                // Enrich each alert with region information
                                alerts.forEach(alertObj -> {
                                    JsonObject alert = (JsonObject) alertObj;
                                    String regionId = alert.getString("region"); // "region" is the string key
                                    
                                    // Find matching region
                                    regions.stream()
                                        .filter(r -> r instanceof JsonObject)
                                        .map(r -> (JsonObject) r)
                                        .filter(r -> regionId.equals(r.getString("regionID")))
                                        .findFirst()
                                        .ifPresent(region -> {
                                            alert.put("regionName", region.getString("regionName"));
                                            JsonObject coords = region.getJsonObject("coordinates");
                                            if (coords != null) {
                                                alert.put("regionBounds", new JsonObject()
                                                    .put("minLat", coords.getDouble("minLat"))
                                                    .put("minLon", coords.getDouble("minLon"))
                                                    .put("maxLat", coords.getDouble("maxLat"))
                                                    .put("maxLon", coords.getDouble("maxLon")));
                                            }
                                        });
                                    
                                    enrichedAlerts.add(alert);
                                });
                            } else {
                                // Return alerts without enrichment if regions fetch fails
                                return alerts;
                            }
                            
                            return enrichedAlerts;
                        });
                } else {
                    return io.vertx.core.Future.succeededFuture(new JsonArray());
                }
            })
            .onSuccess(enrichedAlerts -> {
                ctx.response()
                    .putHeader("content-type", "application/json")
                    .end(enrichedAlerts.encode());
            })
            .onFailure(err -> {
                ctx.response()
                    .setStatusCode(500)
                    .putHeader("content-type", "application/json")
                    .end(new JsonObject()
                        .put("error", "Failed to fetch active alerts: " + err.getMessage())
                        .encode());
            });
    }

    /**
     * GET /api/dashboard/regions-data
     * Returns all regions with their latest sensor data
     */
    private void getRegionsData(io.vertx.ext.web.RoutingContext ctx) {
        // Fetch regions from RegionController
        client.get(PORT, BASE_URL, "/region/")
            .send()
            .compose(regionsResp -> {
                if (regionsResp.statusCode() == 200) {
                    JsonArray regions = regionsResp.bodyAsJsonArray();
                    
                    // Fetch sensors and current sensor data
                    return client.get(PORT, BASE_URL, "/sensors/")
                        .send()
                        .compose(sensorsResp -> {
                            // Fetch current sensor data from DataServiceAPI
                            return client.get(PORT, BASE_URL, "/api/data/current")
                                .send()
                                .map(dataResp -> {
                                    JsonArray regionsData = new JsonArray();
                                    
                                    regions.forEach(regionObj -> {
                                        JsonObject region = (JsonObject) regionObj;
                                        String regionId = region.getString("regionID");
                                        
                                        // Copy region data
                                        JsonObject regionData = region.copy();
                                        
                                        // Count sensors in this region
                                        if (sensorsResp.statusCode() == 200) {
                                            JsonArray sensors = sensorsResp.bodyAsJsonArray();
                                            long sensorCount = sensors.stream()
                                                .filter(s -> s instanceof JsonObject)
                                                .map(s -> (JsonObject) s)
                                                .filter(sensor -> {
                                                    String sensorRegionStr = sensor.getString("region");
                                                    return regionId != null && regionId.equals(sensorRegionStr);
                                                })
                                                .count();
                                            regionData.put("sensorCount", sensorCount);
                                        } else {
                                            regionData.put("sensorCount", 0);
                                        }
                                        
                                        // Add latest sensor data for this region
                                        if (dataResp.statusCode() == 200) {
                                            JsonArray currentData = dataResp.bodyAsJsonArray();
                                            JsonArray regionSensorData = new JsonArray();
                                            
                                            currentData.forEach(dataObj -> {
                                                JsonObject data = (JsonObject) dataObj;
                                                if (regionId.equals(data.getString("region"))) {
                                                    regionSensorData.add(data);
                                                }
                                            });
                                            
                                            regionData.put("sensorData", regionSensorData);
                                        }
                                        
                                        regionsData.add(regionData);
                                    });
                                    
                                    return regionsData;
                                });
                        });
                } else {
                    return io.vertx.core.Future.succeededFuture(new JsonArray());
                }
            })
            .onSuccess(regionsData -> {
                ctx.response()
                    .putHeader("content-type", "application/json")
                    .end(regionsData.encode());
            })
            .onFailure(err -> {
                ctx.response()
                    .setStatusCode(500)
                    .putHeader("content-type", "application/json")
                    .end(new JsonObject()
                        .put("error", "Failed to fetch regions data: " + err.getMessage())
                        .encode());
            });
    }

    /**
     * GET /api/dashboard/stats
     * Returns system-wide statistics
     */
    private void getSystemStats(io.vertx.ext.web.RoutingContext ctx) {
        JsonObject stats = new JsonObject();

        // Fetch alerts from AlertController
        client.get(PORT, BASE_URL, "/api/alerts/history")
            .send()
            .compose(alertsResp -> {
                if (alertsResp.statusCode() == 200) {
                    JsonArray alerts = alertsResp.bodyAsJsonArray();
                    
                    long activeCount = alerts.stream()
                        .filter(obj -> obj instanceof JsonObject)
                        .map(obj -> (JsonObject) obj)
                        .filter(alert -> "ACTIVE".equals(alert.getString("status")))
                        .count();
                    
                    long acknowledgedCount = alerts.stream()
                        .filter(obj -> obj instanceof JsonObject)
                        .map(obj -> (JsonObject) obj)
                        .filter(alert -> "ACKNOWLEDGED".equals(alert.getString("status")))
                        .count();
                    
                    long resolvedCount = alerts.stream()
                        .filter(obj -> obj instanceof JsonObject)
                        .map(obj -> (JsonObject) obj)
                        .filter(alert -> "RESOLVED".equals(alert.getString("status")))
                        .count();

                    JsonObject alertStats = new JsonObject()
                        .put("total", alerts.size())
                        .put("active", activeCount)
                        .put("acknowledged", acknowledgedCount)
                        .put("resolved", resolvedCount);
                    stats.put("alerts", alertStats);
                } else {
                    stats.put("alerts", new JsonObject()
                        .put("total", 0)
                        .put("active", 0)
                        .put("acknowledged", 0)
                        .put("resolved", 0));
                }

                // Fetch sensors
                return client.get(PORT, BASE_URL, "/sensors/").send();
            })
            .compose(sensorsResp -> {
                if (sensorsResp.statusCode() == 200) {
                    JsonArray sensors = sensorsResp.bodyAsJsonArray();
                    stats.put("sensors", new JsonObject().put("total", sensors.size()));
                } else {
                    stats.put("sensors", new JsonObject().put("total", 0));
                }

                // Fetch regions
                return client.get(PORT, BASE_URL, "/region/").send();
            })
            .compose(regionsResp -> {
                if (regionsResp.statusCode() == 200) {
                    JsonArray regions = regionsResp.bodyAsJsonArray();
                    stats.put("regions", new JsonObject().put("total", regions.size()));
                } else {
                    stats.put("regions", new JsonObject().put("total", 0));
                }

                // Fetch alert rules
                return client.get(PORT, BASE_URL, "/api/alerts/rules").send();
            })
            .onSuccess(rulesResp -> {
                if (rulesResp.statusCode() == 200) {
                    JsonArray rules = rulesResp.bodyAsJsonArray();
                    stats.put("alertRules", new JsonObject().put("total", rules.size()));
                } else {
                    stats.put("alertRules", new JsonObject().put("total", 0));
                }

                ctx.response()
                    .putHeader("content-type", "application/json")
                    .end(stats.encode());
            })
            .onFailure(err -> {
                ctx.response()
                    .setStatusCode(500)
                    .putHeader("content-type", "application/json")
                    .end(new JsonObject()
                        .put("error", "Failed to fetch system stats: " + err.getMessage())
                        .encode());
            });
    }
}
