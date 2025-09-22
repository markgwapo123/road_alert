import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const UserProfile = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
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
        if (res.data && res.data.success) {
          setUser(res.data.data);
        } else {
          setError('Invalid response format');
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) return (
    <div className="user-profile modern-profile">
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="user-profile modern-profile">
      <div className="profile-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
      </div>
    </div>
  );
  
  if (!user) return null;

  return (
    <div className="user-profile modern-profile">
      <div className="profile-header">
        <div className="user-avatar">
          {profileImage ? (
            <img src={profileImage} alt="Profile" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span className="avatar-icon">👤</span>
          )}
        </div>
        <div className="user-info">
          <h3 className="user-name">{user.username}</h3>
        </div>
      </div>

      <div className="profile-details">
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="profile-image-upload" style={{ fontWeight: 500 }}>Upload Profile Image:</label>
          <input id="profile-image-upload" type="file" accept="image/*" onChange={handleImageChange} style={{ marginLeft: 8 }} />
        </div>
        <div className="section-header">
          <h4 className="section-title">
            <span className="section-icon">📊</span>
            Account Information
            {/* Verification badge removed */}
          </h4>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">📧 Email</span>
          <span className="detail-value">{user.email}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">👥 Account Type</span>
          <span className="detail-value">{user.type === 'admin' ? 'Administrator' : 'User'}</span>
        </div>

        {/* Show verification data if user is verified */}
        {/* Verification data section removed */}
      </div>

      <div className="profile-actions">
        {/* Verify Account button removed */}
        
        <button className="logout-btn secondary-btn" onClick={onLogout}>
          <span className="btn-icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
