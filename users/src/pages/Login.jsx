import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ErrorModal from '../components/ErrorModal';
import { useSettings } from '../context/SettingsContext';

const Login = ({ onLogin, switchToRegister }) => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'BantayDalan');
  
  const [loginId, setLoginId] = useState(''); // can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [formKey, setFormKey] = useState(Date.now()); // Force form refresh
  
  // Split site name into brand parts (e.g., "BantayDalan" -> "Bantay" + "Dalan")
  const splitBrandName = (name) => {
    // Try to find capital letters to split (camelCase)
    const matches = name.match(/[A-Z][a-z]+/g);
    if (matches && matches.length >= 2) {
      return { first: matches[0], second: matches.slice(1).join('') };
    }
    // If no camelCase, split in middle or use full name
    const mid = Math.ceil(name.length / 2);
    return { first: name.slice(0, mid), second: name.slice(mid) || '' };
  };
  
  const { first: brandFirst, second: brandSecond } = splitBrandName(siteName);

  // Clear form when component mounts or switches
  useEffect(() => {
    setLoginId('');
    setPassword('');
    setError('');
    setResetMessage('');
    setResetStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
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
              client_id: 'your_google_client_id.apps.googleusercontent.com',
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
                  showError('Google login failed. Please try again or use email/password login.');
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

    try {
      if (resetStep === 1) {
        // Step 1: Send OTP
        if (!loginId || !loginId.includes('@gmail.com')) {
          showError('Please enter a valid Gmail address.');
          setLoading(false);
          return;
        }

        await axios.post(`${config.API_BASE_URL}/auth/forgot-password`, {
          email: loginId.trim()
        });
        
        setResetMessage('A 6-digit OTP has been generated. Please check your email (or console in dev mode).');
        setResetStep(2);
      } else if (resetStep === 2) {
        // Step 2: Verify OTP
        if (!otp || otp.length !== 6) {
          showError('Please enter the 6-digit OTP.');
          setLoading(false);
          return;
        }

        await axios.post(`${config.API_BASE_URL}/auth/verify-otp`, {
          email: loginId.trim(),
          otp: otp.trim()
        });

        setResetMessage('OTP verified! Now set your new password.');
        setResetStep(3);
      } else if (resetStep === 3) {
        // Step 3: Reset Password
        if (newPassword.length < 6) {
          showError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }

        if (newPassword !== confirmNewPassword) {
          showError('Passwords do not match.');
          setLoading(false);
          return;
        }

        await axios.post(`${config.API_BASE_URL}/auth/reset-password`, {
          email: loginId.trim(),
          otp: otp.trim(),
          newPassword
        });

        setResetMessage('Password reset successful! You can now sign in.');
        setTimeout(() => {
          setForgotPasswordMode(false);
          setResetStep(1);
        }, 2000);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      showError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
        timeout: 30000 // 30 seconds for sleeping Render backend
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
        client_id: 'your_google_client_id.apps.googleusercontent.com', // Your actual Google Client ID
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
            showError('Google login failed. Please try again or use email/password.');
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
          <img src="/roadalerlogo.png" alt={`${siteName} Logo`} className="auth-logo-icon" />
          <h1 className="auth-logo-text">
            <span className="brand-name">{brandFirst}</span>{brandSecond && <span className="brand-suffix">{brandSecond}</span>}
          </h1>
        </div>
        
        <form onSubmit={forgotPasswordMode ? handleForgotPassword : handleSubmit} className="auth-form" key={formKey}>
          {forgotPasswordMode ? (
            <>
              {resetStep === 1 && (
                <div className="input-group">
                  <div className="input-wrapper">
                    <input
                      id="resetEmail"
                      type="email"
                      placeholder="Email address"
                      value={loginId}
                      onChange={e => setLoginId(e.target.value)}
                      autocomplete="off"
                      required
                    />
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <div className="input-group">
                  <div className="input-wrapper">
                    <input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength="6"
                      autocomplete="off"
                      required
                    />
                  </div>
                </div>
              )}

              {resetStep === 3 && (
                <>
                  <div className="input-group">
                    <div className="input-wrapper">
                      <input
                        id="newPassword"
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <div className="input-wrapper">
                      <input
                        id="confirmNewPassword"
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
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
            </>
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
                setResetStep(1);
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
              (forgotPasswordMode ? (resetStep === 1 ? "SENDING..." : resetStep === 2 ? "VERIFYING..." : "RESETTING...") : "SIGNING IN...") : 
              (forgotPasswordMode ? (resetStep === 1 ? "SEND OTP" : resetStep === 2 ? "VERIFY OTP" : "RESET PASSWORD") : "SIGN IN")
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
