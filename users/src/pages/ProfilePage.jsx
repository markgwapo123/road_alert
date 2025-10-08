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
  const [successMessage, setSuccessMessage] = useState('');
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      
      setSelectedFile(file);
      setShowUploadConfirm(true);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (selectedFile) {
      const formData = new FormData();
      formData.append('image', selectedFile);
      try {
        const res = await axios.post(`${config.API_BASE_URL}/users/profile-image`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setProfileImage(`${config.BACKEND_URL}${res.data.imageUrl}`);
        setSuccessMessage('Profile picture updated successfully!');
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadSuccess(false);
          setSuccessMessage('');
        }, 3000);
        setShowUploadConfirm(false);
        setSelectedFile(null);
        setPreviewImage(null);
      } catch (err) {
        setError('Failed to upload image');
        console.error('Image upload error:', err);
        setShowUploadConfirm(false);
        setSelectedFile(null);
        setPreviewImage(null);
      }
    }
  };

  const handleCancelUpload = () => {
    setShowUploadConfirm(false);
    setSelectedFile(null);
    setPreviewImage(null);
  };

  const handleRemoveProfilePicture = async () => {
    if (!profileImage) return;
    
    const confirmed = window.confirm('Are you sure you want to remove your profile picture?');
    if (confirmed) {
      try {
        await axios.delete(`${config.API_BASE_URL}/users/profile-image`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setProfileImage(null);
        setSuccessMessage('Profile picture removed successfully!');
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadSuccess(false);
          setSuccessMessage('');
        }, 3000);
      } catch (err) {
        setError('Failed to remove profile picture');
        console.error('Remove profile picture error:', err);
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
                <div className="profile-picture-upload">
                  <input
                    type="file"
                    id="profileImageInput"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('profileImageInput').click()}
                    className="upload-btn"
                    title="Change profile picture"
                  >
                    📷
                  </button>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="remove-btn"
                      title="Remove profile picture"
                    >
                      🗑️
                    </button>
                  )}
                </div>
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

        {/* Upload Success Message */}
        {uploadSuccess && (
          <div className="upload-success-message">
            ✅ {successMessage}
          </div>
        )}

        {/* Upload Confirmation Dialog */}
        {showUploadConfirm && (
          <div className="upload-confirm-overlay">
            <div className="upload-confirm-dialog">
              <div className="confirm-header">
                <h3>Confirm Profile Picture Update</h3>
                <button 
                  className="close-btn"
                  onClick={handleCancelUpload}
                >
                  ✕
                </button>
              </div>
              
              <div className="confirm-content">
                <div className="image-preview-section">
                  <div className="current-image">
                    <h4>Current</h4>
                    {profileImage ? (
                      <img src={profileImage} alt="Current Profile" />
                    ) : (
                      <div className="default-profile-icon">👤</div>
                    )}
                  </div>
                  
                  <div className="arrow-icon">→</div>
                  
                  <div className="new-image">
                    <h4>New</h4>
                    {previewImage && (
                      <img src={previewImage} alt="New Profile Preview" />
                    )}
                  </div>
                </div>
                
                <p className="confirm-message">
                  Are you sure you want to update your profile picture?
                </p>
              </div>
              
              <div className="confirm-actions">
                <button 
                  className="cancel-btn"
                  onClick={handleCancelUpload}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-btn"
                  onClick={handleConfirmUpload}
                >
                  Update Picture
                </button>
              </div>
            </div>
          </div>
        )}

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
