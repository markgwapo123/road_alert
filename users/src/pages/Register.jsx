import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const Register = ({ onRegister, switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formKey, setFormKey] = useState(Date.now()); // Force form refresh

  // Clear form when component mounts
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setError('');
    setFormKey(Date.now());
  }, []);

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
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${config.API_BASE_URL}/auth/register`, {
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
        setError('Cannot connect to server. Please check your internet connection.');
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
      <div className="auth-left">
        {/* Mobile mockup image - visible only on mobile */}
        <div className="mobile-mockup">
          <img 
            src="/mockup-laptop-phone.png" 
            alt="RoadAlert on laptop and phone" 
          />
        </div>

        <div className="auth-logo">
          <img src="/roadalerlogo.png" alt="RoadAlert Logo" className="auth-logo-icon" />
          <h1 className="auth-logo-text">
            <span className="brand-name">Road</span><span className="brand-suffix">Alert</span>
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form" key={formKey}>
          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autocomplete="off"
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
                autocomplete="off"
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
                autocomplete="new-password"
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

          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autocomplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {confirmPassword && password && (
              <div className="password-match-indicator">
                {password === confirmPassword ? (
                  <span className="match-success">✅ Passwords match</span>
                ) : (
                  <span className="match-error">❌ Passwords do not match</span>
                )}
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
    </div>
  );
};

export default Register;
