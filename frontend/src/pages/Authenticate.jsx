import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Authenticate() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Assuming Vert.x is running on 8888
            const res = await fetch('http://localhost:8888/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (data.success) {
                // Store the dummy credentials
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('authToken', data.token);
                // Redirect to the dashboard
                navigate('/dashboard'); 
            }
        } catch (error) {
            console.error("Login failed. Is the Vert.x server running?", error);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
            <h2>SCEMAS Operator Login</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                    style={{ padding: '10px' }}
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    style={{ padding: '10px' }}
                />
                <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Login</button>
            </form>
        </div>
    );
}