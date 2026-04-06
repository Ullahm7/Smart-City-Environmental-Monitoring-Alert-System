import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    
    // State for real data from APIs
    const [overview, setOverview] = useState({
        totalSensors: 0,
        totalRegions: 0,
        activeAlerts: 0,
        totalAlertRules: 0
    });
    const [regions, setRegions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAllData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchAllData() {
        setLoading(true);
        setError('');
        try {
            // Fetch dashboard data from backend
            const [overviewRes, regionsDataRes, alertsRes, statsRes] = await Promise.all([
                fetch('http://localhost:8888/api/dashboard/overview'),
                fetch('http://localhost:8888/api/dashboard/regions-data'),
                fetch('http://localhost:8888/api/alerts/history?status=ACTIVE'),
                fetch('http://localhost:8888/api/dashboard/stats'),
            ]);

            if (overviewRes.ok) {
                const overviewData = await overviewRes.json();
                setOverview(overviewData);
            }

            if (regionsDataRes.ok) {
                const regionsData = await regionsDataRes.json();
                setRegions(regionsData);
            }

            if (alertsRes.ok) {
                const alertsData = await alertsRes.json();
                // Sort by timestamp descending and take top 5
                setAlerts([...alertsData].sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                ).slice(0, 5));
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
        } catch (e) {
            setError(e.message);
            console.error('Error fetching dashboard data:', e);
        } finally {
            setLoading(false);
        }
    }

    // Add real AQI calculation based on sensor data
    const regionsWithAQI = regions.map(region => {
        // Calculate real AQI from sensor data if available
        let aqi = 0;
        let status = 'good';
        
        if (region.sensorData && region.sensorData.length > 0) {
            // Find AIR_QUALITY sensor data
            const airQualityData = region.sensorData.find(d => d.type === 'AIR_QUALITY');
            
            if (airQualityData && airQualityData.data) {
                // Use the actual air quality reading as AQI
                aqi = Math.round(airQualityData.data);
                
                // Determine status based on AQI
                if (aqi <= 50) status = 'good';
                else if (aqi <= 100) status = 'moderate';
                else if (aqi <= 150) status = 'unhealthy';
                else status = 'hazardous';
            } else {
                // No air quality data, use average of all sensor readings
                const avgReading = region.sensorData.reduce((sum, d) => sum + (d.data || 0), 0) / region.sensorData.length;
                aqi = Math.round(avgReading);
                status = aqi <= 50 ? 'good' : aqi <= 100 ? 'moderate' : 'unhealthy';
            }
        } else {
            // No sensor data available, show as unknown
            aqi = 0;
            status = 'unknown';
        }
        
        return {
            ...region,
            aqi,
            status
        };
    });

    // Helper to get sensor type icon and unit
    const getSensorTypeInfo = (type) => {
        const typeMap = {
            'AIR_QUALITY': { icon: '💨', label: 'Air Quality', unit: 'AQI', color: '#3b82f6' },
            'TEMPERATURE': { icon: '🌡️', label: 'Temperature', unit: '°C', color: '#ef4444' },
            'HUMIDITY': { icon: '💧', label: 'Humidity', unit: '%', color: '#06b6d4' },
            'NOISE': { icon: '🔊', label: 'Noise', unit: 'dB', color: '#8b5cf6' },
            'UV_INDEX': { icon: '☀️', label: 'UV Index', unit: '', color: '#f59e0b' },
            'RAINFALL': { icon: '🌧️', label: 'Rainfall', unit: 'mm', color: '#0ea5e9' },
            'WIND': { icon: '💨', label: 'Wind Speed', unit: 'km/h', color: '#10b981' },
        };
        return typeMap[type] || { icon: '📊', label: type, unit: '', color: '#6b7280' };
    };

    const getAQIColor = (aqi) => {
        if (aqi <= 50) return '#10b981'; // green
        if (aqi <= 100) return '#f59e0b'; // yellow
        if (aqi <= 150) return '#ef4444'; // red
        return '#991b1b'; // dark red
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '';
        const now = new Date();
        const time = new Date(ts);
        const diff = Math.floor((now - time) / 1000 / 60);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return time.toLocaleDateString();
    };

    const getAlertType = (alert) => {
        // Determine severity based on how much threshold was exceeded
        const diff = Math.abs(alert.triggeringValue - alert.threshold);
        const percentOver = (diff / alert.threshold) * 100;
        if (percentOver > 50) return 'critical';
        if (percentOver > 20) return 'warning';
        return 'info';
    };

    // Center map on first region or default
    const mapCenter = regions.length > 0 && regions[0].coordinates
        ? [(regions[0].coordinates.minLat + regions[0].coordinates.maxLat) / 2,
           (regions[0].coordinates.minLon + regions[0].coordinates.maxLon) / 2]
        : [43.2609, -79.9192]; // Hamilton, ON default

    return (
        <div className="dashboard-container">
            {error && <div className="error-banner">{error}</div>}

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/sensor')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon sensors">📡</div>
                    <div className="stat-content">
                        <div className="stat-value">{overview.totalSensors}</div>
                        <div className="stat-label">Total Sensors</div>
                        <div className="stat-meta">{overview.totalSensors} active</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => navigate('/region')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon regions">🏙️</div>
                    <div className="stat-content">
                        <div className="stat-value">{overview.totalRegions}</div>
                        <div className="stat-label">Regions</div>
                        <div className="stat-meta">Under monitoring</div>
                    </div>
                </div>
                <div className="stat-card alert-card" onClick={() => navigate('/alert')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon alerts">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{overview.activeAlerts}</div>
                        <div className="stat-label">Active Alerts</div>
                        <div className="stat-meta">Requires attention</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => navigate('/audit')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon data">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">{overview.totalAlertRules}</div>
                        <div className="stat-label">Alert Rules</div>
                        <div className="stat-meta">Configured</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Map Section */}
                <div className="dashboard-card map-card">
                    <div className="card-header">
                        <h2>City Map - Regional View</h2>
                        <button className="btn-link" onClick={() => navigate('/region')}>
                            Manage Regions →
                        </button>
                    </div>
                    <div className="map-container">
                        {regions.length > 0 ? (
                            <MapContainer
                                center={mapCenter}
                                zoom={11}
                                style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {regionsWithAQI.map(region => {
                                    if (!region.coordinates) return null;
                                    const bounds = [
                                        [region.coordinates.minLat, region.coordinates.minLon],
                                        [region.coordinates.maxLat, region.coordinates.maxLon]
                                    ];
                                    return (
                                        <Rectangle
                                            key={region.regionID}
                                            bounds={bounds}
                                            pathOptions={{
                                                color: getAQIColor(region.aqi),
                                                weight: 2,
                                                fillOpacity: 0.3
                                            }}
                                        >
                                            <Popup>
                                                <div style={{ padding: '8px', minWidth: '200px' }}>
                                                    <strong>{region.regionName}</strong><br/>
                                                    <div style={{ margin: '8px 0' }}>
                                                        <strong>AQI: {region.aqi}</strong> ({region.status})<br/>
                                                        Sensors: {region.sensorCount || 0}
                                                    </div>
                                                    {region.sensorData && region.sensorData.length > 0 && (
                                                        <div>
                                                            <strong>Latest Readings:</strong>
                                                            {region.sensorData.slice(0, 3).map((data, idx) => (
                                                                <div key={idx} style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                                                                    {data.type?.replace(/_/g, ' ')}: {data.data?.toFixed(2)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Rectangle>
                                    );
                                })}
                            </MapContainer>
                        ) : (
                            <div className="map-placeholder">
                                <p>No regions configured yet.</p>
                                <button className="btn-secondary" onClick={() => navigate('/region')}>
                                    Create Region
                                </button>
                            </div>
                        )}
                        {regions.length > 0 && (
                            <div className="map-legend">
                                <div className="legend-item">
                                    <span className="legend-dot good"></span> Good (0-50)
                                </div>
                                <div className="legend-item">
                                    <span className="legend-dot moderate"></span> Moderate (51-100)
                                </div>
                                <div className="legend-item">
                                    <span className="legend-dot unhealthy"></span> Unhealthy (101-150)
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="dashboard-card alerts-card">
                    <div className="card-header">
                        <h2>Active Alerts</h2>
                        <button className="btn-link" onClick={() => navigate('/alert')}>
                            View All →
                        </button>
                    </div>
                    <div className="alerts-list">
                        {loading && <p className="loading-text">Loading alerts...</p>}
                        {!loading && alerts.length === 0 && (
                            <p className="empty-state">No active alerts. All systems normal.</p>
                        )}
                        {alerts.map(alert => {
                            const region = regions.find(r => r.regionID === alert.region);
                            const alertType = getAlertType(alert);
                            return (
                                <div key={alert.id} className={`alert-item ${alertType}`}>
                                    <div className="alert-indicator"></div>
                                    <div className="alert-content">
                                        <div className="alert-header">
                                            <span className="alert-region">
                                                {region ? region.regionName : alert.region.slice(0, 8)}
                                            </span>
                                            <span className="alert-time">{formatTimestamp(alert.timestamp)}</span>
                                        </div>
                                        <div className="alert-message">
                                            {alert.ruleName}: {alert.type?.replace(/_/g, ' ')} {alert.condition?.replace(/_/g, ' ')} {alert.threshold}
                                            (Current: {alert.triggeringValue?.toFixed(2)})
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button className="btn-secondary" onClick={() => navigate('/alert')}>
                        Manage Alerts
                    </button>
                </div>

                {/* Regional Sensor Data - Shows all sensor types per region */}
                <div className="dashboard-card regions-sensors-card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <h2>Regional Sensor Readings</h2>
                        <button className="btn-link" onClick={() => navigate('/region')}>
                            Manage →
                        </button>
                    </div>
                    <div className="regions-sensors-container">
                        {loading && <p className="loading-text">Loading regions...</p>}
                        {!loading && regionsWithAQI.length === 0 && (
                            <p className="empty-state">No regions created yet.</p>
                        )}
                        {!loading && regionsWithAQI.map(region => (
                            <div key={region.regionID} className="region-sensor-section">
                                <div className="region-section-header">
                                    <h3>{region.regionName}</h3>
                                    <span className="region-meta">{region.sensorCount || 0} sensors active</span>
                                </div>
                                <div className="sensor-readings-grid">
                                    {region.sensorData && region.sensorData.length > 0 ? (
                                        region.sensorData.map((data, idx) => {
                                            const typeInfo = getSensorTypeInfo(data.type);
                                            return (
                                                <div key={idx} className="sensor-reading-card" style={{ borderLeftColor: typeInfo.color }}>
                                                    <div className="sensor-reading-header">
                                                        <span className="sensor-icon">{typeInfo.icon}</span>
                                                        <span className="sensor-label">{typeInfo.label}</span>
                                                    </div>
                                                    <div className="sensor-reading-value">
                                                        {data.data?.toFixed(2)} <span className="sensor-unit">{typeInfo.unit}</span>
                                                    </div>
                                                    <div className="sensor-reading-time">
                                                        {formatTimestamp(data.timestamp)}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                            No sensor data available for this region
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sensors Summary */}
                <div className="dashboard-card data-card">
                    <div className="card-header">
                        <h2>Sensor Summary</h2>
                        <button className="btn-link" onClick={() => navigate('/sensor')}>
                            Manage Sensors →
                        </button>
                    </div>
                    <div className="sensors-summary">
                        {loading && <p className="loading-text">Loading data...</p>}
                        {!loading && overview.totalSensors === 0 && (
                            <p className="empty-state">No sensors registered yet.</p>
                        )}
                        {!loading && overview.totalSensors > 0 && (
                            <>
                                <div className="summary-stat">
                                    <div className="summary-label">Total Sensors</div>
                                    <div className="summary-value">{overview.totalSensors}</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="summary-label">Regions Covered</div>
                                    <div className="summary-value">{overview.totalRegions}</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="summary-label">Active Alerts</div>
                                    <div className="summary-value">{overview.activeAlerts}</div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="data-timestamp">
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;