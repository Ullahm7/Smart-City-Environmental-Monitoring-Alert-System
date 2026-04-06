package sfwreng3a04.t03.g01.demo.repo;
import java.util.ArrayList;
import java.util.HashMap;

public class AuditLogManagement {

    private final HashMap<String, Log> auditDatabase = new HashMap<>();

    public Log retrieveLog(String logID) {
        return auditDatabase.get(logID);
    }

    public void addLog(String logID, String description, String userID) {
        auditDatabase.put(logID, new Log(logID, description, userID));
    }

    public ArrayList<Log> retrieveLogList() {

        ArrayList<Log> logList = new ArrayList<>();
        ArrayList<String> logKeyList = new ArrayList<>(auditDatabase.keySet());

        for (String id : logKeyList) {
            logList.add(auditDatabase.get(id));
        }

        return logList;
    }

}