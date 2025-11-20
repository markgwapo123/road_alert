import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ErrorModal from '../components/ErrorModal';

const Login = ({ onLogin, switchToRegister }) => {
  const [loginId, setLoginId] = useState(''); // can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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

  // Helper function to show error modal
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    // Validate email format
    if (!loginId || !loginId.includes('@gmail.com')) {
      showError('Please enter a valid Gmail address.');
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
        showError('Cannot connect to server. Please ensure the backend is running.');
      } else if (err.response?.status === 404) {
        showError('Email not found. Please check your email address or register first.');
      } else {
        showError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
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
      showError('Only Gmail addresses are allowed for login.');
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
        showError('Cannot connect to server. Please check your internet connection.');
      } else if (err.response?.status === 401) {
        showError('Invalid Gmail or password. Please check your credentials and try again.');
      } else if (err.response?.status === 404) {
        showError('User not found. Please register first.');
      } else {
        showError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    }
    setLoading(false);
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

        <div className="new-user-section">
          <p className="new-user-text">
            New user? <a href="#" onClick={(e) => { e.preventDefault(); switchToRegister(); }} className="new-user-link">Activate your account</a>
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
        title="Login Error"
      />
    </div>
  );
};

export default Login;
