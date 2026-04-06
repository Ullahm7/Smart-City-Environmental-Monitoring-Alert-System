import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

const SENSOR_TYPES = [
    'AIR_QUALITY',
    'TEMPERATURE',
    'HUMIDITY',
    'NOISE',
    'UV_INDEX',
    'RAINFALL',
    'WIND',
];

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
    const [settings, setSettings] = useState({
        cityName: 'City Dashboard',
        logoUrl: '',
        primaryColor: '#3b82f6',
        secondaryColor: '#8b5cf6',
        accentColor: '#10b981'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsDraft, setSettingsDraft] = useState(null);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsError, setSettingsError] = useState('');
    const [trendType, setTrendType] = useState('AIR_QUALITY');
    const [trendMetric, setTrendMetric] = useState('avg');
    const [regionTrendData, setRegionTrendData] = useState({});
    const [trendLoading, setTrendLoading] = useState(false);
    const [trendError, setTrendError] = useState('');
    // userId — in a real auth setup this would come from a session/token
    const userId = 'default';

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary', settings.primaryColor);
        document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
        document.documentElement.style.setProperty('--accent', settings.accentColor);
    }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);

    useEffect(() => {
        fetchAggregatedTrendData();
    }, [regions, trendType, trendMetric]);

    async function fetchAllData() {
        setLoading(true);
        setError('');
        try {
            const [overviewRes, regionsDataRes, alertsRes, statsRes, settingsRes] = await Promise.all([
                fetch('/api/dashboard/overview'),
                fetch('/api/dashboard/regions-data'),
                fetch('/api/alerts/history?status=ACTIVE'),
                fetch('/api/dashboard/stats'),
                fetch(`/api/dashboard/settings/${userId}`),
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
                setAlerts([...alertsData].sort((a, b) =>
                    new Date(b.timestamp) - new Date(a.timestamp)
                ).slice(0, 5));
            }
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                setSettings(settingsData);
            }
        } catch (e) {
            setError(e.message);
            console.error('Error fetching dashboard data:', e);
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings() {
        setSettingsSaving(true);
        setSettingsError('');
        try {
            const res = await fetch(`/api/dashboard/settings/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsDraft),
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const updated = await res.json();
            setSettings(updated);
            setSettingsOpen(false);
        } catch (e) {
            setSettingsError('Failed to save: ' + e.message);
        } finally {
            setSettingsSaving(false);
        }
    }

    async function resetSettings() {
        setSettingsSaving(true);
        setSettingsError('');
        try {
            const res = await fetch(`/api/dashboard/settings/${userId}/reset`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const defaults = await res.json();
            setSettings(defaults);
            setSettingsDraft({ ...defaults });
        } catch (e) {
            setSettingsError('Failed to reset: ' + e.message);
        } finally {
            setSettingsSaving(false);
        }
    }

    function openSettings() {
        setSettingsDraft({ ...settings });
        setSettingsError('');
        setSettingsOpen(true);
    }

    async function fetchAggregatedTrendData() {
        if (regions.length === 0) {
            setRegionTrendData({});
            return;
        }

        setTrendLoading(true);
        setTrendError('');
        try {
            const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const entries = await Promise.all(regions.map(async (region) => {
                const params = new URLSearchParams({
                    region: region.regionID,
                    type: trendType,
                    metric: trendMetric,
                    start,
                });

                const res = await fetch(`/api/data/aggregated?${params.toString()}`);
                if (!res.ok) {
                    throw new Error(`${region.regionName} (${res.status})`);
                }

                const data = await res.json();
                const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                return [region.regionID, sorted];
            }));

            setRegionTrendData(Object.fromEntries(entries));
        } catch (e) {
            setTrendError(`Failed to load aggregated trend data: ${e.message}`);
        } finally {
            setTrendLoading(false);
        }
    }

    function renderTrendGraph(points, color) {
        if (!points || points.length === 0) {
            return <p className="trend-empty">No aggregated data available.</p>;
        }

        const width = 420;
        const height = 140;
        const pad = 14;
        const values = points.map((p) => Number(p.data ?? 0));
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = Math.max(maxValue - minValue, 1);

        const coords = points.map((point, index) => {
            const x = pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
            const y = height - pad - ((Number(point.data ?? 0) - minValue) / range) * (height - pad * 2);
            return [x, y];
        });

        const linePoints = coords.map(([x, y]) => `${x},${y}`).join(' ');
        const [lastX, lastY] = coords[coords.length - 1];

        return (
            <div className="trend-graph-wrap">
                <svg viewBox={`0 0 ${width} ${height}`} className="trend-graph" preserveAspectRatio="none">
                    <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" strokeWidth="1" />
                    <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.5" />
                    <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
                </svg>
                <div className="trend-latest">
                    Latest: <strong>{Number(points[points.length - 1].data ?? 0).toFixed(2)}</strong>
                </div>
            </div>
        );
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

    // Generate consistent color for each region based on regionID
    const getRegionColor = (regionID) => {
        const colors = [
            '#3b82f6', // blue
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#10b981', // green
            '#f59e0b', // orange
            '#ef4444', // red
            '#06b6d4', // cyan
            '#84cc16', // lime
        ];
        
        // Hash regionID to get consistent color index
        let hash = 0;
        for (let i = 0; i < regionID.length; i++) {
            hash = regionID.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
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

    const cssVars = {
        '--primary':   settings.primaryColor,
        '--secondary': settings.secondaryColor,
        '--accent':    settings.accentColor,
    };

    return (
        <div className="dashboard-container" style={cssVars}>

            {/* City header */}
            <div className="dashboard-header">
                <div className="header-left">
                    {settings.logoUrl && (
                        <img
                            src={settings.logoUrl}
                            alt="City logo"
                            className="city-logo"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <div>
                        <h1 className="city-title">{settings.cityName}</h1>
                        <p className="header-subtitle">Environmental Monitoring Dashboard</p>
                    </div>
                </div>
                <button className="btn-settings" onClick={openSettings}>
                    ⚙ Customize
                </button>
            </div>

            {/* Settings modal */}
            {settingsOpen && settingsDraft && (
                <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <div className="settings-modal-header">
                            <h2>Dashboard Settings</h2>
                            <button className="settings-close" onClick={() => setSettingsOpen(false)}>✕</button>
                        </div>
                        <div className="settings-body">
                            <label className="settings-label">
                                City / Organisation Name
                                <input
                                    className="settings-input"
                                    value={settingsDraft.cityName}
                                    onChange={e => setSettingsDraft({ ...settingsDraft, cityName: e.target.value })}
                                    placeholder="e.g. Hamilton Smart City"
                                />
                            </label>
                            <label className="settings-label">
                                Logo URL
                                <input
                                    className="settings-input"
                                    value={settingsDraft.logoUrl}
                                    onChange={e => setSettingsDraft({ ...settingsDraft, logoUrl: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                />
                            </label>
                            {settingsDraft.logoUrl && (
                                <div className="logo-preview">
                                    <img src={settingsDraft.logoUrl} alt="Logo preview"
                                        onError={e => { e.target.style.display = 'none'; }} />
                                </div>
                            )}
                            <div className="settings-colors">
                                {[
                                    { key: 'primaryColor',   label: 'Primary Color' },
                                    { key: 'secondaryColor', label: 'Secondary Color' },
                                    { key: 'accentColor',    label: 'Accent Color' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="settings-label">
                                        {label}
                                        <div className="color-row">
                                            <input type="color" className="settings-color-picker"
                                                value={settingsDraft[key]}
                                                onChange={e => setSettingsDraft({ ...settingsDraft, [key]: e.target.value })}
                                            />
                                            <input className="settings-input color-hex"
                                                value={settingsDraft[key]} maxLength={7}
                                                onChange={e => setSettingsDraft({ ...settingsDraft, [key]: e.target.value })}
                                            />
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="color-preview-bar">
                                <span style={{ background: settingsDraft.primaryColor }}   title="Primary" />
                                <span style={{ background: settingsDraft.secondaryColor }} title="Secondary" />
                                <span style={{ background: settingsDraft.accentColor }}    title="Accent" />
                            </div>
                        </div>
                        {settingsError && <p className="settings-err">{settingsError}</p>}
                        <div className="settings-footer">
                            <button className="btn-reset" onClick={resetSettings} disabled={settingsSaving}>
                                Reset to defaults
                            </button>
                            <div className="settings-footer-right">
                                <button className="btn-cancel" onClick={() => setSettingsOpen(false)} disabled={settingsSaving}>
                                    Cancel
                                </button>
                                <button className="btn-save" onClick={saveSettings} disabled={settingsSaving}
                                    style={{ background: settingsDraft.primaryColor }}>
                                    {settingsSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                    // FIX: explicitly set fillColor to match region color
                                    const regionColor = getRegionColor(region.regionID);
                                    return (
                                        <Rectangle
                                            key={region.regionID}
                                            bounds={bounds}
                                            pathOptions={{
                                                color: regionColor,
                                                fillColor: regionColor,
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
                                {regionsWithAQI.map(region => (
                                    <div key={region.regionID} className="legend-item">
                                        <span
                                            className="legend-dot"
                                            style={{ background: getRegionColor(region.regionID) }}
                                        ></span>
                                        {region.regionName}
                                    </div>
                                ))}
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
                            const regionColor = getRegionColor(alert.region);
                            return (
                                <div 
                                    key={alert.id} 
                                    className={`alert-item ${alertType}`}
                                    style={{ borderLeftColor: regionColor }}
                                >
                                    {/* FIX: inline style overrides the CSS class color so dot matches region */}
                                    <div
                                        className="alert-indicator"
                                        style={{ background: regionColor }}
                                    ></div>
                                    <div className="alert-content">
                                        <div className="alert-header">
                                            <span
                                                className="alert-region"
                                                style={{ color: regionColor }}
                                            >
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

                {/* Regional Sensor Data - Shows all sensor types per region 
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
                </div>*/}

                <div className="dashboard-card region-trends-card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header trends-header">
                        <h2>Regional Aggregated Trends</h2>
                        <div className="trend-controls">
                            <select value={trendType} onChange={(e) => setTrendType(e.target.value)}>
                                {SENSOR_TYPES.map((type) => (
                                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                            <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)}>
                                <option value="avg">Average</option>
                                <option value="max">Maximum</option>
                            </select>
                        </div>
                    </div>

                    {trendError && <div className="error-banner" style={{ marginBottom: '12px' }}>{trendError}</div>}
                    {trendLoading && <p className="loading-text">Loading aggregated trends...</p>}

                    <div className="region-trend-grid">
                        {!trendLoading && regionsWithAQI.map((region) => (
                            <div key={region.regionID} className="region-trend-card">
                                <div className="region-trend-header">
                                    <h3>{region.regionName}</h3>
                                    <span>{trendMetric.toUpperCase()} · {trendType.replace(/_/g, ' ')}</span>
                                </div>
                                {renderTrendGraph(regionTrendData[region.regionID] || [], getRegionColor(region.regionID))}
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