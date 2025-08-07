import React, { useState } from 'react';
import axios from 'axios';

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
      const response = await axios.post('http://192.168.1.150:3001/api/auth/submit-verification', formData, {
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
          <div className="verification-info">
            <h2>🌟 Benefits of Verification</h2>
            <p className="verification-description">
              Please verify your account to access all features including report submission.
            </p>
            <ul className="benefits-list">
              <li>
                <span className="benefit-icon">✅</span>
                <div className="benefit-text">
                  <strong>Submit your own road hazard reports</strong>
                  <p>Report dangerous road conditions in your area</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">📊</span>
                <div className="benefit-text">
                  <strong>Access to personal report history</strong>
                  <p>View and track all your submitted reports</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">�</span>
                <div className="benefit-text">
                  <strong>Priority support and assistance</strong>
                  <p>Get faster responses and premium support</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">�</span>
                <div className="benefit-text">
                  <strong>Enhanced community features</strong>
                  <p>Join verified users and build safer roads together</p>
                </div>
              </li>
            </ul>
          </div>

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

              <div className="form-actions">
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
