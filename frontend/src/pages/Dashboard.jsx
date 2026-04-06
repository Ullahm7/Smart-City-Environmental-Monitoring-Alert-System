
//trying this to run some fixes
export default function Dashboard() {
    // Grab the username we saved during the dummy login
    const role = localStorage.getItem('userRole');

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>SCEMAS System Dashboard</h1>
            <p>Welcome! You are logged in as: <strong>{role}</strong></p>
            <p>Sensor data will appear here shortly.</p>
        </div>
    );
}