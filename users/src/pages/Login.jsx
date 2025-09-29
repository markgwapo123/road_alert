import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const Login = ({ onLogin, switchToRegister }) => {
  const [loginId, setLoginId] = useState(''); // can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [formKey, setFormKey] = useState(Date.now()); // Force form refresh

  // Clear form when component mounts or switches
  useEffect(() => {
    setLoginId('');
    setPassword('');
    setError('');
    setResetMessage('');
    setFormKey(Date.now());
  }, [forgotPasswordMode]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    // Validate email format
    if (!loginId || !loginId.includes('@gmail.com')) {
      setError('Please enter a valid Gmail address.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${config.API_BASE_URL}/auth/forgot-password`, {
        email: loginId.trim()
      }, {
        timeout: 5000
      });
      
      setResetMessage('Password reset instructions have been sent to your email.');
      setForgotPasswordMode(false);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Network Error'))) {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else if (err.response?.status === 404) {
        setError('Email not found. Please check your email address or register first.');
      } else {
        setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
      }
    }
    setLoading(false);
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
      const res = await axios.post(`${config.API_BASE_URL}/auth/login`, {
        email: loginId.trim(),
        password
      }, {
        timeout: 5000
      });
      onLogin(res.data.token);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Network Error'))) {
        setError('Cannot connect to server. Please check your internet connection.');
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

  const handleGoogleLogin = () => {
    // For now, show a message that this feature needs setup
    setError('Google login requires OAuth setup. Please use email/password login for now.');
  };

  const handleFacebookLogin = () => {
    // For now, show a message that this feature needs setup
    setError('Facebook login requires OAuth setup. Please use email/password login for now.');
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-logo">
          <div className="auth-logo-icon">🚨</div>
          <h1 className="auth-logo-text">
            <span className="brand-name">Road</span><span className="brand-suffix">Alert</span>
          </h1>
        </div>
        
        <form onSubmit={forgotPasswordMode ? handleForgotPassword : handleSubmit} className="auth-form" key={formKey}>
          <div className="input-group">
            <div className="input-wrapper">
              <input
                id="loginId"
                type="email"
                placeholder="Email address"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                autocomplete="off"
                required
              />
            </div>
          </div>

          {!forgotPasswordMode && (
            <div className="input-group">
              <div className="input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
            </div>
          )}

          <div className="form-options">
            {!forgotPasswordMode ? (
              <button type="button" className="forgot-password" onClick={() => setForgotPasswordMode(true)}>
                Forgot Password
              </button>
            ) : (
              <button type="button" className="forgot-password" onClick={() => {
                setForgotPasswordMode(false);
                setError('');
                setResetMessage('');
              }}>
                Back to Login
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {resetMessage && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              {resetMessage}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 
              (forgotPasswordMode ? "SENDING..." : "SIGNING IN...") : 
              (forgotPasswordMode ? "SEND RESET EMAIL" : "SIGN IN")
            }
          </button>
        </form>

        {!forgotPasswordMode && (
          <div className="social-login-container">
            <div className="social-divider">
              <span className="social-divider-text">Or continue with</span>
            </div>
            
            <div className="social-buttons">
              <button 
                type="button" 
                className="google-login-button"
                onClick={() => handleGoogleLogin()}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <button 
                type="button" 
                className="facebook-login-button"
                onClick={() => handleFacebookLogin()}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </button>
            </div>
          </div>
        )}

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
