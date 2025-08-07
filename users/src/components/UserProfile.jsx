import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UserProfile = ({ onLogout, isVerified, onVerify }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('http://192.168.1.150:3001/api/auth/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(res.data);
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
          <span className="avatar-icon">👤</span>
        </div>
        <div className="user-info">
          <h3 className="user-name">{user.username}</h3>
        </div>
      </div>

      <div className="profile-details">
        <div className="section-header">
          <h4 className="section-title">
            <span className="section-icon">📊</span>
            Account Information
            {isVerified && (
              <span className="verified-badge">
                <span className="verified-icon">✅</span>
                Verified Account
              </span>
            )}
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
        {isVerified && user.verificationData && (
          <>
            <div className="verification-data-section">
              <h4 className="section-title">
                <span className="section-icon">🔐</span>
                Verified Information
              </h4>
              
              <div className="detail-item">
                <span className="detail-label">👤 Full Name</span>
                <span className="detail-value">
                  {user.verificationData.firstName} {user.verificationData.lastName}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">📱 Phone Number</span>
                <span className="detail-value">{user.verificationData.phone}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">🏠 Address</span>
                <span className="detail-value">{user.verificationData.address}</span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">🆔 ID Type</span>
                <span className="detail-value">
                  {user.verificationData.idType?.replace('_', ' ').toUpperCase() || 'Not specified'}
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">📅 Verified On</span>
                <span className="detail-value">
                  {user.verificationData.verifiedAt 
                    ? new Date(user.verificationData.verifiedAt).toLocaleDateString()
                    : 'Not available'
                  }
                </span>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">📝 Submitted On</span>
                <span className="detail-value">
                  {user.verificationData.submittedAt 
                    ? new Date(user.verificationData.submittedAt).toLocaleDateString()
                    : 'Not available'
                  }
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="profile-actions">
        {!isVerified && (
          <button className="verify-btn primary-btn" onClick={onVerify}>
            <span className="btn-icon">🔐</span>
            Verify Account
          </button>
        )}
        
        <button className="logout-btn secondary-btn" onClick={onLogout}>
          <span className="btn-icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
