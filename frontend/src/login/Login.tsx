import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import studyBg from '../assets/study-bg.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If credentials exist, auto-login by jumping straight to the dashboard.
    // Dashboard will load from local cache and sync in the background.
    const savedCreds = localStorage.getItem('academia_credentials');
    if (savedCreds) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/academia/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to sign in. Please check your credentials.');
        return;
      }

      // Save credentials and any data we got back
      localStorage.setItem('academia_credentials', JSON.stringify({ username: email, password }));
      if (!data.pending) {
        // Full data returned immediately — cache it
        localStorage.setItem('academia_data', JSON.stringify(data));
      }

      // Navigate to dashboard immediately. If pending=true, Dashboard will show
      // skeleton/cached data while the background scrape continues.
      navigate('/dashboard', { state: { data: data.pending ? null : data, pending: data.pending } });
    } catch (err) {
      setError('Network error. Make sure the backend server is running.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Left side: Beautiful image */}
      <div className="image-panel">
        <img src={studyBg} alt="Study Setup" className="background-img" />
        <div className="image-overlay">
          <div className="brand-logo">
            <div className="logo-mark"></div>
            <span>BrainMint</span>
          </div>
          <div className="image-content">
            <h1>Master your skills<br/>with the best platform.</h1>
            <p>Join thousands of students accessing world-class education from top universities and institutions.</p>
          </div>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="form-panel">
        <div className="form-container">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Please enter your details to sign in.</p>
          </div>
          
          <button className="social-login-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.7 16.69 5.82 14.11H2.15V16.96C3.96 20.55 7.69 23 12 23Z" fill="#34A853"/>
              <path d="M5.82 14.11C5.6 13.45 5.47 12.74 5.47 12C5.47 11.26 5.6 10.55 5.82 9.89V7.04H2.15C1.41 8.52 1 10.21 1 12C1 13.79 1.41 15.48 2.15 16.96L5.82 14.11Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.2 7.02L19.35 3.87C17.46 2.11 14.97 1 12 1C7.69 1 3.96 3.45 2.15 7.04L5.82 9.89C6.7 7.31 9.13 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="divider">
            <span>or sign in with email</span>
          </div>

          {error && (
            <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-actions">
              <label className="remember-me">
                <input type="checkbox" /> Remember for 30 days
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="login-footer">
            <p>Don't have an account? <a href="#">Sign up for free</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
