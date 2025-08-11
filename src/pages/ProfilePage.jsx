import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const ProfilePage = ({ onBack, onLogout, isVerified, onVerify }) => {
  const [user, setUser] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${config.API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(res.data);
        setFormData({
          username: res.data.username,
          email: res.data.email
        });

        // Fetch verification status
        const verificationRes = await axios.get(`${config.API_BASE_URL}/auth/verification-status`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setVerificationStatus(verificationRes.data.verification);
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveProfile = async () => {
    try {
      const res = await axios.put(`${config.API_BASE_URL}/auth/profile`, formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(res.data);
      setEditMode(false);
    } catch (err) {
      setError('Failed to update profile');
      console.error('Profile update error:', err);
    }
  };

  const getVerificationStatus = () => {
    if (!verificationStatus) {
      return {
        text: 'Loading...',
        icon: '⏳',
        className: 'status-loading',
        description: 'Loading verification status...'
      };
    }

    switch (verificationStatus.status) {
      case 'approved':
        return {
          text: 'Verified Account',
          icon: '✅',
          className: 'status-verified',
          description: 'Your account has been verified and you can access all features.'
        };
      case 'submitted':
        return {
          text: 'Under Review',
          icon: '🔍',
          className: 'status-pending',
          description: 'Your verification request is being reviewed by our team. This usually takes 1-2 business days.'
        };
      case 'rejected':
        return {
          text: 'Verification Rejected',
          icon: '❌',
          className: 'status-rejected',
          description: 'Your verification request was rejected. Please contact support for more information.'
        };
      default:
        return {
          text: 'Unverified Account',
          icon: '⚠️',
          className: 'status-unverified',
          description: 'Please verify your account to access all features including report submission.'
        };
    }
  };

  const status = getVerificationStatus();

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-loading">
            <div className="loading-spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-error">
            <span className="error-icon">⚠️</span>
            <h2>Error Loading Profile</h2>
            <p>{error}</p>
            <button onClick={onBack} className="back-btn">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <button onClick={onBack} className="back-btn">
            ← Back
          </button>
          <div className="header-content">
            <span className="profile-icon">👤</span>
            <h1>My Profile</h1>
            <p>Manage your account information and settings</p>
          </div>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          {/* User Info Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>
                Account Information
                {verificationStatus?.status === 'approved' && (
                  <span className="verified-badge-inline">
                    <span className="verified-icon">✅</span>
                    Verified Account
                  </span>
                )}
              </h2>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="edit-btn"
              >
                {editMode ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>

            <div className="user-avatar-large">
              <span className="avatar-icon">👤</span>
            </div>

            <div className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  {editMode ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <div className="form-display">{user?.username}</div>
                  )}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  {editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <div className="form-display">{user?.email}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Account Type</label>
                <div className="form-display">
                  <span className="account-type">
                    {user?.type === 'admin' ? '👑 Administrator' : '👤 Regular User'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Member Since</label>
                <div className="form-display">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>

              {/* Add verification data if user is verified */}
              {user?.isVerified && user?.verificationData && (
                <>
                  <div className="verification-divider">
                    <span className="divider-text">🔐 Verified Information</span>
                  </div>

                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="form-display verified-data">
                      {user.verificationData.firstName} {user.verificationData.lastName}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone Number</label>
                      <div className="form-display verified-data">
                        {user.verificationData.phone}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>ID Type</label>
                      <div className="form-display verified-data">
                        {user.verificationData.idType?.replace('_', ' ').toUpperCase() || 'Not specified'}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <div className="form-display verified-data">
                      {user.verificationData.address}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Submitted On</label>
                      <div className="form-display verified-data">
                        {user.verificationData.submittedAt 
                          ? new Date(user.verificationData.submittedAt).toLocaleDateString()
                          : 'Not available'
                        }
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Verified On</label>
                      <div className="form-display verified-data">
                        {user.verificationData.verifiedAt 
                          ? new Date(user.verificationData.verifiedAt).toLocaleDateString()
                          : 'Not available'
                        }
                      </div>
                    </div>
                  </div>
                </>
              )}

              {editMode && (
                <div className="form-actions">
                  <button onClick={handleSaveProfile} className="save-btn">
                    💾 Save Changes
                  </button>
                  <button onClick={() => setEditMode(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              )}

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
            </div>
          </div>

          {/* Account Actions Card */}
          <div className="actions-card">
            <div className="card-header">
              <h2>Account Actions</h2>
            </div>

            <div className="actions-grid">
              <button className="action-item change-password">
                <span className="action-icon">🔒</span>
                <div className="action-info">
                  <h3>Change Password</h3>
                  <p>Update your account password</p>
                </div>
              </button>

              <button className="action-item privacy-settings">
                <span className="action-icon">🛡️</span>
                <div className="action-info">
                  <h3>Privacy Settings</h3>
                  <p>Manage your privacy preferences</p>
                </div>
              </button>

              <button className="action-item download-data">
                <span className="action-icon">📥</span>
                <div className="action-info">
                  <h3>Download Data</h3>
                  <p>Export your account information</p>
                </div>
              </button>

              <button onClick={onLogout} className="action-item logout-action">
                <span className="action-icon">🚪</span>
                <div className="action-info">
                  <h3>Logout</h3>
                  <p>Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>

          {/* Verification Status Card - Only show if not verified */}
          {verificationStatus?.status !== 'approved' && (
            <div className="verification-card">
              <div className="card-header">
                <h2>Verification Status</h2>
                <span className={`verification-badge ${status.className}`}>
                  {status.icon} {status.text}
                </span>
              </div>

              <div className="verification-content">
                <p>{status.description}</p>
                
                {verificationStatus?.status === 'pending' && (
                  <div className="verification-benefits">
                    <h3>🌟 Benefits of Verification:</h3>
                    <ul>
                      <li>✅ Submit your own road hazard reports</li>
                      <li>✅ Access to personal report history</li>
                      <li>✅ Priority support and assistance</li>
                      <li>✅ Enhanced community features</li>
                    </ul>
                    
                    <button onClick={onVerify} className="verify-btn">
                      🔐 Verify My Account
                    </button>
                  </div>
                )}

                {verificationStatus?.status === 'submitted' && (
                  <div className="verification-pending">
                    <div className="pending-icon">⏰</div>
                    <h3>Verification in Progress</h3>
                    <p>Your documents are being reviewed. We'll notify you once the review is complete.</p>
                    <small>Submitted on: {verificationStatus.submittedAt ? new Date(verificationStatus.submittedAt).toLocaleDateString() : 'N/A'}</small>
                  </div>
                )}

                {verificationStatus?.status === 'rejected' && (
                  <div className="verification-rejected">
                    <div className="rejected-icon">⚠️</div>
                    <h3>Verification Rejected</h3>
                    <p>Your verification request was rejected. Please contact support for assistance or try submitting again with valid documents.</p>
                    <button onClick={onVerify} className="verify-btn retry-btn">
                      🔄 Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
