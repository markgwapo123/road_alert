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

  // Auto-render Google button when component mounts
  useEffect(() => {
    const renderGoogleButton = () => {
      if (window.google && window.google.accounts) {
        const buttonContainer = document.getElementById('google-signin-button');
        const fallbackButton = document.getElementById('google-fallback-button');
        
        if (buttonContainer && !buttonContainer.hasChildNodes()) {
          try {
            window.google.accounts.id.initialize({
              client_id: '1272896031-jn5nlf6b7dc3b0qk0als90mfy2sfhm5d.apps.googleusercontent.com',
              callback: async (response) => {
                try {
                  console.log('🔍 Google auto-button callback received:', response);
                  if (!response.credential) {
                    throw new Error('No credential received from Google');
                  }

                  setLoading(true);
                  const loginResponse = await axios.post(`${config.API_BASE_URL}/auth/google-login`, {
                    idToken: response.credential
                  });

                  if (loginResponse.data.token) {
                    localStorage.setItem('token', loginResponse.data.token);
                    localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
                    onLogin(loginResponse.data.user);
                  }
                } catch (err) {
                  console.error('❌ Google auto-button login error:', err);
                  setError('Google login failed. Please try again.');
                } finally {
                  setLoading(false);
                }
              }
            });

            window.google.accounts.id.renderButton(buttonContainer, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              width: 300
            });
            
            console.log('✅ Google button rendered successfully');
          } catch (error) {
            console.error('❌ Failed to render Google button:', error);
            // Show fallback button
            if (fallbackButton) {
              fallbackButton.style.display = 'block';
            }
          }
        }
      } else {
        // Retry after a short delay
        setTimeout(renderGoogleButton, 1000);
      }
    };

    renderGoogleButton();
  }, []);

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

  // Load Google Identity Services
  useEffect(() => {
    // Load Google Identity Services
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Identity Services loaded successfully');
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Identity Services:', error);
      };
      document.head.appendChild(script);
    }


  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 Checking Google services...');
      if (!window.google) {
        console.error('❌ Google services not available');
        setError('Google services not loaded. Please refresh the page and try again. If the issue persists, check your internet connection.');
        setLoading(false);
        return;
      }

      console.log('✅ Google services available, initializing...');
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: '1272896031-jn5nlf6b7dc3b0qk0als90mfy2sfhm5d.apps.googleusercontent.com', // Your actual Google Client ID
        callback: async (response) => {
          try {
            console.log('🔍 Google login callback received:', response);
            if (!response.credential) {
              throw new Error('No credential received from Google');
            }

            // Send the Google ID token to your backend
            console.log('📤 Sending Google token to backend...');
            const loginResponse = await axios.post(`${config.API_BASE_URL}/auth/google-login`, {
              idToken: response.credential
            });

            console.log('✅ Backend response:', loginResponse.data);
            if (loginResponse.data.token) {
              localStorage.setItem('token', loginResponse.data.token);
              localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
              onLogin(loginResponse.data.user);
            }
          } catch (err) {
            console.error('❌ Google login error:', err);
            setError('Google login failed. Please try again or use email/password.');
          }
          setLoading(false);
        }
      });

      // Try to render Google sign-in button instead of prompt
      console.log('📱 Rendering Google sign-in button...');
      try {
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { 
            theme: 'outline', 
            size: 'large',
            type: 'standard',
            text: 'signin_with'
          }
        );
        setLoading(false);
      } catch (renderError) {
        console.error('❌ Failed to render Google button:', renderError);
        // Fallback to prompt
        window.google.accounts.id.prompt((notification) => {
          console.log('🔔 Google prompt notification:', notification);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('⚠️ Google login prompt was not displayed or skipped');
            setError('Google login setup incomplete. Please ensure you are added as a test user in Google Cloud Console.');
            setLoading(false);
          }
        });
      }
    } catch (err) {
      console.error('❌ Google login initialization error:', err);
      setError('Google login unavailable. Please use email/password login.');
      setLoading(false);
    }
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
              {error.includes('Google') && (
                <div style={{ marginTop: '10px', fontSize: '14px', opacity: '0.8' }}>
                  <strong>Quick Fix:</strong> Use email/password login while setting up Google OAuth.
                </div>
              )}
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
              {/* Google Sign-In Button Container */}
              <div id="google-signin-button" style={{ 
                width: '100%', 
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}></div>
              
              {/* Fallback Manual Button */}
              <button 
                type="button" 
                className="google-login-button"
                onClick={() => handleGoogleLogin()}
                disabled={loading}
                style={{ display: 'none' }}
                id="google-fallback-button"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
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
