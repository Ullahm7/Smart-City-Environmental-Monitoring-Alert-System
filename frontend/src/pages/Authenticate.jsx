import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Authenticate() {
    // This state controls whether the user sees the Login or Register form
    const [isRegistering, setIsRegistering] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        // Prevents the browser from refreshing the page when you hit submit
        e.preventDefault();
        
        // Dummy authentication - instantly "logs in" the user
        localStorage.setItem('userRole', 'Admin'); 
        
        // NEW: Store a dummy user ID for your teammate's audit logs
        localStorage.setItem('userId', '101'); 
        
        // Teleport to the dashboard
        navigate('/dashboard');
    };

    return (
        <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center' }}>
                {isRegistering ? 'Register for SCEMAS' : 'Login to SCEMAS'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <input 
                    type="text" 
                    placeholder="Username" 
                    required 
                    style={{ padding: '10px', fontSize: '16px' }} 
                />
                
                <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    style={{ padding: '10px', fontSize: '16px' }} 
                />
                
                {/* This field only appears if isRegistering is true */}
                {isRegistering && (
                    <input 
                        type="password" 
                        placeholder="Confirm Password" 
                        required 
                        style={{ padding: '10px', fontSize: '16px' }} 
                    />
                )}

                <button type="submit" style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
                    {isRegistering ? 'Create Account' : 'Login'}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {/* This button flips the state between true and false */}
                <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' }}
                >
                    {isRegistering 
                        ? 'Already have an account? Login here.' 
                        : "Don't have an account? Register here."}
                </button>
            </div>
        </div>
    );
}