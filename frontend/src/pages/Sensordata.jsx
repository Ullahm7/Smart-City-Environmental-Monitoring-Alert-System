import { useState, useEffect } from 'react';

export default function SensorData() {
    const [readings, setReadings] = useState([]);
    const sensorId = "0129e12a-0cbe-4950-ab33-ab3817e14ab1"; // Use your actual ID

    useEffect(() => {
        // Fetch data every 5 seconds to match your simulator period
        const fetchData = async () => {
            try {
                const response = await fetch(`http://localhost:5173/api/sensors/${sensorId}/data`);
                const data = await response.json();
                setReadings(data);
            } catch (err) {
                console.error("Data fetch failed", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
            <h2>Live Sensor Telemetry <span style={{ color: 'red', fontSize: '14px' }}>● LIVE</span></h2>
            <p>Monitoring Sensor: <strong>{sensorId}</strong></p>
            
            <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4' }}>
                        <th>Timestamp</th>
                        <th>Reading Type</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {readings.length > 0 ? readings.map((r, i) => (
                        <tr key={i}>
                            <td>{new Date().toLocaleTimeString()}</td>
                            <td>Air Quality Index</td>
                            <td style={{ fontWeight: 'bold', color: r.value > 50 ? 'orange' : 'green' }}>
                                {r.value}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="3">Waiting for data from simulator...</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}