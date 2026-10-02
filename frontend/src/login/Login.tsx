import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import './Login.css';
import SplashScreen from '../dashboard/splash_screen/SplashScreen';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/academia/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password, forceSync: true }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to sign in. Please check your credentials.');
        return;
      }

      if (data.token) {
        localStorage.setItem('session_token', data.token);
      }
      
      // Fully secure: wipe out any old plain text storage
      localStorage.removeItem('academia_credentials');
      localStorage.removeItem('portal_password');

      localStorage.setItem('academia_data', JSON.stringify(data));

      navigate('/dashboard', { state: { data, pending: data.pending } });
    } catch (err) {
      setError('Network error. Make sure the backend server is running.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SplashScreen theme="dark" />;
  }

  return (
    <div className="unified-layout">
      {/* Full-screen Video Background */}
      <video className="background-video" autoPlay loop muted playsInline>
        <source src="/v2.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark gradient overlay to ensure readability */}
      <div className="video-overlay"></div>

      <div className="content-wrapper">

        {/* Left Side: Branding & Marketing */}
        <div className="marketing-side">
          <div className="brand-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="premium-icon">
              <path d="M3 16L4.5 4L12 10L19.5 4L21 16H3Z" fill="url(#premium-gold)" />
              <rect x="3" y="18" width="18" height="2.5" fill="url(#premium-gold)" />
              <defs>
                <linearGradient id="premium-gold" x1="3" y1="4" x2="21" y2="20.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FDE047" />
                  <stop offset="0.5" stopColor="#F59E0B" />
                  <stop offset="1" stopColor="#D97706" />
                </linearGradient>
              </defs>
            </svg>
            <span className="brand-name">Source Code</span>
          </div>

          <div className="marketing-text">
            <h1>Master your skills<br />with the best platform.</h1>
            <p>Join thousands of students accessing world-class education from top universities and institutions.</p>
          </div>
        </div>

        {/* Right Side: Glassmorphism Login Form */}
        <div className="form-side">
          <div className="glass-panel">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Please enter your details to sign in.</p>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Username</label>
                <input
                  type="text"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingRight: '40px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted, #757D8F)', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;