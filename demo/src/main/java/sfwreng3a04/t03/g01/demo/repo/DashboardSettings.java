package sfwreng3a04.t03.g01.demo.repo;

import io.vertx.core.json.JsonObject;

public class DashboardSettings {
    
    private String userId;
    private String cityName;
    private String logoUrl;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private Long updatedAt;

    public DashboardSettings(String userId) {
        this.userId = userId;
        this.cityName = "City Dashboard";
        this.logoUrl = "";
        this.primaryColor = "#3b82f6"; // blue
        this.secondaryColor = "#8b5cf6"; // purple
        this.accentColor = "#10b981"; // green
        this.updatedAt = System.currentTimeMillis();
    }

    public DashboardSettings(String userId, String cityName, String logoUrl, 
                            String primaryColor, String secondaryColor, String accentColor) {
        this.userId = userId;
        this.cityName = cityName;
        this.logoUrl = logoUrl;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.accentColor = accentColor;
        this.updatedAt = System.currentTimeMillis();
    }

    // Getters
    public String getUserId() {
        return userId;
    }

    public String getCityName() {
        return cityName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public String getSecondaryColor() {
        return secondaryColor;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public Long getUpdatedAt() {
        return updatedAt;
    }

    // Setters
    public void setCityName(String cityName) {
        this.cityName = cityName;
        this.updatedAt = System.currentTimeMillis();
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
        this.updatedAt = System.currentTimeMillis();
    }

    public void setPrimaryColor(String primaryColor) {
        this.primaryColor = primaryColor;
        this.updatedAt = System.currentTimeMillis();
    }

    public void setSecondaryColor(String secondaryColor) {
        this.secondaryColor = secondaryColor;
        this.updatedAt = System.currentTimeMillis();
    }

    public void setAccentColor(String accentColor) {
        this.accentColor = accentColor;
        this.updatedAt = System.currentTimeMillis();
    }

    // Convert to JSON
    public JsonObject toJson() {
        return new JsonObject()
            .put("userId", userId)
            .put("cityName", cityName)
            .put("logoUrl", logoUrl)
            .put("primaryColor", primaryColor)
            .put("secondaryColor", secondaryColor)
            .put("accentColor", accentColor)
            .put("updatedAt", updatedAt);
    }

    // Create from JSON
    public static DashboardSettings fromJson(JsonObject json) {
        DashboardSettings settings = new DashboardSettings(
            json.getString("userId"),
            json.getString("cityName", "City Dashboard"),
            json.getString("logoUrl", ""),
            json.getString("primaryColor", "#3b82f6"),
            json.getString("secondaryColor", "#8b5cf6"),
            json.getString("accentColor", "#10b981")
        );
        if (json.containsKey("updatedAt")) {
            settings.updatedAt = json.getLong("updatedAt");
        }
        return settings;
    }
}
