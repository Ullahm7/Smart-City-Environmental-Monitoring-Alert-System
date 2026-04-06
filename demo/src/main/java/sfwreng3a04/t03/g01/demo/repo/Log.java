package sfwreng3a04.t03.g01.demo.repo;
import java.time.Instant;

public class Log {

    private Instant timestamp;
    private String description;
    private String logID;
    private String userID;

    public Log(String logID, String description, String userID) {
        this.timestamp = Instant.now();
        this.description = description;
        this.logID = logID;
        this.userID = userID;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public String getDescription() {
        return description;
    }

    public String getLogID(){
        return logID;
    }

    public String getUserID() {
        return userID;
    }
}
