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

const Register = ({ onRegister, switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Password strength checker
  const checkPasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Enhanced validation
    if (!username.trim()) {
      setError('Please enter your username');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:3001/api/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password
      }, {
        timeout: 5000
      });
      if (res.data.token) {
        onRegister(res.data.token);
      } else {
        onRegister();
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Network Error'))) {
        setError('Cannot connect to server. Please ensure the backend is running on port 3001.');
      } else if (err.response?.status === 400) {
        setError(err.response.data.error || 'Invalid registration data');
      } else if (err.response?.status === 409) {
        setError('Username or email already exists. Please use a different one or sign in.');
      } else {
        setError(err.response?.data?.error || 'Registration failed. Please try again.');
      }
    }
    setLoading(false);
  };

  const getPasswordStrengthText = () => {
    switch(passwordStrength) {
      case 0: return { text: 'Very Weak', color: '#e74c3c' };
      case 1: return { text: 'Weak', color: '#e67e22' };
      case 2: return { text: 'Fair', color: '#f39c12' };
      case 3: return { text: 'Good', color: '#27ae60' };
      case 4: return { text: 'Strong', color: '#2ecc71' };
      default: return { text: '', color: '#bdc3c7' };
    }
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
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
                onChange={handlePasswordChange}
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
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength / 4) * 100}%`,
                      backgroundColor: getPasswordStrengthText().color
                    }}
                  ></div>
                </div>
                <span
                  className="strength-text"
                  style={{ color: getPasswordStrengthText().color }}
                >
                  {getPasswordStrengthText().text}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="new-user-section">
          <button type="button" onClick={switchToLogin} className="new-user-button">
            Already have an account? Sign in here
          </button>
        </div>
      </div>

      <div className="auth-right">
        <div className="marketing-content">
          <h2 className="marketing-title">Join RoadAlert Community</h2>
          <p className="marketing-subtitle">
            Report road incidents and help make our roads safer for everyone. Join thousands of users 
            who are already making a difference in their communities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
