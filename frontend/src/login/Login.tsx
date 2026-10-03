import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CalendarCheck, TrendingUp, GraduationCap, ShieldCheck, User, Lock } from 'lucide-react';
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

      if (data.token || data.syncToken) {
        localStorage.setItem('session_token', data.token || data.syncToken);
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
        <source src="/v1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark gradient overlay to ensure readability */}
      <div className="video-overlay"></div>

      <div className="content-wrapper">

        {/* Left Side: Branding & Marketing */}
        <div className="marketing-side">
          <div className="brand-logo">
            <div className="brand-badge">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="premium-icon" aria-hidden="true">
                <defs>
                  <linearGradient id="premium-gold" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FEF3C7" />
                    <stop offset="0.4" stopColor="#FBBF24" />
                    <stop offset="1" stopColor="#B45309" />
                  </linearGradient>
                </defs>
                <path d="M2.5 8.5L7 12L12 5L17 12L21.5 8.5L19.5 17H4.5L2.5 8.5Z" fill="url(#premium-gold)" stroke="#FDE68A" strokeWidth="0.6" strokeLinejoin="round" />
                <rect x="4.5" y="18.5" width="15" height="2" rx="1" fill="url(#premium-gold)" />
                <circle cx="2.5" cy="8.5" r="1.3" fill="#FEF3C7" />
                <circle cx="12" cy="5" r="1.3" fill="#FEF3C7" />
                <circle cx="21.5" cy="8.5" r="1.3" fill="#FEF3C7" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-name">Source Code</span>
              <span className="brand-tagline">Student Portal</span>
            </div>
          </div>


          <div className="marketing-text">
            <h1>Every class counted.<span className="gradient-text">Every mark, clearly yours.</span></h1>
            <p>Your attendance, internal marks and academic record, always one tap away.</p>

            <ul className="feature-list">
              <li><CalendarCheck size={18} /><span>Live attendance</span></li>
              <li><TrendingUp size={18} /><span>Marks &amp; progress</span></li>
              <li><GraduationCap size={18} /><span>Academic details</span></li>
            </ul>
          </div>
        </div>

        {/* Right Side: Glassmorphism Login Form */}
        <div className="form-side">
          <div className="glass-panel">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to view your attendance and academic details.</p>
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Username</label>
                <div className="input-wrap">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="secure-note"><ShieldCheck size={14} /> Your credentials are sent securely and never stored.</p>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;