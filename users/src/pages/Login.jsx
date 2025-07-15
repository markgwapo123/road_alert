import React, { useState, useEffect } from 'react';
import axios from 'axios';

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
};

const Login = ({ onLogin, switchToRegister }) => {
  const [loginId, setLoginId] = useState(''); // can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Only allow Gmail addresses
    if (!loginId.includes('@gmail.com')) {
      setError('Only Gmail addresses are allowed for login.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', {
        email: loginId.trim(),
        password
      }, {
        timeout: 5000
      });
      onLogin(res.data.token);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Network Error'))) {
        setError('Cannot connect to server. Please ensure the backend is running on port 3001.');
      } else if (err.response?.status === 401) {
        setError('Invalid Gmail or password');
      } else if (err.response?.status === 404) {
        setError('User not found. Please register first.');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <button className="theme-toggle" onClick={handleThemeToggle} title="Toggle theme">
        {theme === 'dark' ? '🌞' : '🌙'}
      </button>
      
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">🚨</div>
          <h1 className="auth-logo-text">
            <span className="brand-name">Road</span><span className="brand-suffix">Alert</span>
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="loginId"
                type="email"
                placeholder="Email address"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="form-options">
            <button type="button" className="forgot-password">
              Forgot Password
            </button>
            <span className="public-computer">Public Computer?</span>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>

        <div className="new-user-section">
          <button type="button" onClick={switchToRegister} className="new-user-button">
            New User? Activate your account
          </button>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-content">
          <div className="device-mockup">
            <img src="/mockup-laptop-phone.png" alt="RoadAlert Dashboard on laptop and phone" className="device-mockup-img" />
          </div>
          <h2 className="marketing-title">Introducing Incident Response</h2>
        </div>
      </div>
    </div>
  );
};

export default Login;
