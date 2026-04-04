package sfwreng3a04.t03.g01.demo.repo;

import java.util.HashMap;

public class Region {
    
    private String regionName;
    private int regionID;
    private HashMap<String, Double> coordinates;


    public Region(String regionName, int regionID, double minLat, double minLon, double maxLat, double maxLon) {

       this.regionName = regionName;
       this.regionID = regionID;

       this.coordinates.put("minLat", minLat);
       this.coordinates.put("minLon", minLon);
       this.coordinates.put("maxLat", maxLat);
       this.coordinates.put("maxLon", maxLon);
    }

    public int getRegionID() {
        return regionID;
    }
    
}
