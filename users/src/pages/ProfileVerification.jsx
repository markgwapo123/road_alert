import React, { useState } from 'react';
import axios from 'axios';

const ProfileVerification = ({ user, onVerified }) => {
  const [form, setForm] = useState({
    fullName: '',
    address: '',
    idNumber: '',
    idImage: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm(f => ({
      ...f,
      [name]: files ? files[0] : value
    }));
  };

  const detectLocation = () => {
    setError('');
    setLocating(true);
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      err => {
        setError('Failed to get location: ' + (err.message || 'Unknown error'));
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) data.append(k, v);
    });
    if (location) {
      data.append('lat', location.lat);
      data.append('lng', location.lng);
    }
    try {
      await axios.post('http://localhost:3001/api/users/verify', data, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Verification submitted!');
      onVerified && onVerified();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="verify-container">
      <h2>Verify Your Identity</h2>
      <form onSubmit={handleSubmit}>
        <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} required />
        <input name="idNumber" placeholder="ID Number" value={form.idNumber} onChange={handleChange} required />
        <label htmlFor="idImage">Upload ID Image:</label>
        <input id="idImage" name="idImage" type="file" accept="image/*" onChange={handleChange} required />
        <button type="button" onClick={detectLocation} disabled={!!location || locating}>
          {locating ? 'Detecting...' : location ? 'Location Detected' : 'Detect Location'}
        </button>
        {location && <div>📍 Location: {location.lat}, {location.lng}</div>}
        <button type="submit">Submit Verification</button>
      </form>
      {error && <div className="error" style={{color:'red'}}>{error}</div>}
      {success && <div className="success" style={{color:'green'}}>{success}</div>}
    </div>
  );
};

export default ProfileVerification;
