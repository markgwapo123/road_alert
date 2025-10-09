import React, { useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import { NEGROS_PROVINCES, NEGROS_CITIES, NEGROS_BARANGAYS } from '../data/negrosLocations.js';
import exifr from 'exifr';

const ALERT_TYPES = [
  { value: 'emergency', label: 'Emergency Alert', example: 'ROAD CLOSED - Accident Ahead' },
  { value: 'caution', label: 'Caution Alert', example: 'Road Work Zone - Slow Traffic' },
  { value: 'construction', label: 'Construction Alert', example: 'Detour - Construction Ahead' },
  { value: 'info', label: 'Information Alert', example: 'Weather Update - Rain Expected' },
  { value: 'safe', label: 'Safe Message', example: 'Route Reopened - All Clear' },
  { value: 'pothole', label: 'Pothole', example: 'Large pothole on main road' },
  { value: 'debris', label: 'Road Debris', example: 'Debris blocking traffic' },
  { value: 'flooding', label: 'Flooding', example: 'Road flooded - impassable' },
  { value: 'accident', label: 'Accident', example: 'Traffic accident reported' },
  { value: 'other', label: 'Other', example: 'Other road hazard' }
];

const ReportForm = ({ onReport, onClose }) => {
  const [form, setForm] = useState({
    type: '',
    province: '',
    city: '',
    barangay: '',
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

  // Extract GPS coordinates from image EXIF data
  const extractGPSFromImage = async (file) => {
    try {
      console.log('📍 Attempting to extract GPS data from image...');
      console.log('📍 File info:', { name: file.name, type: file.type, size: file.size });
      
      // Only attempt EXIF extraction for JPEG images (most likely to have GPS data)
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        console.log('ℹ️ Skipping EXIF extraction - not a JPEG image');
        return null;
      }
      
      // Read EXIF data from the image
      const exifData = await exifr.parse(file, {
        gps: true,
        pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp']
      });
      
      console.log('📍 EXIF data extracted:', exifData);
      
      // Check if GPS coordinates exist in EXIF data
      if (exifData && (exifData.latitude && exifData.longitude)) {
        // Validate coordinates are reasonable (within world bounds)
        if (exifData.latitude >= -90 && exifData.latitude <= 90 && 
            exifData.longitude >= -180 && exifData.longitude <= 180) {
          
          console.log('✅ Valid GPS coordinates found in image EXIF data:', {
            latitude: exifData.latitude,
            longitude: exifData.longitude
          });
          
          // Update location with GPS data from image
          setForm(f => ({ ...f, location: {
            lat: exifData.latitude,
            lng: exifData.longitude,
            source: 'image_exif' // Track the source of coordinates
          }}));
          
          setSuccess('📍 Location automatically detected from photo GPS data!');
          setError(''); // Clear any previous errors
          
          return {
            lat: exifData.latitude,
            lng: exifData.longitude,
            source: 'image_exif'
          };
        } else {
          console.log('❌ Invalid GPS coordinates in EXIF data');
          return null;
        }
      } else {
        console.log('ℹ️ No GPS data found in image EXIF');
        return null;
      }
    } catch (error) {
      console.error('❌ Error extracting GPS from image:', error);
      // Don't show error to user as this is an optional feature
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image' && files && files[0]) {
      const file = files[0];
      console.log('📷 File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toLocaleString()
      });
      
      // Validate file immediately
      if (file.size > 5 * 1024 * 1024) {
        setError('❌ File is too large. Please select an image smaller than 5MB.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('❌ Please select a valid image file (JPEG, PNG, GIF, etc.).');
        return;
      }
      
      // Clear any previous errors
      setError('');
      setSuccess('');
      
      setForm(f => ({ ...f, [name]: file }));
      console.log('✅ File successfully added to form state');
      
      // Attempt to extract GPS data from the image
      extractGPSFromImage(file).then(gpsData => {
        if (!gpsData && !form.location) {
          // If no GPS data in image and no location set, show manual location option
          console.log('ℹ️ No GPS data in image. User can manually detect location.');
        }
      });
    } else if (name === 'province') {
      // Reset city and barangay when province changes
      setForm(f => ({ ...f, province: value, city: '', barangay: '' }));
    } else if (name === 'city') {
      // Reset barangay when city changes
      setForm(f => ({ ...f, city: value, barangay: '' }));
    } else {
      setForm(f => ({ ...f, [name]: files ? files[0] : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setSuccess(''); 
    setSubmitting(true);
    
    if (!form.location) {
      setError('Please detect your location'); 
      setSubmitting(false); 
      return;
    }
    
    if (!form.image) {
      setError('Please select an image'); 
      setSubmitting(false); 
      return;
    }
    
    if (form.description.length < 10) {
      setError('Description must be at least 10 characters long');
      setSubmitting(false);
      return;
    }
    
    if (form.description.length > 500) {
      setError('Description must be less than 500 characters');
      setSubmitting(false);
      return;
    }
    
    // Validate image file
    if (form.image.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select a file smaller than 5MB.');
      setSubmitting(false);
      return;
    }
    
    if (!form.image.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      setSubmitting(false);
      return;
    }
    
    const data = new FormData();
    data.append('type', form.type);
    data.append('province', form.province);
    data.append('city', form.city);
    data.append('barangay', form.barangay);
    data.append('description', form.description);
    
    // Create readable address from selected locations
    const provinceLabel = NEGROS_PROVINCES.find(p => p.value === form.province)?.label;
    const cityLabel = NEGROS_CITIES[form.province]?.find(c => c.value === form.city)?.label;
    const barangayLabel = NEGROS_BARANGAYS[form.city]?.find(b => b.value === form.barangay)?.label;
    const fullAddress = `${barangayLabel}, ${cityLabel}, ${provinceLabel}`;
    
    data.append('location[address]', fullAddress);
    data.append('location[coordinates][latitude]', form.location.lat);
    data.append('location[coordinates][longitude]', form.location.lng);
    data.append('images', form.image); // Note: using 'images' to match multer field name
    
    console.log('Submitting form data:', {
      type: form.type,
      province: form.province,
      city: form.city,
      barangay: form.barangay,
      description: form.description,
      fullAddress: fullAddress,
      imageSize: form.image.size,
      imageType: form.image.type,
      location: form.location
    });
    
    try {
      const response = await axios.post(`${config.API_BASE_URL}/reports/user`, data, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Report submission response:', response.data);
      setSuccess('✅ Report submitted successfully! Your report has been sent for review and will be visible to other users once approved by our team.');
      
      // Clear the form
      setForm({ type: '', province: '', city: '', barangay: '', description: '', image: null, location: null });
      
      // Call the callback to refresh any parent components
      if (onReport) {
        setTimeout(() => {
          onReport();
        }, 1500); // Give user time to see the success message
      }
      
      // Auto-close the form after 3 seconds if onClose is available
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Report submission error:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 413) {
        setError('❌ File is too large. Please select a smaller image (max 5MB).');
      } else if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData?.details && Array.isArray(errorData.details)) {
          // Show detailed validation errors
          const detailMessages = errorData.details.map(detail => `• ${detail.msg || detail.message}`).join('\n');
          setError(`❌ Validation Error:\n${detailMessages}`);
        } else {
          const errorMsg = errorData?.error || errorData?.message || 'Invalid form data';
          setError(`❌ Validation Error: ${errorMsg}`);
        }
      } else if (err.response?.status === 401) {
        setError('❌ Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        const errorData = err.response.data;
        if (errorData?.frozen) {
          setError('🧊 Your account has been frozen. You cannot submit reports while your account is frozen. You can still view the news feed and existing reports.');
        } else {
          setError(`❌ Access denied: ${errorData?.error || 'You are not authorized to perform this action.'}`);
        }
      } else if (err.response?.status === 500) {
        setError('❌ Server error. Please try again later or contact support.');
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED' || !err.response) {
        setError('❌ Cannot connect to server. Please check if the backend server is running and try again.');
      } else if (err.code === 'ECONNABORTED') {
        setError('❌ Request timeout. Please check your internet connection and try again.');
      } else {
        setError(`❌ ${err.response?.data?.message || err.response?.data?.error || 'Report submission failed. Please try again.'}`);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="report-form-container">
      <div className="form-header">
        <h2>Submit a Report</h2>
        {onClose && (
          <button 
            type="button" 
            className="close-form-btn" 
            onClick={onClose}
            aria-label="Close form"
          >
            ✕
          </button>
        )}
      </div>
      <p className="form-subtitle">
        Help keep our roads safe by reporting hazards, construction, or incidents in your area.
      </p>
      
      <form onSubmit={handleSubmit}>
        {/* Alert Type Selection */}
        <div className="form-group">
          <label>
            <span className="label-icon">🚨</span>
            Alert Type
            <span className="label-required">*</span>
          </label>
          <select name="type" value={form.type} onChange={handleChange} required>
            <option value="">Choose the type of alert...</option>
            {ALERT_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label} - {t.example}
              </option>
            ))}
          </select>
          <div className="help-text">
            Select the category that best describes the road condition or incident.
          </div>
        </div>

        {/* Province Selection */}
        <div className="form-group">
          <label>
            <span className="label-icon">🏝️</span>
            Province
            <span className="label-required">*</span>
          </label>
          <select name="province" value={form.province} onChange={handleChange} required>
            <option value="">Select province...</option>
            {NEGROS_PROVINCES.map(province => (
              <option key={province.value} value={province.value}>
                {province.label}
              </option>
            ))}
          </select>
          <div className="help-text">
            Select the province in Negros Island where the incident is located.
          </div>
        </div>

        {/* City Selection */}
        <div className="form-group">
          <label>
            <span className="label-icon">🏙️</span>
            City/Municipality
            <span className="label-required">*</span>
          </label>
          <select 
            name="city" 
            value={form.city} 
            onChange={handleChange} 
            required
            disabled={!form.province}
          >
            <option value="">
              {form.province ? 'Select city/municipality...' : 'Please select a province first'}
            </option>
            {form.province && NEGROS_CITIES[form.province] && NEGROS_CITIES[form.province].map(city => (
              <option key={city.value} value={city.value}>
                {city.label}
              </option>
            ))}
          </select>
          <div className="help-text">
            Select the city or municipality where the road incident is located.
          </div>
        </div>

        {/* Barangay Selection */}
        <div className="form-group">
          <label>
            <span className="label-icon">📍</span>
            Barangay
            <span className="label-required">*</span>
          </label>
          <select 
            name="barangay" 
            value={form.barangay} 
            onChange={handleChange} 
            required
            disabled={!form.city}
          >
            <option value="">
              {form.city ? 'Select barangay...' : 'Please select a city/municipality first'}
            </option>
            {form.city && NEGROS_BARANGAYS[form.city] && NEGROS_BARANGAYS[form.city].map(barangay => (
              <option key={barangay.value} value={barangay.value}>
                {barangay.label}
              </option>
            ))}
          </select>
          <div className="help-text">
            Select the specific barangay where the incident occurred.
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>
            <span className="label-icon">📝</span>
            Description
            <span className="label-required">*</span>
          </label>
          <textarea 
            name="description" 
            placeholder="Provide detailed information about the road condition or incident. Include landmarks, direction of travel, and any other relevant details..." 
            value={form.description} 
            onChange={handleChange} 
            required 
          />
          <div className="help-text">
            Be as specific as possible. Good descriptions help other drivers prepare and authorities respond quickly.
          </div>
        </div>

        {/* Image Upload */}
        <div className="form-group">
          <label>
            <span className="label-icon">📷</span>
            Photo Evidence
            <span className="label-required">*</span>
          </label>
          <div className="file-input-wrapper">
            <div className={`file-input-custom ${form.image ? 'file-selected' : ''}`}>
              <input 
                name="image" 
                type="file" 
                accept="image/*" 
                onChange={handleChange} 
                required
                style={{ display: 'none' }}
                id="image-input"
              />
              <label htmlFor="image-input" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                <span className="upload-icon">
                  {form.image ? '✅' : '📷'}
                </span>
                {form.image ? `Selected: ${form.image.name}` : 'Click to choose photo to upload'}
              </label>
            </div>
          </div>
          {form.image && (
            <div className="file-info">
              <span>📸</span>
              File: {form.image.name} ({Math.round(form.image.size / 1024)} KB)
              <button 
                type="button" 
                onClick={() => {
                  setForm(f => ({ ...f, image: null }));
                  document.getElementById('image-input').value = '';
                }}
                style={{ marginLeft: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}
              >
                ✕ Remove
              </button>
            </div>
          )}
          <div className="help-text">
            A clear photo helps verify the report and provides visual context. Please ensure the image shows the road condition clearly.
            <br />
            <small>Supported formats: JPG, PNG, GIF. Max size: 5MB</small>
          </div>
        </div>

        {/* Location Detection */}
        <div className="form-group">
          <label>
            <span className="label-icon">📍</span>
            Location
            <span className="label-required">*</span>
          </label>
          <div className="location-section">
            <button 
              type="button" 
              className="location-button"
              onClick={getLocation} 
              disabled={submitting}
            >
              <span className="location-icon">
                {form.location && form.location.source !== 'image_exif' ? '✅' : '📍'}
              </span>
              {form.location && form.location.source !== 'image_exif' ? 'Current Location Detected' : 'Use Current Location'}
            </button>
            
            {form.location && form.location.source === 'image_exif' && (
              <button 
                type="button" 
                className="location-button secondary"
                onClick={() => {
                  setForm(f => ({ ...f, location: null }));
                  setSuccess('');
                }}
                disabled={submitting}
                style={{ marginLeft: '10px', background: '#6b7280' }}
              >
                📍 Use Current Location Instead
              </button>
            )}
            
            {form.location && (
              <div className="location-display">
                <span className="location-pin">
                  {form.location.source === 'image_exif' ? '�' : '�📍'}
                </span>
                <div>
                  <div>
                    {form.location.source === 'image_exif' 
                      ? 'Location from photo GPS data' 
                      : 'Location confirmed'
                    }
                  </div>
                  <div className="location-coordinates">
                    {form.location.lat.toFixed(6)}, {form.location.lng.toFixed(6)}
                  </div>
                  {form.location.source === 'image_exif' && (
                    <div className="location-source">
                      📍 GPS coordinates extracted from image EXIF data
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="help-text">
            📍 Location will be automatically detected from photo GPS data if available, or you can manually detect your current location. Your location will only be used for this report.
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="submit-button"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="button-spinner"></div>
              Submitting Report...
            </>
          ) : (
            <>
              <span className="submit-icon">🚀</span>
              Submit Report
            </>
          )}
        </button>
        
        {submitting && (
          <div style={{ textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '14px' }}>
            📤 Uploading image and processing your report...
          </div>
        )}
      </form>
      
      {error && (
        <div className="error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {success && (
        <div className="success">
          <span className="alert-icon">✅</span>
          {success}
          <div style={{ marginTop: '10px', fontSize: '14px', opacity: '0.8' }}>
            📧 You will receive a notification when your report is reviewed.
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
