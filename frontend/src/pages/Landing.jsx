import { useNavigate } from 'react-router-dom';
import './Landing.css';

function LandingPage() {
    const navigate = useNavigate();
    
    return (
        <div className="landing-container">
            <header className="landing-header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo-mark">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                {/* City buildings skyline */}
                                <rect x="8" y="28" width="8" height="14" fill="#1e40af"/>
                                <rect x="18" y="20" width="8" height="22" fill="#1e40af"/>
                                <rect x="28" y="24" width="8" height="18" fill="#1e40af"/>
                                <rect x="38" y="30" width="6" height="12" fill="#1e40af" opacity="0.7"/>
                                
                                {/* Windows */}
                                <rect x="10" y="30" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="13" y="30" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="10" y="34" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="13" y="34" width="1.5" height="2" fill="white" opacity="0.4"/>
                                
                                <rect x="20" y="24" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="23" y="24" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="20" y="28" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="23" y="28" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="20" y="32" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="23" y="32" width="1.5" height="2" fill="white" opacity="0.4"/>
                                
                                <rect x="30" y="27" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="33" y="27" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="30" y="32" width="1.5" height="2" fill="white" opacity="0.4"/>
                                <rect x="33" y="32" width="1.5" height="2" fill="white" opacity="0.4"/>
                                
                                {/* Sensor monitoring points */}
                                <circle cx="12" cy="26" r="2.5" fill="#60a5fa"/>
                                <circle cx="22" cy="18" r="2.5" fill="#60a5fa"/>
                                <circle cx="32" cy="22" r="2.5" fill="#60a5fa"/>
                                
                                {/* Connection lines */}
                                <line x1="12" y1="26" x2="22" y2="18" stroke="#60a5fa" strokeWidth="1" opacity="0.5"/>
                                <line x1="22" y1="18" x2="32" y2="22" stroke="#60a5fa" strokeWidth="1" opacity="0.5"/>
                                
                                {/* Ground line */}
                                <line x1="6" y1="42" x2="44" y2="42" stroke="#1e40af" strokeWidth="2"/>
                            </svg>
                        </div>
                        <div className="title-group">
                            <h1 className="system-title">SCEMAS</h1>
                            <div className="system-id">Smart City Environmental Monitoring</div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="btn-header" onClick={() => navigate('/login')}>
                            Operator Login
                        </button>
                    </div>
                </div>
            </header>

            <main className="landing-main">
                <section className="hero-section">
                    <div className="hero-content">
                        <div className="hero-text">
                            <div className="hero-label">IoT-Enabled Environmental Intelligence</div>
                            
                            <h2 className="hero-title">
                                Monitor Air Quality & Environmental Data Across Your City
                            </h2>
                            
                            <p className="hero-description">
                                SCEMAS is a cloud-native IoT platform that transforms environmental sensor 
                                data into actionable intelligence. Track air quality, noise levels, temperature, 
                                and humidity with real-time alerts and comprehensive analytics.
                            </p>
                            
                            <div className="cta-section">
                                <button 
                                    className="btn btn-primary" 
                                    onClick={() => navigate('/login')}
                                >
                                    Access Dashboard
                                </button>
                                <button 
                                    className="btn btn-outline" 
                                    onClick={() => navigate('/login')}
                                >
                                    Request Access
                                </button>
                            </div>
                        </div>

                        <div className="hero-image">
                            <div className="dashboard-mockup">
                                <svg width="100%" height="100%" viewBox="0 0 600 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* Dashboard Background */}
                                    <rect width="600" height="450" fill="#1e40af"/>
                                    
                                    {/* Header Bar */}
                                    <rect width="600" height="50" fill="#1e3a8a"/>
                                    <circle cx="20" cy="25" r="6" fill="#60a5fa" opacity="0.6"/>
                                    <circle cx="40" cy="25" r="6" fill="#60a5fa" opacity="0.6"/>
                                    <circle cx="60" cy="25" r="6" fill="#60a5fa" opacity="0.6"/>
                                    
                                    {/* Metric Cards */}
                                    <rect x="20" y="70" width="130" height="80" rx="8" fill="white" opacity="0.15"/>
                                    <rect x="170" y="70" width="130" height="80" rx="8" fill="white" opacity="0.15"/>
                                    <rect x="320" y="70" width="130" height="80" rx="8" fill="white" opacity="0.15"/>
                                    <rect x="470" y="70" width="110" height="80" rx="8" fill="white" opacity="0.15"/>
                                    
                                    {/* Chart Area - Line Graph */}
                                    <rect x="20" y="170" width="350" height="250" rx="8" fill="white" opacity="0.1"/>
                                    <polyline 
                                        points="40,350 80,320 120,340 160,300 200,310 240,280 280,290 320,260 350,270" 
                                        stroke="white" 
                                        strokeWidth="3" 
                                        fill="none"
                                        opacity="0.8"
                                    />
                                    <polyline 
                                        points="40,360 80,350 120,360 160,340 200,350 240,330 280,340 320,320 350,330" 
                                        stroke="#60a5fa" 
                                        strokeWidth="2" 
                                        fill="none"
                                        opacity="0.6"
                                    />
                                    
                                    {/* Map Area */}
                                    <rect x="390" y="170" width="190" height="160" rx="8" fill="white" opacity="0.1"/>
                                    <circle cx="485" cy="240" r="30" stroke="white" strokeWidth="2" opacity="0.3"/>
                                    <circle cx="485" cy="240" r="20" stroke="white" strokeWidth="2" opacity="0.4"/>
                                    <circle cx="485" cy="240" r="10" stroke="white" strokeWidth="2" opacity="0.5"/>
                                    <circle cx="460" cy="220" r="4" fill="#60a5fa"/>
                                    <circle cx="510" cy="235" r="4" fill="#60a5fa"/>
                                    <circle cx="490" cy="265" r="4" fill="#60a5fa"/>
                                    <circle cx="470" cy="250" r="4" fill="white"/>
                                    
                                    {/* Bar Chart */}
                                    <rect x="390" y="350" width="190" height="70" rx="8" fill="white" opacity="0.1"/>
                                    <rect x="410" y="390" width="30" height="20" fill="white" opacity="0.6"/>
                                    <rect x="450" y="380" width="30" height="30" fill="white" opacity="0.7"/>
                                    <rect x="490" y="370" width="30" height="40" fill="white" opacity="0.8"/>
                                    <rect x="530" y="385" width="30" height="25" fill="white" opacity="0.6"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Stats */}
                <div className="stats-container">
                    <div className="stat-box">
                        <div className="stat-header">Telemetry Protocol</div>
                        <div className="stat-main">MQTT</div>
                        <div className="stat-meta">TLS encrypted</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-header">Data Aggregation</div>
                        <div className="stat-main">5-min</div>
                        <div className="stat-meta">Zone averages</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-header">Alert Engine</div>
                        <div className="stat-main">Real-time</div>
                        <div className="stat-meta">Rule-based</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-header">Public API</div>
                        <div className="stat-main">REST</div>
                        <div className="stat-meta">Rate-limited</div>
                    </div>
                </div>

                <section className="features-section">
                    <div className="features-container">
                        <div className="section-header">
                            <div className="section-label">Platform Capabilities</div>
                            <h2 className="section-title">Comprehensive Environmental Monitoring</h2>
                            <p className="section-subtitle">
                                From sensor data ingestion to public API access, SCEMAS provides 
                                end-to-end environmental intelligence for smart cities.
                            </p>
                        </div>
                        
                        <div className="features-layout">
                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="2.5"/>
                                        <circle cx="16" cy="16" r="3" fill="white"/>
                                        <line x1="16" y1="6" x2="16" y2="10" stroke="white" strokeWidth="2"/>
                                        <line x1="16" y1="22" x2="16" y2="26" stroke="white" strokeWidth="2"/>
                                        <line x1="6" y1="16" x2="10" y2="16" stroke="white" strokeWidth="2"/>
                                        <line x1="22" y1="16" x2="26" y2="16" stroke="white" strokeWidth="2"/>
                                    </svg>
                                </div>
                                <h3 className="feature-title">IoT Sensor Network</h3>
                                <p className="feature-text">
                                    Distributed sensors monitoring air quality (PM2.5, PM10), noise levels, 
                                    temperature, and humidity. MQTT protocol with TLS encryption ensures 
                                    secure, high-volume telemetry ingestion.
                                </p>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2.5"/>
                                        <path d="M16 8L16 16L22 20" stroke="white" strokeWidth="2.5"/>
                                        <circle cx="16" cy="16" r="2" fill="white"/>
                                    </svg>
                                </div>
                                <h3 className="feature-title">Intelligent Alert Engine</h3>
                                <p className="feature-text">
                                    Configurable rule-based alerting evaluates sensor data against thresholds 
                                    in near real-time. Automatic notifications for pollution events, heatwaves, 
                                    and environmental anomalies.
                                </p>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <rect x="4" y="4" width="24" height="24" stroke="white" strokeWidth="2.5"/>
                                        <path d="M4 12 L28 12" stroke="white" strokeWidth="2"/>
                                        <path d="M10 4 L10 28" stroke="white" strokeWidth="2"/>
                                        <circle cx="16" cy="18" r="3" fill="white"/>
                                        <circle cx="22" cy="8" r="2" fill="white"/>
                                    </svg>
                                </div>
                                <h3 className="feature-title">Geospatial Dashboards</h3>
                                <p className="feature-text">
                                    Real-time visualizations with geographical maps showing sensor locations, 
                                    zone-based aggregation, and historical trend analysis. Designed for rapid 
                                    alert acknowledgment.
                                </p>
                            </div>

                            <div className="feature-item">
                                <div className="feature-icon">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                        <rect x="6" y="10" width="20" height="16" stroke="white" strokeWidth="2.5"/>
                                        <path d="M6 14 L26 14" stroke="white" strokeWidth="2"/>
                                        <circle cx="10" cy="12" r="1.5" fill="white"/>
                                        <circle cx="14" cy="12" r="1.5" fill="white"/>
                                        <circle cx="18" cy="12" r="1.5" fill="white"/>
                                        <line x1="10" y1="18" x2="22" y2="18" stroke="white" strokeWidth="2"/>
                                        <line x1="10" y1="22" x2="18" y2="22" stroke="white" strokeWidth="2"/>
                                    </svg>
                                </div>
                                <h3 className="feature-title">Public Data API</h3>
                                <p className="feature-text">
                                    REST API providing aggregated environmental data to third-party developers 
                                    and public displays. Privacy-by-design with zone-level aggregation and 
                                    rate-limiting protection.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="notice-section">
                    <div className="notice-frame">
                        <div className="notice-tag">Restricted Access</div>
                        <h4 className="notice-title">Role-Based Access Control</h4>
                        <p className="notice-text">
                            The operator dashboard is restricted to authorized city personnel and system 
                            administrators. All access attempts are logged. Public environmental data is 
                            available through our REST API.
                        </p>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="footer-grid">
                    <div className="footer-col">
                        <div className="footer-logo">SCEMAS</div>
                        <p className="footer-tagline">Environmental monitoring for smart cities.</p>
                    </div>
                    <div className="footer-col">
                        <div className="footer-heading">Documentation</div>
                        <a href="#" className="footer-link">Operator Guide</a>
                        <a href="#" className="footer-link">Public API Docs</a>
                        <a href="#" className="footer-link">MQTT Protocol</a>
                    </div>
                    <div className="footer-col">
                        <div className="footer-heading">Resources</div>
                        <a href="#" className="footer-link">Air Quality Index</a>
                        <a href="#" className="footer-link">Data Privacy</a>
                        <a href="#" className="footer-link">System Status</a>
                    </div>
                    <div className="footer-col">
                        <div className="footer-heading">Support</div>
                        <a href="#" className="footer-link">Technical Support</a>
                        <a href="#" className="footer-link">Report Issue</a>
                        <a href="#" className="footer-link">Contact</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 SCEMAS - Smart City Environmental Monitoring & Alert System. McMaster University SE3A04.</p>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;