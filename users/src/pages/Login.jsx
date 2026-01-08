import React, { useState, useEffect } from 'react';
import config from '../config/index.js';
import { authApi, checkBackendHealth } from '../services/api.js';
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
                  const loginResponse = await authApi.googleLogin(response.credential);

                  if (loginResponse.token) {
                    localStorage.setItem('token', loginResponse.token);
                    localStorage.setItem('user', JSON.stringify(loginResponse.user));
                    onLogin(loginResponse.user);
                  }
                } catch (err) {
                  console.error('❌ Google auto-button login error:', err);
                  showError(err.message || 'Google login failed. Please try again or use email/password login.');
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
      showError('Please enter a valid Gmail address.');
      setLoading(false);
      return;
    }

    try {
      await authApi.forgotPassword(loginId.trim());
      setResetMessage('Password reset instructions have been sent to your email.');
      setForgotPasswordMode(false);
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Cannot connect')) {
        showError('Cannot connect to server. Please check your internet connection.');
      } else if (err.response?.status === 404) {
        showError('Email not found. Please check your email address or register first.');
      } else {
        showError(err.response?.data?.error || err.message || 'Failed to send reset email. Please try again.');
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
      const res = await authApi.login(loginId.trim(), password);
      onLogin(res.token);
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Cannot connect')) {
        showError('Cannot connect to server. Please check your internet connection.');
      } else if (err.response?.status === 401) {
        showError('Invalid Gmail or password. Please check your credentials and try again.');
      } else if (err.response?.status === 404) {
        showError('User not found. Please register first.');
      } else {
        showError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
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
        showError('Google services not loaded. Please refresh the page and try again. If the issue persists, check your internet connection.');
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

            // Send the Google ID token to your backend using API service
            console.log('📤 Sending Google token to backend...');
            const loginResponse = await authApi.googleLogin(response.credential);

            console.log('✅ Backend response:', loginResponse);
            if (loginResponse.token) {
              localStorage.setItem('token', loginResponse.token);
              localStorage.setItem('user', JSON.stringify(loginResponse.user));
              onLogin(loginResponse.user);
            }
          } catch (err) {
            console.error('❌ Google login error:', err);
            showError(err.message || 'Google login failed. Please try again or use email/password.');
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
            showError('Google login setup incomplete. Please ensure you are added as a test user in Google Cloud Console.');
            setLoading(false);
          }
        });
      }
    } catch (err) {
      console.error('❌ Google login initialization error:', err);
      showError('Google login unavailable. Please use email/password login.');
      setLoading(false);
    }
  };



  return (
    <div className="auth-container">
      <div className="auth-left">
        {/* Mobile mockup image - visible only on mobile */}
        <div className="mobile-mockup">
          <img 
            src="/mockup-laptop-phone.png" 
            alt="BantayDalan on laptop and phone" 
          />
        </div>

        <div className="auth-logo">
          <img src="/roadalerlogo.png" alt="BantayDalan Logo" className="auth-logo-icon" />
          <h1 className="auth-logo-text">
            <span className="brand-name">Bantay</span><span className="brand-suffix">Dalan</span>
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
