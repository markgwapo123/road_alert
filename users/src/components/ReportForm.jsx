import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import { NEGROS_PROVINCES, NEGROS_CITIES, NEGROS_BARANGAYS } from '../data/negrosLocations.js';
import exifr from 'exifr';
import { applyPrivacyProtection } from '../utils/privacyProtection.js';
import { getReverseGeocode } from '../services/geocoding.js';
import { processGeocodedAddress } from '../utils/addressMatcher.js';

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
  
  // Location toggle state
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmType, setConfirmType] = useState(''); // 'success' or 'error'
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle location toggle
  const handleLocationToggle = async () => {
    const newState = !locationEnabled;
    setLocationEnabled(newState);
    
    if (newState) {
      // Toggle ON - Get location
      setDetectingLocation(true);
      setError('');
      setSuccess('🔍 Getting your location...');
      
      if (!navigator.geolocation) {
        setError('❌ Geolocation not supported on this device');
        setLocationEnabled(false);
        setDetectingLocation(false);
        return;
      }

      // Try high accuracy first, then fallback to lower accuracy
      const tryGetLocation = (enableHighAccuracy, timeoutDuration) => {
        return new Promise((resolve, reject) => {
          const options = {
            enableHighAccuracy,
            timeout: timeoutDuration,
            maximumAge: 0
          };
          
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      };

      try {
        let position;
        try {
          // First attempt: High accuracy with 30 second timeout
          setSuccess('🔍 Getting precise location (this may take up to 30 seconds)...');
          position = await tryGetLocation(true, 30000);
        } catch (firstError) {
          if (firstError.code === 3) { // TIMEOUT
            // Second attempt: Lower accuracy with 10 second timeout
            setSuccess('🔍 Trying faster location detection...');
            position = await tryGetLocation(false, 10000);
          } else {
            throw firstError; // Re-throw other errors
          }
        }

        // Process the position we got
        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 GPS Location:', { latitude, longitude, accuracy });
        
        setSuccess('✅ Location detected! Getting address...');
        
        // Get address from coordinates
        const addressData = await getReverseGeocode(latitude, longitude);
        console.log('🗺️ Full geocoded response:', addressData);
        console.log('🏷️ Raw labels:', {
          province: addressData.provinceLabel,
          city: addressData.cityLabel,
          barangay: addressData.barangayLabel
        });
        
        if (addressData && !addressData.error) {
          // Process and validate address
          let processedAddress = processGeocodedAddress(addressData);
          console.log('✅ Processed/matched address:', processedAddress);
              
              // SMART FALLBACK: If in Negros but city didn't match, help user
              if (!processedAddress.city && addressData.provinceLabel?.toLowerCase().includes('negros')) {
                console.log('⚠️ Detected Negros but city not matched. Showing province only.');
                processedAddress = {
                  ...processedAddress,
                  province: processedAddress.province || 'negros-occidental',
                  provinceLabel: addressData.provinceLabel
                };
              }
              
              console.log('📋 Will set form to:', {
                province: processedAddress.province || 'EMPTY',
                city: processedAddress.city || 'EMPTY',
                barangay: processedAddress.barangay || 'EMPTY'
              });
              
              // Update form with location data
              setForm(prevForm => ({
                ...prevForm,
                province: processedAddress.province || '',
                city: processedAddress.city || '',
                barangay: processedAddress.barangay || '',
                location: {
                  lat: latitude,
                  lng: longitude,
                  accuracy: accuracy,
                  address: addressData.fullAddress,
                  source: 'gps'
                }
              }));
              
              // Show success message
              const filledFields = [];
              if (processedAddress.province) filledFields.push('Province');
              if (processedAddress.city) filledFields.push('City');
              if (processedAddress.barangay) filledFields.push('Barangay');
              
              if (filledFields.length > 0) {
                setSuccess(`✅ Location detected! Auto-filled: ${filledFields.join(', ')}`);
              } else {
                // Show what was detected even if not in our dropdown options
                const detectedLocation = [
                  addressData.provinceLabel,
                  addressData.cityLabel,
                  addressData.barangayLabel
                ].filter(Boolean).join(', ');
                
                setSuccess(`✅ Location detected: ${detectedLocation}. ${
                  detectedLocation.toLowerCase().includes('negros') 
                    ? 'Please select the exact match from dropdowns below.' 
                    : '⚠️ You are outside Negros region. Please manually select your address or move to Negros area.'
                }`);
              }
            } else {
              setSuccess('✅ GPS location obtained. Please manually select your address.');
            }
            
        setDetectingLocation(false);
      } catch (error) {
        console.error('❌ Location error:', error);
        let errorMessage = '';
        
        if (error.code) {
          switch(error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = '❌ Location access denied. Please enable location permissions in your browser settings and try again.';
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = '❌ Location unavailable. Please ensure GPS/Location Services are enabled on your device.';
              break;
            case 3: // TIMEOUT
              errorMessage = '⏱️ Location detection is taking longer than usual. Please ensure you have a clear view of the sky and try again. You may also select your location manually.';
              break;
            default:
              errorMessage = '❌ Failed to get location. Please select your address manually.';
              break;
          }
        } else {
          // Geocoding error
          errorMessage = '❌ Failed to get address details. Please select manually.';
        }
        
        setError(errorMessage);
        setSuccess('');
        setLocationEnabled(false);
        setDetectingLocation(false);
      }
    } else {
      // Toggle OFF - Clear location data
      setSuccess('');
      setError('');
      setDetectingLocation(false);
      // Optional: Clear location fields or keep them for manual editing
      // Uncomment below to clear fields when toggle is turned off
      // setForm(prevForm => ({
      //   ...prevForm,
      //   province: '',
      //   city: '',
      //   barangay: '',
      //   location: null
      // }));
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setProcessingImage(true);
    setSuccess('🔒 Processing image with privacy protection...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply privacy protection (blur faces and hide license plates)
    try {
      await applyPrivacyProtection(canvas);
    } catch (error) {
      console.warn('⚠️ Privacy protection failed, proceeding without it:', error);
    }
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `road-alert-${timestamp}.jpg`, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        // Set the captured image in form
        setForm(f => ({ ...f, image: file }));
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        
        // Stop camera
        stopCamera();
        
        setProcessingImage(false);
        setSuccess('📷 Photo captured successfully with privacy protection!');
      }
    }, 'image/jpeg', 0.8);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const retakePhoto = () => {
    setForm(f => ({ ...f, image: null }));
    setCapturedImage(null);
    setSuccess('');
    startCamera();
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
          
          setSuccess('📍 Location from photo! Getting address...');
          
          // Get address from coordinates
          const addressData = await getReverseGeocode(exifData.latitude, exifData.longitude);
          
          if (addressData && !addressData.error) {
            setForm(f => ({ 
              ...f,
              province: addressData.province,
              city: addressData.city,
              barangay: addressData.barangay,
              location: {
                ...f.location,
                address: addressData.fullAddress
              }
            }));
            setSuccess(`📍 Photo location: ${addressData.city}, ${addressData.province}`);
          } else {
            setSuccess('📍 Location from photo GPS data (manual address entry required)');
          }
          
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
    setSuccess('⏳ Submitting report... Please wait up to 15 seconds.'); 
    setSubmitting(true);
    
    if (!form.location) {
      setError('📍 Location is required. Please turn on "Auto-Detect Location" toggle to get your GPS coordinates, or take a photo with GPS enabled.'); 
      setSubmitting(false); 
      return;
    }
    
    if (!form.image) {
      setError('Please select an image'); 
      setSubmitting(false); 
      return;
    }
    
    // Description is now optional, only validate if provided
    if (form.description && form.description.length < 10) {
      setError('Description must be at least 10 characters long');
      setSubmitting(false);
      return;
    }
    
    if (form.description && form.description.length > 500) {
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
    
    console.log('🌐 API Endpoint:', `${config.API_BASE_URL}/reports/user`);
    console.log('🔧 Config:', config);
    console.log('⏰ Sending request... (this may take up to 2 minutes if server is sleeping)');
    
    try {
      const response = await axios.post(`${config.API_BASE_URL}/reports/user`, data, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        timeout: 15000, // 15 second timeout (Render free tier can be slow)
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📤 Upload progress: ${percentCompleted}%`);
        }
      });
      
      console.log('Report submission response:', response.data);
      
      // Show success modal
      setConfirmType('success');
      setConfirmMessage('✅ Report submitted successfully! Your report has been sent for review and will be visible to other users once approved by our team.');
      setShowConfirmModal(true);
      
      // Clear the form
      setForm({ type: '', province: '', city: '', barangay: '', description: '', image: null, location: null });
      setCapturedImage(null);
      
      // Call the callback to refresh any parent components
      if (onReport) {
        setTimeout(() => {
          onReport();
        }, 1500);
      }
    } catch (err) {
      console.error('Report submission error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = '';
      
      if (err.response?.status === 413) {
        errorMessage = '❌ File is too large. Please select a smaller image (max 5MB).';
      } else if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData?.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map(detail => `• ${detail.msg || detail.message}`).join('\n');
          errorMessage = `❌ Validation Error:\n${detailMessages}`;
        } else {
          const errorMsg = errorData?.error || errorData?.message || 'Invalid form data';
          errorMessage = `❌ Validation Error: ${errorMsg}`;
        }
      } else if (err.response?.status === 401) {
        errorMessage = '❌ Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        const errorData = err.response.data;
        if (errorData?.frozen) {
          errorMessage = '🧊 Your account has been frozen. You cannot submit reports while your account is frozen.';
        } else {
          errorMessage = `❌ Access denied: ${errorData?.error || 'You are not authorized to perform this action.'}`;
        }
      } else if (err.response?.status === 500) {
        errorMessage = '❌ Server error. Please try again later or contact support.';
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED' || !err.response) {
        errorMessage = '❌ Cannot connect to server. Please check your internet connection and try again.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = '❌ Request timeout. The server took too long to respond. Please try again.';
      } else {
        errorMessage = `❌ ${err.response?.data?.message || err.response?.data?.error || 'Report submission failed. Please try again.'}`;
      }
      
      // Show error modal
      setConfirmType('error');
      setConfirmMessage(errorMessage);
      setShowConfirmModal(true);
    }
    setSubmitting(false);
  };

  // TEST MODE: Simulate Kabankalan location
  const handleTestLocation = () => {
    const testData = {
      province: 'negros-occidental',
      city: 'kabankalan',
      barangay: 'tagoc'
    };
    console.log('🧪 TEST MODE: Setting form to Kabankalan, Tagoc:', testData);
    setForm(prevForm => ({
      ...prevForm,
      province: testData.province,
      city: testData.city,
      barangay: testData.barangay
    }));
    alert(`TEST MODE: Set location to:\nProvince: Negros Occidental\nCity: Kabankalan\nBarangay: Tagoc`);
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
      
      {/* LOCATION TOGGLE */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        background: '#f0f9ff', 
        border: '2px solid #3b82f6', 
        borderRadius: '8px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📍</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1e40af' }}>
                Auto-Detect Location
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                {locationEnabled ? 'Automatically fill address fields using GPS' : 'Turn on to auto-fill province, city, and barangay'}
              </div>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <label style={{ 
            position: 'relative', 
            display: 'inline-block', 
            width: '60px', 
            height: '34px',
            cursor: 'pointer'
          }}>
            <input 
              type="checkbox" 
              checked={locationEnabled}
              onChange={handleLocationToggle}
              disabled={detectingLocation}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: locationEnabled ? '#3b82f6' : '#cbd5e1',
              transition: '0.4s',
              borderRadius: '34px',
              cursor: detectingLocation ? 'not-allowed' : 'pointer'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '26px',
                width: '26px',
                left: locationEnabled ? '30px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%'
              }}></span>
            </span>
          </label>
        </div>
        
        {/* Status Messages */}
        {detectingLocation && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            background: '#fef3c7', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#92400e'
          }}>
            🔍 Detecting your location...
          </div>
        )}
        
        {success && !detectingLocation && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            background: '#d1fae5', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#065f46'
          }}>
            {success}
          </div>
        )}
        
        {error && !detectingLocation && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            background: '#fee2e2', 
            borderRadius: '4px',
            fontSize: '0.9rem',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}
      </div>
      
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
            <span className="label-optional">(Optional)</span>
          </label>
          <textarea 
            name="description" 
            placeholder="Provide detailed information about the road condition or incident. Include landmarks, direction of travel, and any other relevant details..." 
            value={form.description} 
            onChange={handleChange} 
          />
          <div className="help-text">
            Be as specific as possible. Good descriptions help other drivers prepare and authorities respond quickly.
          </div>
        </div>

        {/* Camera Photo Capture */}
        <div className="form-group">
          <label>
            <span className="label-icon">📷</span>
            Photo Evidence
            <span className="label-required">*</span>
          </label>
          
          {!showCamera && !capturedImage && (
            <div className="camera-controls">
              <button 
                type="button" 
                onClick={startCamera}
                className="camera-btn start-camera"
              >
                <span className="camera-icon">📸</span>
                Take Photo with Camera
              </button>
              <div className="help-text">
                Click to open your device's camera and capture a photo of the road condition.
              </div>
            </div>
          )}

          {showCamera && (
            <div className="camera-container">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="camera-video"
                muted
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }}
              />
              <div className="camera-controls">
                <button 
                  type="button" 
                  onClick={capturePhoto}
                  className="camera-btn capture"
                  disabled={processingImage}
                >
                  {processingImage ? '🔒 Processing...' : '📸 Capture Photo'}
                </button>
                <button 
                  type="button" 
                  onClick={stopCamera}
                  className="camera-btn cancel"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="captured-photo">
              <img 
                src={capturedImage} 
                alt="Captured road condition" 
                className="captured-image"
              />
              <div className="photo-controls">
                <button 
                  type="button" 
                  onClick={retakePhoto}
                  className="camera-btn retake"
                >
                  🔄 Retake Photo
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setForm(f => ({ ...f, image: null }));
                    setCapturedImage(null);
                    setSuccess('');
                  }}
                  className="camera-btn remove"
                >
                  🗑️ Remove Photo
                </button>
              </div>
              {form.image && (
                <div className="file-info">
                  <span>📸</span>
                  Captured: {form.image.name} ({Math.round(form.image.size / 1024)} KB)
                </div>
              )}
            </div>
          )}

          <div className="help-text" style={{ display: 'none' }}>
            A clear photo helps verify the report and provides visual context. Please ensure the image shows the road condition clearly. 
            <strong>🔒 Privacy Protected:</strong> Faces and license plates will be automatically blurred for everyone's safety.
          </div>
        </div>

        {/* Location Detection */}
        {/* Location Display (read-only, controlled by toggle above) */}
        <div className="form-group">
          <label>
            <span className="label-icon">📍</span>
            Location
            <span className="label-required">*</span>
          </label>
          <div className="location-section">
            {form.location ? (
              <div className="location-display">
                <span className="location-pin">
                  {form.location.source === 'image_exif' ? '📷' : '📍'}
                </span>
                <div>
                  <div>
                    {form.location.source === 'image_exif' 
                      ? 'Location from photo GPS data' 
                      : form.location.source === 'gps'
                      ? `GPS Location Detected ${form.location.accuracy ? `(±${Math.round(form.location.accuracy)}m)` : ''}`
                      : 'Location confirmed'
                    }
                  </div>
                  {form.location.source === 'image_exif' && (
                    <div className="location-source">
                      📍 GPS coordinates extracted from image EXIF data
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '1rem', 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#92400e'
              }}>
                ⚠️ Location required. Please turn on the <strong>"Auto-Detect Location"</strong> toggle above to get your GPS location, or take a photo with GPS enabled.
              </div>
            )}
          </div>
          <div className="help-text" style={{ display: 'none' }}>
            📍 Location will be automatically detected when you enable the toggle above, or from photo GPS data if available. Your location will only be used for this report.
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '60px',
                marginBottom: '15px'
              }}>
                {confirmType === 'success' ? '✅' : '❌'}
              </div>
              <h3 style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: confirmType === 'success' ? '#10b981' : '#ef4444',
                marginBottom: '10px'
              }}>
                {confirmType === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p style={{
                fontSize: '16px',
                color: '#374151',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {confirmMessage}
              </p>
            </div>
            <button
              onClick={() => {
                setShowConfirmModal(false);
                if (confirmType === 'success' && onClose) {
                  onClose();
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: confirmType === 'success' ? '#10b981' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              {confirmType === 'success' ? 'Done' : 'Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportForm;
