package sfwreng3a04.t03.g01.demo.repo;
import java.util.ArrayList;
import java.util.HashMap;

public class RegionManagement {

    private final HashMap<Integer, Region> regionDatabase = new HashMap<>();

    public Region retrieveRegion(int regionID) {
        return regionDatabase.get(regionID);
    }

    public void addRegion(String regionName, int regionID, double minLat, double minLon, double maxLat, double maxLon) {
        regionDatabase.put(regionID, new Region(regionName, regionID, minLat, minLon, maxLat, minLon));
    }

    public void deleteRegion(int regionID) {
        regionDatabase.remove(regionID);
    }

    public ArrayList<Region> retrieveRegionList() {

        ArrayList<Region> regionList = new ArrayList<>();
        ArrayList<Integer> regionKeyList = new ArrayList<>(regionDatabase.keySet());

        for (Integer integer : regionKeyList) {
            regionList.add(regionDatabase.get(integer));
        }

        return regionList;
    }

}