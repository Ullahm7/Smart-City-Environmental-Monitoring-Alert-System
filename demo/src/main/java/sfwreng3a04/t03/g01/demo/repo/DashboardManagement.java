package sfwreng3a04.t03.g01.demo.repo;

import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;

import java.util.HashMap;
import java.util.Map;

public class DashboardManagement {
    
    private Map<String, DashboardSettings> userSettings;
    private final EventBus eventBus;
    private static final String DEFAULT_USER = "default";

    public DashboardManagement(EventBus eventBus) {
        this.userSettings = new HashMap<>();
        this.eventBus = eventBus;
        
        // Initialize with default settings
        userSettings.put(DEFAULT_USER, new DashboardSettings(DEFAULT_USER));
    }

    /**
     * Get dashboard settings for a specific user
     * If user doesn't exist, create default settings
     */
    public DashboardSettings getSettings(String userId) {
        return userSettings.computeIfAbsent(userId, DashboardSettings::new);
    }

    /**
     * Update dashboard settings for a user
     */
    public DashboardSettings updateSettings(String userId, JsonObject updates) {
        DashboardSettings settings = getSettings(userId);
        
        if (updates.containsKey("cityName")) {
            settings.setCityName(updates.getString("cityName"));
        }
        if (updates.containsKey("logoUrl")) {
            settings.setLogoUrl(updates.getString("logoUrl"));
        }
        if (updates.containsKey("primaryColor")) {
            settings.setPrimaryColor(updates.getString("primaryColor"));
        }
        if (updates.containsKey("secondaryColor")) {
            settings.setSecondaryColor(updates.getString("secondaryColor"));
        }
        if (updates.containsKey("accentColor")) {
            settings.setAccentColor(updates.getString("accentColor"));
        }

        eventBus.publish("mgmt.dashboard.updated", settings.toJson());
        return settings;
    }

    /**
     * Reset dashboard settings for a user to defaults
     */
    public DashboardSettings resetSettings(String userId) {
        DashboardSettings defaultSettings = new DashboardSettings(userId);
        userSettings.put(userId, defaultSettings);
        eventBus.publish("mgmt.dashboard.reset", userId);
        return defaultSettings;
    }

    /**
     * Check if user has custom settings
     */
    public boolean hasCustomSettings(String userId) {
        return userSettings.containsKey(userId);
    }

    /**
     * Get all user settings (for admin purposes)
     */
    public Map<String, DashboardSettings> getAllSettings() {
        return new HashMap<>(userSettings);
    }
}
