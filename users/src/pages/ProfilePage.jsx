import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const ProfilePage = ({ onBack, onLogout }) => {
  const [user, setUser] = useState(null);
  // Verification system removed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await axios.post(`${config.API_BASE_URL}/users/profile-image`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setProfileImage(`${config.BACKEND_URL}${res.data.imageUrl}`);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (err) {
        setError('Failed to upload image');
        console.error('Image upload error:', err);
      }
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${config.API_BASE_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(res.data.data);
        setFormData({
          username: res.data.data.username,
          email: res.data.data.email
        });
        
        // Set existing profile image if available
        if (res.data.data.profileImage) {
          setProfileImage(`${config.BACKEND_URL}${res.data.data.profileImage}`);
        }

        // No verification status fetch
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

  const status = { text: 'Member Account', icon: '👤', className: 'status-member', description: 'Standard account' };

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
        {/* Facebook-style Profile Header */}
        <div className="facebook-profile-header">
          {/* Profile Info Section */}
          <div className="profile-info-section">
            <div className="profile-main-info">
              <div className="profile-picture-container">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="facebook-profile-image" />
                ) : (
                  <div className="default-profile-icon">👤</div>
                )}
              </div>
              
              <div className="profile-details">
                <h1 className="profile-name">{user?.username}</h1>
                <p className="profile-subtitle">Road Alert Community Member</p>
                <div className="profile-status">
                  <span className={`status-badge ${status.className}`}>
                    {status.icon} {status.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          {/* User Info Card */}
          <div className="profile-card">
            <div className="card-header">
              <h2>
                Account Information
                {/* Verification badge removed */}
              </h2>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="edit-btn"
              >
                {editMode ? '✕ Cancel' : '✏️ Edit'}
              </button>
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
              {/* Verified information section removed */}

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

              {/* Account Actions Card - moved below verified info */}
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
            </div>
          </div>

          {/* Verification status card removed */}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
