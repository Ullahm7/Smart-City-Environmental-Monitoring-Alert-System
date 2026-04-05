package sfwreng3a04.t03.g01.demo.repo;

import java.util.HashMap;

public class Region {
    
    private String regionName;
    private String regionID;
    private HashMap<String, Double> coordinates = new HashMap<>();


    public Region(String regionName, String regionID, double minLat, double minLon, double maxLat, double maxLon) {

       this.regionName = regionName;
       this.regionID = regionID;

       this.coordinates.put("minLat", minLat);
       this.coordinates.put("minLon", minLon);
       this.coordinates.put("maxLat", maxLat);
       this.coordinates.put("maxLon", maxLon);
    }

    public String getRegionID() {
        return regionID;
    }

    public String getRegionName() {
        return regionName;
    }

    public HashMap<String, Double> getCoordinates() {
        return coordinates;
    }
    
}
