import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

function Dashboard() {
    const navigate = useNavigate();
    
    // State for real data from APIs
    const [sensors, setSensors] = useState([]);
    const [regions, setRegions] = useState([]);
    const [alerts, setAlerts] = useState([]);
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
            // Fetch all data in parallel
            const [sensorsRes, regionsRes, alertsRes] = await Promise.all([
                fetch('/api/sensor'),
                fetch('/api/region'),
                fetch('/api/alert/history?status=ACTIVE'),
            ]);

            if (sensorsRes.ok) {
                const sensorsData = await sensorsRes.json();
                setSensors(sensorsData);
            }

            if (regionsRes.ok) {
                const regionsData = await regionsRes.json();
                setRegions(regionsData);
            }

            if (alertsRes.ok) {
                const alertsData = await alertsRes.json();
                // Sort by timestamp descending
                setAlerts([...alertsData].sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                ).slice(0, 5)); // Show only top 5
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // Calculate stats from real data
    const stats = {
        totalSensors: sensors.length,
        activeSensors: sensors.length, // Could add status field to sensors
        regions: regions.length,
        activeAlerts: alerts.filter(a => a.status === 'ACTIVE').length
    };

    // Calculate AQI for each region (mock for now, would need aggregated sensor data)
    const regionsWithAQI = regions.map(region => {
        // Count sensors in this region
        const regionSensors = sensors.filter(s => s.region === region.regionID);
        // Mock AQI calculation - in real app would aggregate from sensor data
        const mockAQI = Math.floor(Math.random() * 150);
        return {
            ...region,
            sensors: regionSensors.length,
            aqi: mockAQI,
            status: mockAQI <= 50 ? 'good' : mockAQI <= 100 ? 'moderate' : 'unhealthy'
        };
    });

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
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>Environmental Dashboard</h1>
                    <p className="header-subtitle">Real-time monitoring • City-wide coverage</p>
                </div>
                <div className="header-right">
                    <button className="btn-refresh" onClick={fetchAllData}>
                        ↻ Refresh
                    </button>
                    <div className="user-profile">
                        <div className="user-avatar">CO</div>
                        <span>City Official</span>
                    </div>
                </div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/sensors')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon sensors">📡</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalSensors}</div>
                        <div className="stat-label">Total Sensors</div>
                        <div className="stat-meta">{stats.activeSensors} active</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => navigate('/regions')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon regions">🏙️</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.regions}</div>
                        <div className="stat-label">Regions</div>
                        <div className="stat-meta">Under monitoring</div>
                    </div>
                </div>
                <div className="stat-card alert-card" onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon alerts">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.activeAlerts}</div>
                        <div className="stat-label">Active Alerts</div>
                        <div className="stat-meta">Requires attention</div>
                    </div>
                </div>
                <div className="stat-card" onClick={() => navigate('/audit')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon data">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">98.7%</div>
                        <div className="stat-label">System Uptime</div>
                        <div className="stat-meta">Last 30 days</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Map Section */}
                <div className="dashboard-card map-card">
                    <div className="card-header">
                        <h2>City Map - Regional View</h2>
                        <button className="btn-link" onClick={() => navigate('/regions')}>
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
                                                <div style={{ padding: '4px' }}>
                                                    <strong>{region.regionName}</strong><br/>
                                                    AQI: {region.aqi} ({region.status})<br/>
                                                    Sensors: {region.sensors}
                                                </div>
                                            </Popup>
                                        </Rectangle>
                                    );
                                })}
                            </MapContainer>
                        ) : (
                            <div className="map-placeholder">
                                <p>No regions configured yet.</p>
                                <button className="btn-secondary" onClick={() => navigate('/regions')}>
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
                        <button className="btn-link" onClick={() => navigate('/alerts')}>
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
                    <button className="btn-secondary" onClick={() => navigate('/alerts')}>
                        Manage Alerts
                    </button>
                </div>

                {/* Regions List */}
                <div className="dashboard-card regions-card">
                    <div className="card-header">
                        <h2>Your Regions</h2>
                        <button className="btn-link" onClick={() => navigate('/regions')}>
                            Manage →
                        </button>
                    </div>
                    <div className="regions-list">
                        {loading && <p className="loading-text">Loading regions...</p>}
                        {!loading && regionsWithAQI.length === 0 && (
                            <p className="empty-state">No regions created yet.</p>
                        )}
                        {regionsWithAQI.map(region => (
                            <div key={region.regionID} className="region-item">
                                <div className="region-info">
                                    <div className="region-name">{region.regionName}</div>
                                    <div className="region-sensors">{region.sensors} sensors</div>
                                </div>
                                <div className="region-aqi">
                                    <div 
                                        className="aqi-badge"
                                        style={{ backgroundColor: getAQIColor(region.aqi) }}
                                    >
                                        {region.aqi}
                                    </div>
                                    <div className="aqi-status">{region.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sensors Summary */}
                <div className="dashboard-card data-card">
                    <div className="card-header">
                        <h2>Sensor Summary</h2>
                        <button className="btn-link" onClick={() => navigate('/sensors')}>
                            Manage Sensors →
                        </button>
                    </div>
                    <div className="sensors-summary">
                        {loading && <p className="loading-text">Loading sensors...</p>}
                        {!loading && sensors.length === 0 && (
                            <p className="empty-state">No sensors registered yet.</p>
                        )}
                        {!loading && sensors.length > 0 && (
                            <>
                                <div className="summary-stat">
                                    <div className="summary-label">Total Sensors</div>
                                    <div className="summary-value">{sensors.length}</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="summary-label">Regions Covered</div>
                                    <div className="summary-value">
                                        {new Set(sensors.map(s => s.region)).size}
                                    </div>
                                </div>
                                <div className="sensor-list-preview">
                                    <div className="preview-label">Recent Sensors:</div>
                                    {sensors.slice(0, 5).map(sensor => (
                                        <div key={sensor.id} className="sensor-preview-item">
                                            <span className="sensor-name">{sensor.name}</span>
                                            <span className="sensor-id">{sensor.id.slice(0, 8)}...</span>
                                        </div>
                                    ))}
                                    {sensors.length > 5 && (
                                        <div className="preview-more">
                                            +{sensors.length - 5} more
                                        </div>
                                    )}
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