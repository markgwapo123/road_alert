import React, { useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const VerificationPage = ({ onVerificationComplete, onBack }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    idNumber: '',
    idType: 'national_id'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${config.API_BASE_URL}/auth/submit-verification`, formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setSuccess('Verification submitted successfully! Your account will be reviewed.');
        setTimeout(() => {
          onVerificationComplete();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="verification-header">
          <button className="back-btn" onClick={onBack}>
            ← Back
          </button>
          <div className="header-content">
            <div className="verification-icon">🔐</div>
            <h1>Account Verification</h1>
            <p>Complete your profile to verify your account and unlock all features</p>
          </div>
        </div>

        <div className="verification-content">
          <div className="verification-form-container">
            <form onSubmit={handleSubmit} className="verification-form">
              <h3>Personal Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="Enter your complete address"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="idType">ID Type</label>
                  <select
                    id="idType"
                    name="idType"
                    value={formData.idType}
                    onChange={handleChange}
                    required
                  >
                    <option value="national_id">National ID</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="passport">Passport</option>
                    <option value="postal_id">Postal ID</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="idNumber">ID Number</label>
                  <input
                    type="text"
                    id="idNumber"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    required
                    placeholder="Enter your ID number"
                  />
                </div>
              </div>

              <div className="verification-info" style={{ 
                marginTop: '32px', 
                marginBottom: '32px',
                background: '#f8f9fa',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#1f2937' }}>🌟 Benefits of Verification</h2>
                <p className="verification-description" style={{ marginBottom: '20px', color: '#6b7280' }}>
                  Please verify your account to access all features including report submission.
                </p>
                <ul className="benefits-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span className="benefit-icon" style={{ marginRight: '12px', fontSize: '18px' }}>✅</span>
                    <div className="benefit-text">
                      <strong style={{ color: '#1f2937', fontSize: '14px' }}>Submit your own road hazard reports</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Report dangerous road conditions in your area</p>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span className="benefit-icon" style={{ marginRight: '12px', fontSize: '18px' }}>📊</span>
                    <div className="benefit-text">
                      <strong style={{ color: '#1f2937', fontSize: '14px' }}>Access to personal report history</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>View and track all your submitted reports</p>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span className="benefit-icon" style={{ marginRight: '12px', fontSize: '18px' }}>💎</span>
                    <div className="benefit-text">
                      <strong style={{ color: '#1f2937', fontSize: '14px' }}>Priority support and assistance</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Get faster responses and premium support</p>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0' }}>
                    <span className="benefit-icon" style={{ marginRight: '12px', fontSize: '18px' }}>🤝</span>
                    <div className="benefit-text">
                      <strong style={{ color: '#1f2937', fontSize: '14px' }}>Enhanced community features</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>Join verified users and build safer roads together</p>
                    </div>
                  </li>
                </ul>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  {success}
                </div>
              )}

              <div className="form-actions" style={{ 
                marginTop: '40px', 
                paddingTop: '24px', 
                borderTop: '1px solid #e5e7eb' 
              }}>
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={onBack}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Verification'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;
