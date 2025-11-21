import React, { useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ErrorModal from '../components/ErrorModal';

// Configure axios for better mobile support
const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 5000, // 5 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Add headers for mobile compatibility
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  // Retry configuration for mobile networks
  maxRedirects: 3,
  validateStatus: function (status) {
    return status < 500; // Resolve only if status is less than 500
  }
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

const Register = ({ onRegister, switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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

  // Helper function to show error modal
  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
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

  // Helper function with retry logic for mobile networks
  const makeRequestWithRetry = async (requestFn, maxRetries = 2) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries + 1}`);
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on validation errors
        if (error.response?.status === 400 || error.response?.status === 409) {
          throw error;
        }
        
        // Retry on network/timeout errors
        if (attempt <= maxRetries && (
          error.code === 'ECONNABORTED' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'NETWORK_ERROR' ||
          !error.response
        )) {
          console.log(`Retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Enhanced validation
    if (!username.trim()) {
      showError('Please enter your username');
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      showError('Please enter your email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await makeRequestWithRetry(async () => {
        return await apiClient.post('/auth/register', {
          username: username.trim(),
          email: email.trim(),
          password
        });
      });
      
      if (res.data.token) {
        onRegister(res.data.token);
      } else {
        onRegister();
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      // Better error handling for mobile devices
      if (err.code === 'ECONNABORTED') {
        showError('Request timeout. Please check your connection and try again.');
      } else if (err.code === 'ECONNREFUSED' || err.code === 'NETWORK_ERROR' || (err.message && err.message.includes('Network Error'))) {
        showError('Cannot connect to server. Please check your internet connection and try again.');
      } else if (err.response?.status === 400) {
        showError(err.response.data.error || 'Invalid registration data. Please check your input.');
      } else if (err.response?.status === 409) {
        showError('Username or email already exists. Please use a different one or sign in.');
      } else if (err.response?.status === 500) {
        showError('Server error. Please try again in a moment.');
      } else {
        showError(err.response?.data?.error || 'Registration failed. Please try again.');
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

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="new-user-section">
          <p className="new-user-text">
            Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }} className="new-user-link">Sign in here</a>
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
        title="Registration Error"
      />
    </div>
  );
};

export default Register;
