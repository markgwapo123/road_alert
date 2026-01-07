import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ChangePassword from './ChangePassword.jsx';

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
            notificationsEnabled: userData.profile?.notificationsEnabled !== false
          });
          
          if (userData.profileImage) {
            setProfileImage(`${config.BACKEND_URL}${userData.profileImage}`);
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

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
      setSelectedFile(file);
    }
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
      
      setProfileImage(`${config.BACKEND_URL}${res.data.imageUrl}`);
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

  // Get user role display
  const getUserRole = () => {
    if (user?.role === 'admin' || user?.type === 'admin') return { label: 'Admin', icon: '👑', color: '#f59e0b' };
    return { label: 'Citizen', icon: '👤', color: '#3b82f6' };
  };

  // Loading state
  if (loading) {
    return (
      <div className="mvp-profile-page">
        <div className="mvp-profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state (no user)
  if (error && !user) {
    return (
      <div className="mvp-profile-page">
        <div className="mvp-profile-error">
          <span className="error-icon">⚠️</span>
          <h2>Error Loading Profile</h2>
          <p>{error}</p>
          <button onClick={onBack} className="mvp-btn mvp-btn-secondary">← Back</button>
        </div>
      </div>
    );
  }

  // Change password view
  if (showChangePassword) {
    return <ChangePassword onBack={() => setShowChangePassword(false)} onLogout={onLogout} />;
  }

  const role = getUserRole();

  return (
    <div className="mvp-profile-page">
      <div className="mvp-profile-container">
        
        {/* Success Message */}
        {successMessage && (
          <div className="mvp-success-toast">
            <span>✓</span> {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mvp-error-toast">
            <span>⚠️</span> {error}
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* ==================== VIEW PROFILE SECTION ==================== */}
        <section className="mvp-profile-section mvp-view-section">
          <div className="mvp-profile-header">
            {/* Avatar */}
            <div className="mvp-avatar-container">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="mvp-avatar" />
              ) : (
                <div className="mvp-avatar mvp-avatar-default">
                  <span>👤</span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="mvp-user-info">
              <h1 className="mvp-user-name">
                {user?.profile?.fullName || user?.username || 'User'}
              </h1>
              <p className="mvp-user-email">{user?.email}</p>
              {user?.profile?.phone && (
                <p className="mvp-user-phone">📱 {user.profile.phone}</p>
              )}
              <div className="mvp-user-meta">
                <span className="mvp-role-badge" style={{ backgroundColor: role.color }}>
                  {role.icon} {role.label}
                </span>
                <span className="mvp-join-date">
                  📅 Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Report Summary Stats */}
          <div className="mvp-stats-section">
            <h3 className="mvp-section-title">📊 Report Summary</h3>
            <div className="mvp-stats-grid">
              <div className="mvp-stat-card">
                <span className="mvp-stat-number">{stats.totalReports}</span>
                <span className="mvp-stat-label">Total Reports</span>
              </div>
              <div className="mvp-stat-card mvp-stat-pending">
                <span className="mvp-stat-number">{stats.pendingReports}</span>
                <span className="mvp-stat-label">Pending</span>
              </div>
              <div className="mvp-stat-card mvp-stat-resolved">
                <span className="mvp-stat-number">{stats.resolvedReports}</span>
                <span className="mvp-stat-label">Resolved</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section Divider */}
        <div className="mvp-section-divider"></div>

        {/* ==================== EDIT PROFILE SECTION ==================== */}
        <section className="mvp-profile-section mvp-edit-section">
          <div className="mvp-section-header">
            <h2 className="mvp-section-title">✏️ Edit Profile</h2>
            {activeSection === 'edit' && (
              <button 
                onClick={() => setActiveSection('view')} 
                className="mvp-btn mvp-btn-text"
              >
                Cancel
              </button>
            )}
          </div>

          {activeSection === 'view' ? (
            /* View Mode - Show Edit Button */
            <button 
              onClick={() => setActiveSection('edit')} 
              className="mvp-btn mvp-btn-primary mvp-btn-block"
            >
              ✏️ Edit Profile Information
            </button>
          ) : (
            /* Edit Mode - Show Form */
            <div className="mvp-edit-form">
              {/* Profile Picture Upload */}
              <div className="mvp-form-group">
                <label className="mvp-form-label">Profile Picture</label>
                <div className="mvp-image-upload">
                  <div className="mvp-image-preview">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" />
                    ) : profileImage ? (
                      <img src={profileImage} alt="Current" />
                    ) : (
                      <div className="mvp-image-placeholder">👤</div>
                    )}
                  </div>
                  <div className="mvp-image-actions">
                    {previewImage ? (
                      <>
                        <button 
                          onClick={handleUploadImage} 
                          className="mvp-btn mvp-btn-success mvp-btn-sm"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? 'Uploading...' : '✓ Save'}
                        </button>
                        <button 
                          onClick={handleCancelImage} 
                          className="mvp-btn mvp-btn-secondary mvp-btn-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="mvp-btn mvp-btn-secondary mvp-btn-sm">
                          📷 Change
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {profileImage && (
                          <button 
                            onClick={handleRemoveImage} 
                            className="mvp-btn mvp-btn-danger mvp-btn-sm"
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="mvp-form-group">
                <label className="mvp-form-label">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="mvp-form-input"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Contact Number */}
              <div className="mvp-form-group">
                <label className="mvp-form-label">Contact Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mvp-form-input"
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>

              {/* Notification Toggle */}
              <div className="mvp-form-group mvp-toggle-group">
                <div className="mvp-toggle-info">
                  <label className="mvp-form-label">🔔 Notifications</label>
                  <span className="mvp-toggle-desc">Receive alerts about your reports</span>
                </div>
                <label className="mvp-toggle">
                  <input
                    type="checkbox"
                    name="notificationsEnabled"
                    checked={formData.notificationsEnabled}
                    onChange={handleInputChange}
                  />
                  <span className="mvp-toggle-slider"></span>
                </label>
              </div>

              {/* Save Button */}
              <button 
                onClick={handleSaveProfile}
                className="mvp-btn mvp-btn-primary mvp-btn-block"
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}

          {/* Change Password Button */}
          <button 
            onClick={() => setShowChangePassword(true)}
            className="mvp-btn mvp-btn-outline mvp-btn-block"
            style={{ marginTop: '12px' }}
          >
            🔒 Change Password
          </button>
        </section>

        {/* ==================== ACCOUNT ACTIONS ==================== */}
        <section className="mvp-profile-section mvp-actions-section">
          <button onClick={onLogout} className="mvp-btn mvp-btn-danger mvp-btn-block">
            🚪 Logout
          </button>
        </section>

      </div>
    </div>
  );
};

export default ProfilePage;
