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

      <style jsx>{`
        .change-password-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .change-password-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .back-button {
          position: absolute;
          left: 20px;
          top: 20px;
          background: none;
          border: none;
          color: #666;
          font-size: 16px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .back-button:hover {
          background-color: #f5f5f5;
        }

        .page-title {
          font-size: 28px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .page-subtitle {
          color: #666;
          font-size: 16px;
          margin: 0;
        }

        .change-password-form-container {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .security-icon {
          text-align: center;
          margin-bottom: 30px;
        }

        .security-icon .icon {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }

        .security-icon h2 {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin: 0 0 5px 0;
        }

        .security-icon p {
          color: #666;
          margin: 0;
        }

        .success-message, .error-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          font-weight: 500;
        }

        .success-message {
          background-color: #f0f9ff;
          border: 1px solid #bae6fd;
          color: #0c4a6e;
        }

        .error-message {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        .success-icon, .error-icon {
          margin-right: 8px;
        }

        .change-password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          padding: 12px 45px 12px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .input-wrapper input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          padding: 4px;
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .password-requirements {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }

        .password-requirements h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .password-requirements ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .password-requirements li {
          padding: 4px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .password-requirements li:before {
          content: "•";
          margin-right: 8px;
          color: #d1d5db;
        }

        .password-requirements li.valid {
          color: #059669;
        }

        .password-requirements li.valid:before {
          content: "✓";
          color: #059669;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .cancel-button, .submit-button {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 16px;
        }

        .cancel-button {
          background-color: #f3f4f6;
          color: #374151;
        }

        .cancel-button:hover:not(:disabled) {
          background-color: #e5e7eb;
        }

        .submit-button {
          background-color: #3b82f6;
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #2563eb;
        }

        .submit-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .security-note {
          margin-top: 20px;
          padding: 16px;
          background-color: #fffbeb;
          border: 1px solid #fed7aa;
          border-radius: 8px;
        }

        .security-note p {
          margin: 0;
          font-size: 14px;
          color: #92400e;
        }

        @media (max-width: 768px) {
          .change-password-container {
            padding: 10px;
          }
          
          .change-password-form-container {
            padding: 20px;
          }
          
          .back-button {
            position: static;
            margin-bottom: 10px;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default ChangePassword;