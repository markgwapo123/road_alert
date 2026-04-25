import React, { useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const ChangePassword = ({ onBack, onLogout }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${config.API_BASE_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMessage('Password changed successfully! You will be logged out in 3 seconds for security.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Auto logout after successful password change for security
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          onLogout();
        }, 3000);
      }
    } catch (err) {
      console.error('Change password error:', err);
      if (err.response?.status === 401) {
        setError('Current password is incorrect');
      } else if (err.response?.status === 404) {
        setError('User not found. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  return (
    <div className="change-password-container">
      <div className="change-password-header">
        <button onClick={onBack} className="back-button">
          ← Back to Profile
        </button>
        <h1 className="page-title">Change Password</h1>
        <p className="page-subtitle">Update your account password for security</p>
      </div>

      <div className="change-password-form-container">
        <div className="security-icon">
          <span className="icon">🔒</span>
          <h2>Security Settings</h2>
          <p>Keep your account secure with a strong password</p>
        </div>

        {message && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="input-group">
            <label htmlFor="currentPassword">Current Password</label>
            <div className="input-wrapper">
              <input
                type={showPasswords.current ? "text" : "password"}
                name="currentPassword"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('current')}
                disabled={loading}
              >
                {showPasswords.current ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="input-wrapper">
              <input
                type={showPasswords.new ? "text" : "password"}
                name="newPassword"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password (min. 6 characters)"
                required
                minLength="6"
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('new')}
                disabled={loading}
              >
                {showPasswords.new ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="input-wrapper">
              <input
                type={showPasswords.confirm ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('confirm')}
                disabled={loading}
              >
                {showPasswords.confirm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={passwordData.newPassword.length >= 6 ? 'valid' : ''}>
                At least 6 characters long
              </li>
              <li className={passwordData.newPassword !== passwordData.currentPassword && passwordData.newPassword ? 'valid' : ''}>
                Different from current password
              </li>
              <li className={passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword ? 'valid' : ''}>
                Passwords match
              </li>
            </ul>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onBack}
              className="cancel-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>

        <div className="security-note">
          <p>
            <strong>Security Note:</strong> After changing your password, you will be automatically logged out 
            and need to sign in again with your new password.
          </p>
        </div>
      </div>

    </div>
  );
};

export default ChangePassword;