import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ChangePassword from './ChangePassword.jsx';
import './ProfilePage.css';

const ProfilePage = ({ onBack, onLogout, onUserUpdate }) => {
  // User data states
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    verifiedReports: 0,
    resolvedReports: 0,
    rejectedReports: 0
  });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSection, setActiveSection] = useState('view'); // 'view' or 'edit'
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    gender: '',
    notificationsEnabled: true
  });
  
  // Profile image states
  const [profileImage, setProfileImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch user profile and stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch profile and stats in parallel
        const [profileRes, statsRes] = await Promise.all([
          axios.get(`${config.API_BASE_URL}/users/me`, { headers }),
          axios.get(`${config.API_BASE_URL}/users/me/stats`, { headers }).catch(() => ({ data: { success: false } }))
        ]);
        
        if (profileRes.data.success) {
          const userData = profileRes.data.data;
          setUser(userData);
          setFormData({
            fullName: userData.profile?.fullName || userData.username || '',
            phone: userData.profile?.phone || '',
            address: userData.profile?.address || '',
            gender: userData.profile?.gender || '',
            notificationsEnabled: userData.profile?.notificationsEnabled !== false
          });
          
          // Handle profile image - check if it's a data URL or a path
          if (userData.profileImage) {
            if (userData.profileImage.startsWith('data:')) {
              // It's a Base64 data URL, use directly
              setProfileImage(userData.profileImage);
            } else {
              // It's a path, prepend backend URL
              setProfileImage(`${config.BACKEND_URL}${userData.profileImage}`);
            }
          }
        }
        
        if (statsRes.data?.success) {
          setStats(statsRes.data.data);
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      }
      setLoading(false);
    };
    
    fetchData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_FILE_SIZE_MB = 5;

  // Handle image selection with strict 5MB validation
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    // Strict 5MB file size validation
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError(`Profile photo must be ${MAX_FILE_SIZE_MB}MB or less. Your file is ${fileSizeMB}MB.`);
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, GIF)');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => setPreviewImage(event.target.result);
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setError(''); // Clear any previous errors
    e.target.value = '';
  };

  // Upload profile image
  const handleUploadImage = async () => {
    if (!selectedFile) return;
    
    setUploadingImage(true);
    setError('');
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', selectedFile);
      
      const res = await axios.post(`${config.API_BASE_URL}/users/profile-image`, formDataUpload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Handle response - check if it's a data URL or a path
      const imageUrl = res.data.imageUrl;
      if (imageUrl.startsWith('data:')) {
        setProfileImage(imageUrl);
      } else {
        setProfileImage(`${config.BACKEND_URL}${imageUrl}`);
      }
      setSelectedFile(null);
      setPreviewImage(null);
      showSuccess('Profile picture updated!');
      
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      setError('Failed to upload image');
      console.error('Image upload error:', err);
    }
    setUploadingImage(false);
  };

  // Cancel image selection
  const handleCancelImage = () => {
    setSelectedFile(null);
    setPreviewImage(null);
  };

  // Remove profile image
  const handleRemoveImage = async () => {
    if (!profileImage) return;
    
    if (!window.confirm('Remove your profile picture?')) return;
    
    try {
      await axios.delete(`${config.API_BASE_URL}/users/profile-image`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      setProfileImage(null);
      showSuccess('Profile picture removed!');
      if (onUserUpdate) onUserUpdate();
    } catch (err) {
      setError('Failed to remove profile picture');
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    
    try {
      const res = await axios.put(`${config.API_BASE_URL}/users/me`, {
        profile: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          gender: formData.gender,
          notificationsEnabled: formData.notificationsEnabled
        }
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.data.success) {
        setUser(res.data.data);
        showSuccess('Profile updated successfully!');
        setActiveSection('view');
        if (onUserUpdate) onUserUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  // Show success message temporarily
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-loading__spinner"></div>
          <p className="profile-loading__text">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state (no user)
  if (error && !user) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <span className="profile-error__icon">⚠️</span>
          <h2 className="profile-error__title">Error Loading Profile</h2>
          <p className="profile-error__message">{error}</p>
          <button onClick={onBack} className="profile-btn profile-btn--secondary">← Back</button>
        </div>
      </div>
    );
  }

  // Change password view
  if (showChangePassword) {
    return <ChangePassword onBack={() => setShowChangePassword(false)} onLogout={onLogout} />;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        
        {/* Success Toast */}
        {successMessage && (
          <div className="profile-toast profile-toast--success">
            <span>✓</span> {successMessage}
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="profile-toast profile-toast--error">
            <span>⚠️</span> {error}
            <button className="profile-toast__close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* ==================== PROFILE CARD ==================== */}
        <div className="profile-card">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="Profile"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'block');
                    }}
                  />
                ) : (
                  <span className="profile-avatar__default">👤</span>
                )}
              </div>
            </div>
            
            {/* User Info */}
            <div className="profile-user-info">
              <h1 className="profile-user-name">
                {user?.profile?.fullName || user?.username || 'User'}
              </h1>
              <p className="profile-user-email">{user?.email}</p>
              
              <div className="profile-user-details">
                {user?.profile?.phone && (
                  <span className="profile-user-detail">
                    <span className="profile-user-detail__icon">📱</span>
                    {user.profile.phone}
                  </span>
                )}
                {user?.profile?.gender && (
                  <span className="profile-user-detail">
                    <span className="profile-user-detail__icon">
                      {user.profile.gender === 'male' ? '👨' : user.profile.gender === 'female' ? '👩' : '🧑'}
                    </span>
                    {user.profile.gender.charAt(0).toUpperCase() + user.profile.gender.slice(1).replace('-', ' ')}
                  </span>
                )}
                {user?.profile?.address && (
                  <span className="profile-user-detail">
                    <span className="profile-user-detail__icon">📍</span>
                    {user.profile.address}
                  </span>
                )}
              </div>
              
              <p className="profile-join-date">
                📅 Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="profile-stat__number">{stats.totalReports}</span>
              <span className="profile-stat__label">Total Reports</span>
            </div>
            <div className="profile-stat profile-stat--pending">
              <span className="profile-stat__number">{stats.pendingReports}</span>
              <span className="profile-stat__label">Pending</span>
            </div>
            <div className="profile-stat profile-stat--resolved">
              <span className="profile-stat__number">{stats.resolvedReports}</span>
              <span className="profile-stat__label">Resolved</span>
            </div>
          </div>
        </div>

        {/* ==================== EDIT PROFILE CARD ==================== */}
        <div className="profile-card">
          <div className="profile-section-header">
            <h2 className="profile-section-title">
              <span className="profile-section-title__icon">✏️</span>
              Edit Profile
            </h2>
            {activeSection === 'edit' && (
              <button 
                onClick={() => setActiveSection('view')} 
                className="profile-btn profile-btn--text"
              >
                Cancel
              </button>
            )}
          </div>

          {activeSection === 'view' ? (
            <button 
              onClick={() => setActiveSection('edit')} 
              className="profile-btn profile-btn--primary profile-btn--block"
            >
              ✏️ Edit Profile Information
            </button>
          ) : (
            <div className="profile-form">
              {/* Profile Picture Upload */}
              <div className="profile-form-group">
                <label className="profile-form-label">Profile Picture</label>
                <div className="profile-image-upload">
                  <div className="profile-image-preview">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" />
                    ) : profileImage ? (
                      <img src={profileImage} alt="Current" />
                    ) : (
                      <span className="profile-image-preview__placeholder">👤</span>
                    )}
                  </div>
                  <div className="profile-image-actions">
                    {previewImage ? (
                      <>
                        <button 
                          onClick={handleUploadImage} 
                          className="profile-btn profile-btn--success profile-btn--sm"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? 'Uploading...' : '✓ Save'}
                        </button>
                        <button 
                          onClick={handleCancelImage} 
                          className="profile-btn profile-btn--secondary profile-btn--sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="profile-btn profile-btn--secondary profile-btn--sm">
                          📷 Change
                          <input 
                            type="file" 
                            accept="image/jpeg,image/png,image/gif,image/webp" 
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {profileImage && (
                          <button 
                            onClick={handleRemoveImage} 
                            className="profile-btn profile-btn--danger profile-btn--sm"
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <p className="profile-file-hint">Max: 5MB • JPG, PNG, GIF</p>
                </div>
              </div>

              {/* Full Name */}
              <div className="profile-form-group">
                <label className="profile-form-label">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="profile-form-input"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Contact Number */}
              <div className="profile-form-group">
                <label className="profile-form-label">Contact Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="profile-form-input"
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>

              {/* Gender Selection */}
              <div className="profile-form-group">
                <label className="profile-form-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="profile-form-input profile-form-select"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              {/* Address */}
              <div className="profile-form-group">
                <label className="profile-form-label">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="profile-form-input profile-form-textarea"
                  placeholder="Enter your address"
                  rows="3"
                />
              </div>

              {/* Notification Toggle */}
              <div className="profile-form-group profile-toggle-group">
                <div className="profile-toggle-info">
                  <label className="profile-form-label">
                    <span>🔔</span> Notifications
                  </label>
                  <span className="profile-toggle-desc">Receive alerts about your reports</span>
                </div>
                <label className="profile-toggle">
                  <input
                    type="checkbox"
                    name="notificationsEnabled"
                    checked={formData.notificationsEnabled}
                    onChange={handleInputChange}
                  />
                  <span className="profile-toggle-slider"></span>
                </label>
              </div>

              {/* Save Button */}
              <button 
                onClick={handleSaveProfile}
                className="profile-btn profile-btn--primary profile-btn--block"
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* ==================== ACCOUNT ACTIONS CARD ==================== */}
        <div className="profile-card">
          <h2 className="profile-section-title">
            <span className="profile-section-title__icon">⚙️</span>
            Account
          </h2>
          <div className="profile-actions">
            <button 
              onClick={() => setShowChangePassword(true)}
              className="profile-btn profile-btn--outline profile-btn--block"
            >
              🔒 Change Password
            </button>
            <button 
              onClick={onLogout} 
              className="profile-btn profile-btn--danger profile-btn--block"
            >
              🚪 Logout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
