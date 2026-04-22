import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ChangePassword from './ChangePassword.jsx';
import './ProfilePage.css';

const ProfilePage = ({ token, prefetchedUser, onBack, onLogout, onUserUpdate }) => {
  // User data states
  const [user, setUser] = useState(prefetchedUser || null);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    verifiedReports: 0,
    resolvedReports: 0,
    rejectedReports: 0
  });
  
  // UI states
  const [loading, setLoading] = useState(!prefetchedUser);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSection, setActiveSection] = useState('view'); // 'view' or 'edit'
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: prefetchedUser?.profile?.fullName || prefetchedUser?.username || '',
    phone: prefetchedUser?.profile?.phone || '',
    address: prefetchedUser?.profile?.address || '',
    gender: prefetchedUser?.profile?.gender || '',
    notificationsEnabled: prefetchedUser?.profile?.notificationsEnabled !== false
  });
  
  // Profile image states
  const [profileImage, setProfileImage] = useState(() => {
    if (prefetchedUser?.profileImage) {
      return prefetchedUser.profileImage.startsWith('data:') 
        ? prefetchedUser.profileImage 
        : `${config.BACKEND_URL}${prefetchedUser.profileImage}`;
    }
    return null;
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch user profile and stats
  useEffect(() => {
    // If we have prefetchedUser, sync the stats only, or skip profile fetch
    const fetchData = async () => {
      if (!prefetchedUser) setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Fetch profile and stats in parallel
        const [profileRes, statsRes] = await Promise.all([
          !prefetchedUser ? axios.get(`${config.API_BASE_URL}/users/me`, { headers }) : Promise.resolve({ data: { success: true, data: prefetchedUser } }),
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
        <div className="profile-card profile-card--main">
          {/* Header Mesh Background Decoration */}
          <div className="profile-card-mesh"></div>
          
          {/* Avatar Section */}
          <div className="profile-header-section">
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
            <div className="profile-main-info">
              <h1 className="profile-user-name">
                {user?.profile?.fullName || user?.username || 'User'}
              </h1>
              <div className="profile-email-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="profile-stats-container">
            <div className="profile-stat-box profile-stat-box--total">
              <span className="profile-stat-number">{stats.totalReports}</span>
              <span className="profile-stat-label">Total</span>
            </div>
            <div className="profile-stat-box profile-stat-box--pending">
              <span className="profile-stat-number">{stats.pendingReports}</span>
              <span className="profile-stat-label">Pending</span>
            </div>
            <div className="profile-stat-box profile-stat-box--review">
              <span className="profile-stat-number">{stats.verifiedReports}</span>
              <span className="profile-stat-label">In Review</span>
            </div>
            <div className="profile-stat-box profile-stat-box--resolved">
              <span className="profile-stat-number">{stats.resolvedReports}</span>
              <span className="profile-stat-label">Resolved</span>
            </div>
          </div>

          {/* Detailed Info Rows */}
          <div className="profile-info-grid">
            {/* Phone Row */}
            <div className="profile-info-row">
              <div className="profile-info-icon profile-info-icon--green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>
              <div className="profile-info-content">
                <span className="profile-info-label">Phone</span>
                <span className="profile-info-value">{user?.profile?.phone || 'Not set'}</span>
              </div>
            </div>

            {/* Gender Row */}
            <div className="profile-info-row">
              <div className="profile-info-icon profile-info-icon--yellow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="5"></circle>
                  <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"></path>
                </svg>
              </div>
              <div className="profile-info-content">
                <span className="profile-info-label">Gender</span>
                <span className="profile-info-value">
                  {user?.profile?.gender 
                    ? user.profile.gender.charAt(0).toUpperCase() + user.profile.gender.slice(1).replace('-', ' ') 
                    : 'Not set'}
                </span>
              </div>
            </div>

            {/* Location Row */}
            <div className="profile-info-row">
              <div className="profile-info-icon profile-info-icon--red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className="profile-info-content">
                <span className="profile-info-label">Location</span>
                <span className="profile-info-value">{user?.profile?.address || 'Not set'}</span>
              </div>
            </div>

            {/* Joined Row */}
            <div className="profile-info-row">
              <div className="profile-info-icon profile-info-icon--purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <path d="M8 14h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 18h.01"></path>
                  <path d="M12 18h.01"></path>
                  <path d="M16 18h.01"></path>
                </svg>
              </div>
              <div className="profile-info-content">
                <span className="profile-info-label">Joined</span>
                <span className="profile-info-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SETTINGS SECTIONS ==================== */}
        <div className="profile-settings-group">
          {/* Edit Profile Section */}
          <div className="profile-settings-card">
            <div className="profile-settings-header">
              <div className="profile-settings-icon-bg profile-settings-icon-bg--blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div className="profile-settings-title-group">
                <h2 className="profile-settings-title">Edit Profile</h2>
                <p className="profile-settings-subtitle">Update your personal details</p>
              </div>
            </div>
            
            <button className="profile-action-button profile-action-button--blue" onClick={() => setActiveSection('edit')}>
              <div className="profile-action-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>Edit Profile Information</span>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Account Settings Section */}
          <div className="profile-settings-card">
            <div className="profile-settings-header">
              <div className="profile-settings-icon-bg profile-settings-icon-bg--purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <div className="profile-settings-title-group">
                <h2 className="profile-settings-title">Account</h2>
                <p className="profile-settings-subtitle">Manage your account settings</p>
              </div>
            </div>

            <div className="profile-action-rows">
              <button className="profile-action-row" onClick={() => setActiveSection('changePassword')}>
                <div className="profile-action-row-left">
                  <div className="profile-row-icon-bg profile-row-icon-bg--yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div className="profile-row-text">
                    <span className="profile-row-title">Change Password</span>
                    <span className="profile-row-subtitle">Update your password to keep your account secure</span>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>

              <button className="profile-action-row profile-action-row--logout" onClick={onLogout}>
                <div className="profile-action-row-left">
                  <div className="profile-row-icon-bg profile-row-icon-bg--red">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                  </div>
                  <div className="profile-row-text">
                    <span className="profile-row-title">Logout</span>
                    <span className="profile-row-subtitle">Sign out from your account</span>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
