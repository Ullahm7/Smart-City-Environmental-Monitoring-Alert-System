import { useNavigate, useLocation } from 'react-router-dom';
import ScemasLogo from './ScemasLogo.jsx';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/region', label: 'Regions', icon: '🏙️' },
        { path: '/sensor', label: 'Sensors', icon: '📡' },
        { path: '/alert', label: 'Alerts', icon: '⚠️' },
        { path: '/audit', label: 'Audit Logs', icon: '📝' },
    ];

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        // Clear any auth tokens/session data if needed
        navigate('/landing');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
                <span className="brand-icon"><ScemasLogo size={34} /></span>
                <span className="brand-text">SCEMAS</span>
            </div>

            <div className="navbar-links">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="navbar-actions">
                <div className="user-info">
                    <div className="user-avatar">CO</div>
                    <span className="user-name">City Official</span>
                </div>
                <button className="btn-logout" onClick={handleLogout} title="Logout">
                    🚪 Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
