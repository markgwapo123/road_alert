import React, { useState } from 'react';
import axios from 'axios';

const REPORT_TYPES = [
  'pothole', 'debris', 'flooding', 'construction', 'accident'
];
const SEVERITIES = ['high', 'medium', 'low'];

const ReportForm = ({ onReport }) => {
  const [form, setForm] = useState({
    type: '',
    severity: '',
    description: '',
    image: null,
    location: null,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get geolocation
  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({ ...f, location: {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }})),
      err => setError('Failed to get location')
    );
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm(f => ({ ...f, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    if (!form.location) {
      setError('Please detect your location'); setSubmitting(false); return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    try {
      await axios.post('http://localhost:3001/api/reports', data, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccess('Report submitted!');
      setForm({ type: '', severity: '', description: '', image: null, location: null });
      onReport && onReport();
    } catch (err) {
      setError(err.response?.data?.message || 'Report failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="report-form-container">
      <h2>Submit a Report</h2>
      <form onSubmit={handleSubmit}>
        <select name="type" value={form.type} onChange={handleChange} required>
          <option value="">Select Type</option>
          {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select name="severity" value={form.severity} onChange={handleChange} required>
          <option value="">Select Severity</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required />
        <input name="image" type="file" accept="image/*" onChange={handleChange} required />
        <button type="button" onClick={getLocation} disabled={!!form.location}>Detect Location</button>
        {form.location && <div>📍 Location: {form.location.lat}, {form.location.lng}</div>}
        <button type="submit" disabled={submitting}>Submit Report</button>
      </form>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
    </div>
  );
};

export default ReportForm;
