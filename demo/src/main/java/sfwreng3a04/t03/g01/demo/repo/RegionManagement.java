package sfwreng3a04.t03.g01.demo.repo;
import io.vertx.core.eventbus.EventBus;

import java.util.ArrayList;
import java.util.HashMap;

public class RegionManagement {

    private final HashMap<String, Region> regionDatabase = new HashMap<>();
    private final EventBus eventBus;

    public RegionManagement(EventBus eventBus) {
        this.eventBus = eventBus;
    }

    public Region retrieveRegion(String regionID) {
        return regionDatabase.get(regionID);
    }

    public void addRegion(String regionName, String regionID, double minLat, double minLon, double maxLat, double maxLon) {
        regionDatabase.put(regionID, new Region(regionName, regionID, minLat, minLon, maxLat, maxLon));
        eventBus.publish("mgmt.region.created", regionID);
    }

    public void deleteRegion(String regionID) {
        regionDatabase.remove(regionID);
        eventBus.publish("mgmt.region.deleted", regionID);
    }

    public ArrayList<Region> retrieveRegionList() {

        ArrayList<Region> regionList = new ArrayList<>();
        ArrayList<String> regionKeyList = new ArrayList<>(regionDatabase.keySet());

        for (String id : regionKeyList) {
            regionList.add(regionDatabase.get(id));
        }

        return regionList;
    }

}
