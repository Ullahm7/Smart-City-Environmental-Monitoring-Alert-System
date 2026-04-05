package sfwreng3a04.t03.g01.demo.repo;
import java.time.Instant;

public class Log {

    private Instant timestamp;
    private String description;
    private String logID;

    public Log(String logID, String description) {
        this.timestamp = Instant.now();
        this.description = description;
        this.logID = logID;
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
}
