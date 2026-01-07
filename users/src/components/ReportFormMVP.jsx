import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import { NEGROS_PROVINCES, NEGROS_CITIES, NEGROS_BARANGAYS } from '../data/negrosLocations.js';
import exifr from 'exifr';
import { applyAIPrivacyProtection, preloadModel } from '../utils/aiPrivacyProtection.js';
import { getReverseGeocode } from '../services/geocoding.js';
import { processGeocodedAddress } from '../utils/addressMatcher.js';
import { useSettings } from '../context/SettingsContext.jsx';

const ALERT_TYPES = [
  { value: 'emergency', label: 'Emergency Alert', icon: '🚨', example: 'ROAD CLOSED - Accident Ahead' },
  { value: 'caution', label: 'Caution Alert', icon: '⚠️', example: 'Road Work Zone - Slow Traffic' },
  { value: 'construction', label: 'Construction', icon: '🚧', example: 'Detour - Construction Ahead' },
  { value: 'info', label: 'Information', icon: 'ℹ️', example: 'Weather Update - Rain Expected' },
  { value: 'safe', label: 'Safe Message', icon: '✅', example: 'Route Reopened - All Clear' },
  { value: 'pothole', label: 'Pothole', icon: '🕳️', example: 'Large pothole on main road' },
  { value: 'debris', label: 'Road Debris', icon: '🪨', example: 'Debris blocking traffic' },
  { value: 'flooding', label: 'Flooding', icon: '🌊', example: 'Road flooded - impassable' },
  { value: 'accident', label: 'Accident', icon: '🚗', example: 'Traffic accident reported' },
  { value: 'other', label: 'Other', icon: '❓', example: 'Other road hazard' }
];

const ReportFormMVP = ({ onReport, onClose }) => {
  // Get settings for report requirements
  const { getReportConfig, getSetting } = useSettings();
  const reportConfig = getReportConfig();
  
  // Instruction screen state
  const [showInstructions, setShowInstructions] = useState(true);
  
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
  
  // Daily limit state
  const [dailyLimit, setDailyLimit] = useState(null);
  const [checkingLimit, setCheckingLimit] = useState(true);
  
  // AI Privacy state for display
  const [aiStatus, setAiStatus] = useState({ faces: 0, people: 0, plates: 0, active: false });

  // Check daily limit on component mount
  useEffect(() => {
    checkDailyLimit();
  }, []);

  const checkDailyLimit = async () => {
    try {
      setCheckingLimit(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setCheckingLimit(false);
        return;
      }
      
      const res = await axios.get(`${config.API_BASE_URL}/reports/daily-limit`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setDailyLimit(res.data.dailyLimit);
        
        // If user has reached limit, show error
        if (!res.data.dailyLimit.canSubmit) {
          setError(`You have reached your daily limit of ${res.data.dailyLimit.maxReports} reports. Please try again tomorrow.`);
        }
      }
    } catch (err) {
      console.error('Failed to check daily limit:', err);
    } finally {
      setCheckingLimit(false);
    }
  };

  // Preload AI face detection model on component mount
  useEffect(() => {
    preloadModel().catch(err => {
      console.warn('⚠️ Failed to preload face detection model:', err);
    });
  }, []);

  // Handle location toggle
  const handleLocationToggle = async () => {
    const newState = !locationEnabled;
    setLocationEnabled(newState);
    
    if (newState) {
      setDetectingLocation(true);
      setError('');
      setSuccess('Getting your location...');
      
      if (!navigator.geolocation) {
        setError('Geolocation not supported on this device');
        setLocationEnabled(false);
        setDetectingLocation(false);
        return;
      }

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
          setSuccess('Getting precise location...');
          position = await tryGetLocation(true, 30000);
        } catch (firstError) {
          if (firstError.code === 3) {
            setSuccess('Trying faster location detection...');
            position = await tryGetLocation(false, 10000);
          } else {
            throw firstError;
          }
        }

        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 GPS Location:', { latitude, longitude, accuracy });
        
        setSuccess('Location detected! Getting address...');
        
        const addressData = await getReverseGeocode(latitude, longitude);
        console.log('🗺️ Full geocoded response:', addressData);
        
        if (addressData && !addressData.error) {
          let processedAddress = processGeocodedAddress(addressData);
          console.log('✅ Processed/matched address:', processedAddress);
          
          if (!processedAddress.city && addressData.provinceLabel?.toLowerCase().includes('negros')) {
            processedAddress = {
              ...processedAddress,
              province: processedAddress.province || 'negros-occidental',
              provinceLabel: addressData.provinceLabel
            };
          }
          
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
          
          const filledFields = [];
          if (processedAddress.province) filledFields.push('Province');
          if (processedAddress.city) filledFields.push('City');
          if (processedAddress.barangay) filledFields.push('Barangay');
          
          if (filledFields.length > 0) {
            setSuccess(`Location detected! Auto-filled: ${filledFields.join(', ')}`);
          } else {
            const detectedLocation = [
              addressData.provinceLabel,
              addressData.cityLabel,
              addressData.barangayLabel
            ].filter(Boolean).join(', ');
            
            setSuccess(`Location detected: ${detectedLocation}. ${
              detectedLocation.toLowerCase().includes('negros') 
                ? 'Please select the exact match from dropdowns.' 
                : 'You are outside Negros region. Please manually select your address.'
            }`);
          }
        } else {
          setSuccess('GPS location obtained. Please manually select your address.');
        }
        
        setDetectingLocation(false);
      } catch (error) {
        console.error('❌ Location error:', error);
        let errorMessage = '';
        
        if (error.code) {
          switch(error.code) {
            case 1:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case 2:
              errorMessage = 'Location unavailable. Please ensure GPS is enabled.';
              break;
            case 3:
              errorMessage = 'Location detection timeout. You may select your location manually.';
              break;
            default:
              errorMessage = 'Failed to get location. Please select manually.';
              break;
          }
        } else {
          errorMessage = 'Failed to get address details. Please select manually.';
        }
        
        setError(errorMessage);
        setSuccess('');
        setLocationEnabled(false);
        setDetectingLocation(false);
      }
    } else {
      setSuccess('');
      setError('');
      setDetectingLocation(false);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      setSuccess('Opening camera...');
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const [mediaStream] = await Promise.all([
        navigator.mediaDevices.getUserMedia(constraints),
        preloadModel().catch(err => {
          console.warn('⚠️ Model preload warning:', err);
          return null;
        })
      ]);
      
      setStream(mediaStream);
      setShowCamera(true);
      setSuccess('Camera ready! AI models loaded.');
      setAiStatus(prev => ({ ...prev, active: true }));
      
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
    setSuccess('Capturing image...');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setSuccess('AI detecting faces and vehicles...');
    
    try {
      const startTime = Date.now();
      const result = await applyAIPrivacyProtection(canvas);
      const processingTime = Date.now() - startTime;
      
      console.log(`⚡ Privacy protection completed in ${processingTime}ms`);
      
      // Update AI status
      setAiStatus({
        faces: result.facesDetected || 0,
        people: result.peopleDetected || 0,
        plates: result.vehiclesDetected || 0,
        active: true
      });
      
      if (result.totalBlurred > 0) {
        const details = [];
        if (result.facesDetected > 0) details.push(`${result.facesDetected} face(s)`);
        if (result.peopleDetected > 0) details.push(`${result.peopleDetected} head(s)`);
        if (result.vehiclesDetected > 0) details.push(`${result.vehiclesDetected} plate(s)`);
        setSuccess(`Privacy protected: ${details.join(', ')} blurred`);
      } else {
        setSuccess('Image captured - no faces or plates detected');
      }
    } catch (error) {
      console.warn('⚠️ Privacy protection failed:', error);
      setSuccess('Image captured');
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `road-alert-${timestamp}.jpg`, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        setForm(f => ({ ...f, image: file }));
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
        setProcessingImage(false);
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
    setAiStatus({ faces: 0, people: 0, plates: 0, active: false });
    startCamera();
  };

  // Extract GPS from image EXIF
  const extractGPSFromImage = async (file) => {
    try {
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        return null;
      }
      
      const exifData = await exifr.parse(file, {
        gps: true,
        pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp']
      });
      
      if (exifData && (exifData.latitude && exifData.longitude)) {
        if (exifData.latitude >= -90 && exifData.latitude <= 90 && 
            exifData.longitude >= -180 && exifData.longitude <= 180) {
          
          setForm(f => ({ ...f, location: {
            lat: exifData.latitude,
            lng: exifData.longitude,
            source: 'image_exif'
          }}));
          
          setSuccess('Location extracted from photo!');
          
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
            setSuccess(`Photo location: ${addressData.city}, ${addressData.province}`);
          }
          
          setError('');
          
          return {
            lat: exifData.latitude,
            lng: exifData.longitude,
            source: 'image_exif'
          };
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error extracting GPS from image:', error);
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'image' && files && files[0]) {
      const file = files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Please select an image smaller than 5MB.');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      
      setError('');
      setSuccess('');
      setForm(f => ({ ...f, [name]: file }));
      
      extractGPSFromImage(file).then(gpsData => {
        if (!gpsData && !form.location) {
          console.log('ℹ️ No GPS data in image.');
        }
      });
    } else if (name === 'province') {
      setForm(f => ({ ...f, province: value, city: '', barangay: '' }));
    } else if (name === 'city') {
      setForm(f => ({ ...f, city: value, barangay: '' }));
    } else {
      setForm(f => ({ ...f, [name]: files ? files[0] : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setSuccess('Submitting report...'); 
    setSubmitting(true);
    
    if (reportConfig.requireLocation && !form.location) {
      setError('Location is required. Please turn on "Auto-Detect Location" or take a photo with GPS enabled.'); 
      setSubmitting(false); 
      return;
    }
    
    if (reportConfig.requireImage && !form.image) {
      setError('An image is required for this report.'); 
      setSubmitting(false); 
      return;
    }
    
    if (form.description && form.description.length > 500) {
      setError('Description must be less than 500 characters');
      setSubmitting(false);
      return;
    }
    
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
    
    const provinceLabel = NEGROS_PROVINCES.find(p => p.value === form.province)?.label;
    const cityLabel = NEGROS_CITIES[form.province]?.find(c => c.value === form.city)?.label;
    const barangayLabel = NEGROS_BARANGAYS[form.city]?.find(b => b.value === form.barangay)?.label;
    const fullAddress = `${barangayLabel}, ${cityLabel}, ${provinceLabel}`;
    
    data.append('location[address]', fullAddress);
    data.append('location[coordinates][latitude]', form.location.lat);
    data.append('location[coordinates][longitude]', form.location.lng);
    data.append('images', form.image);
    
    try {
      const response = await axios.post(`${config.API_BASE_URL}/reports/user`, data, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        timeout: 15000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📤 Upload progress: ${percentCompleted}%`);
        }
      });
      
      console.log('Report submission response:', response.data);
      
      setConfirmType('success');
      setConfirmMessage('Report submitted successfully');
      setShowConfirmModal(true);
      
      checkDailyLimit();
      
      setTimeout(() => {
        setShowConfirmModal(false);
        if (onClose) {
          onClose();
        }
      }, 3000);
      
      setForm({ type: '', province: '', city: '', barangay: '', description: '', image: null, location: null });
      setCapturedImage(null);
      setAiStatus({ faces: 0, people: 0, plates: 0, active: false });
      
      if (onReport) {
        setTimeout(() => {
          onReport();
        }, 1500);
      }
    } catch (err) {
      console.error('Report submission error:', err);
      
      let errorMessage = '';
      
      if (err.response?.status === 413) {
        errorMessage = 'File is too large. Please select a smaller image (max 5MB).';
      } else if (err.response?.status === 429) {
        const errorData = err.response.data;
        errorMessage = errorData?.error || 'Daily report limit reached. Please try again tomorrow.';
        checkDailyLimit();
      } else if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData?.details && Array.isArray(errorData.details)) {
          const detailMessages = errorData.details.map(detail => `• ${detail.msg || detail.message}`).join('\n');
          errorMessage = `Validation Error:\n${detailMessages}`;
        } else {
          errorMessage = `Validation Error: ${errorData?.error || errorData?.message || 'Invalid form data'}`;
        }
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (err.response?.status === 403) {
        const errorData = err.response.data;
        if (errorData?.frozen) {
          errorMessage = 'Your account has been frozen. You cannot submit reports.';
        } else {
          errorMessage = errorData?.error || 'You are not authorized to perform this action.';
        }
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNREFUSED' || !err.response) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = err.response?.data?.message || err.response?.data?.error || 'Report submission failed.';
      }
      
      setConfirmType('error');
      setConfirmMessage(errorMessage);
      setShowConfirmModal(true);
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setForm({ type: '', province: '', city: '', barangay: '', description: '', image: null, location: null });
    setCapturedImage(null);
    setSuccess('');
    setError('');
    setLocationEnabled(false);
    setAiStatus({ faces: 0, people: 0, plates: 0, active: false });
    if (stream) stopCamera();
  };

  // Get selected hazard type info
  const selectedHazard = ALERT_TYPES.find(t => t.value === form.type);

  // ==================== INSTRUCTION SCREEN ====================
  if (showInstructions) {
    return (
      <div className="mvp-report-overlay">
        <div className="mvp-report-modal mvp-instructions-modal">
          {/* Header */}
          <header className="mvp-report-header mvp-instructions-header">
            <div className="mvp-header-content">
              <h1 className="mvp-report-title">📋 How to Submit a Report</h1>
              <p className="mvp-report-subtitle">Quick guide to reporting road hazards</p>
            </div>
            <button 
              type="button" 
              className="mvp-close-btn" 
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          {/* Instructions Content */}
          <div className="mvp-instructions-content">
            {/* Steps */}
            <div className="mvp-steps-container">
              <div className="mvp-step">
                <div className="mvp-step-icon">🚧</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 1: Choose Hazard Type</h3>
                  <p className="mvp-step-desc">Select the type of road hazard (e.g., pothole, flood, accident).</p>
                </div>
              </div>

              <div className="mvp-step">
                <div className="mvp-step-icon">📝</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 2: Add Description</h3>
                  <p className="mvp-step-desc">Provide a clear and brief description of the hazard.</p>
                </div>
              </div>

              <div className="mvp-step">
                <div className="mvp-step-icon">📍</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 3: Set Location</h3>
                  <p className="mvp-step-desc">Use GPS or select your location from the dropdown.</p>
                </div>
              </div>

              <div className="mvp-step">
                <div className="mvp-step-icon">📷</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 4: Take or Upload Photos</h3>
                  <p className="mvp-step-desc">Capture or upload clear photos of the hazard.</p>
                </div>
              </div>

              <div className="mvp-step">
                <div className="mvp-step-icon">🔒</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 5: Privacy Protection</h3>
                  <p className="mvp-step-desc">Faces and license plates are automatically blurred.</p>
                </div>
              </div>

              <div className="mvp-step">
                <div className="mvp-step-icon">📤</div>
                <div className="mvp-step-content">
                  <h3 className="mvp-step-title">Step 6: Submit Report</h3>
                  <p className="mvp-step-desc">Review your details and submit the report.</p>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="mvp-privacy-notice">
              <div className="mvp-privacy-notice-icon">🛡️</div>
              <div className="mvp-privacy-notice-text">
                <strong>Your privacy is protected.</strong> Faces and license plates in images are automatically blurred using AI.
              </div>
            </div>

            {/* Tips & Reminders */}
            <div className="mvp-tips-section">
              <h4 className="mvp-tips-title">Tips & Reminders</h4>
              <ul className="mvp-tips-list">
                <li><span className="mvp-tip-check">✔</span> Make sure all required fields are filled</li>
                <li><span className="mvp-tip-check">✔</span> Location and photos improve report accuracy</li>
                <li><span className="mvp-tip-check">✔</span> You can submit anonymously</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <footer className="mvp-instructions-footer">
            <button 
              type="button" 
              onClick={onClose}
              className="mvp-btn mvp-btn-text"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => setShowInstructions(false)}
              className="mvp-btn mvp-btn-continue"
            >
              <span>Got it, Continue</span>
              <span className="mvp-btn-arrow">→</span>
            </button>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="mvp-report-overlay">
      <div className="mvp-report-modal">
        {/* ==================== HEADER ==================== */}
        <header className="mvp-report-header">
          <div className="mvp-header-content">
            <h1 className="mvp-report-title">🚨 Submit Road Hazard Report</h1>
            <p className="mvp-report-subtitle">Help keep roads safe by reporting hazards</p>
          </div>
          <button 
            type="button" 
            className="mvp-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        {/* ==================== SCROLLABLE CONTENT ==================== */}
        <div className="mvp-report-content">
          {/* Global Messages */}
          {error && (
            <div className="mvp-message mvp-message-error">
              <span className="mvp-message-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={() => setError('')} className="mvp-message-close">×</button>
            </div>
          )}
          
          {success && !error && (
            <div className="mvp-message mvp-message-success">
              <span className="mvp-message-icon">✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mvp-report-form">
            
            {/* ==================== SECTION 1: HAZARD DETAILS ==================== */}
            <section className="mvp-form-section">
              <div className="mvp-section-header">
                <span className="mvp-section-icon">🚧</span>
                <h2 className="mvp-section-title">Hazard Details</h2>
              </div>
              
              <div className="mvp-section-card">
                {/* Hazard Type - Icon Grid */}
                <div className="mvp-form-group">
                  <label className="mvp-label">
                    Hazard Type <span className="mvp-required">*</span>
                  </label>
                  <div className="mvp-hazard-grid">
                    {ALERT_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        className={`mvp-hazard-btn ${form.type === type.value ? 'mvp-hazard-selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, type: type.value }))}
                      >
                        <span className="mvp-hazard-icon">{type.icon}</span>
                        <span className="mvp-hazard-label">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  {selectedHazard && (
                    <div className="mvp-hazard-example">
                      <span className="mvp-example-label">Example:</span> {selectedHazard.example}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mvp-form-group">
                  <label className="mvp-label">
                    Description <span className="mvp-optional">(Optional)</span>
                  </label>
                  <textarea 
                    name="description" 
                    className="mvp-textarea"
                    placeholder="Add details about the hazard (landmarks, severity, affected lanes)..." 
                    value={form.description} 
                    onChange={handleChange}
                    rows="3"
                  />
                  <div className="mvp-char-count">
                    {form.description.length}/500
                  </div>
                </div>
              </div>
            </section>

            {/* ==================== SECTION 2: LOCATION ==================== */}
            <section className="mvp-form-section">
              <div className="mvp-section-header">
                <span className="mvp-section-icon">📍</span>
                <h2 className="mvp-section-title">Location</h2>
              </div>
              
              <div className="mvp-section-card">
                {/* Auto-Detect Toggle */}
                <div className="mvp-location-toggle">
                  <div className="mvp-toggle-info">
                    <span className="mvp-toggle-icon">🛰️</span>
                    <div>
                      <span className="mvp-toggle-label">Auto-Detect Location</span>
                      <span className="mvp-toggle-desc">Use GPS to fill address automatically</span>
                    </div>
                  </div>
                  <label className="mvp-switch">
                    <input 
                      type="checkbox" 
                      checked={locationEnabled}
                      onChange={handleLocationToggle}
                      disabled={detectingLocation}
                    />
                    <span className="mvp-slider"></span>
                  </label>
                </div>

                {detectingLocation && (
                  <div className="mvp-detecting">
                    <div className="mvp-spinner-small"></div>
                    <span>Detecting your location...</span>
                  </div>
                )}

                {/* Location Status */}
                {form.location && (
                  <div className="mvp-location-status">
                    <span className="mvp-status-icon">
                      {form.location.source === 'image_exif' ? '📷' : '✓'}
                    </span>
                    <span className="mvp-status-text">
                      {form.location.source === 'image_exif' 
                        ? 'Location from photo GPS' 
                        : `GPS Location ${form.location.accuracy ? `(±${Math.round(form.location.accuracy)}m)` : ''}`
                      }
                    </span>
                  </div>
                )}

                {/* Address Dropdowns */}
                <div className="mvp-address-grid">
                  <div className="mvp-form-group">
                    <label className="mvp-label">Province <span className="mvp-required">*</span></label>
                    <select 
                      name="province" 
                      value={form.province} 
                      onChange={handleChange} 
                      className="mvp-select"
                      required
                    >
                      <option value="">Select province...</option>
                      {NEGROS_PROVINCES.map(province => (
                        <option key={province.value} value={province.value}>
                          {province.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mvp-form-group">
                    <label className="mvp-label">City/Municipality <span className="mvp-required">*</span></label>
                    <select 
                      name="city" 
                      value={form.city} 
                      onChange={handleChange} 
                      className="mvp-select"
                      required
                      disabled={!form.province}
                    >
                      <option value="">{form.province ? 'Select city...' : 'Select province first'}</option>
                      {form.province && NEGROS_CITIES[form.province]?.map(city => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mvp-form-group">
                    <label className="mvp-label">Barangay <span className="mvp-required">*</span></label>
                    <select 
                      name="barangay" 
                      value={form.barangay} 
                      onChange={handleChange} 
                      className="mvp-select"
                      required
                      disabled={!form.city}
                    >
                      <option value="">{form.city ? 'Select barangay...' : 'Select city first'}</option>
                      {form.city && NEGROS_BARANGAYS[form.city]?.map(barangay => (
                        <option key={barangay.value} value={barangay.value}>
                          {barangay.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!form.location && (
                  <div className="mvp-location-hint">
                    <span>💡</span> Enable GPS detection or take a photo with location data
                  </div>
                )}
              </div>
            </section>

            {/* ==================== SECTION 3: PHOTOS & CAMERA ==================== */}
            <section className="mvp-form-section">
              <div className="mvp-section-header">
                <span className="mvp-section-icon">📸</span>
                <h2 className="mvp-section-title">Photo Evidence</h2>
              </div>
              
              <div className="mvp-section-card">
                {/* Camera View */}
                {showCamera && (
                  <div className="mvp-camera-container">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      muted
                      className="mvp-camera-video"
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <div className="mvp-camera-overlay">
                      <button 
                        type="button" 
                        onClick={capturePhoto}
                        className="mvp-capture-btn"
                        disabled={processingImage}
                      >
                        {processingImage ? (
                          <>
                            <div className="mvp-spinner-small"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span className="mvp-capture-icon">📷</span>
                            <span>Capture</span>
                          </>
                        )}
                      </button>
                      <button 
                        type="button" 
                        onClick={stopCamera}
                        className="mvp-cancel-camera-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Captured Image Preview */}
                {capturedImage && !showCamera && (
                  <div className="mvp-image-preview">
                    <img 
                      src={capturedImage} 
                      alt="Captured" 
                      className="mvp-preview-img"
                    />
                    <div className="mvp-preview-actions">
                      <button type="button" onClick={retakePhoto} className="mvp-btn-icon">
                        🔄 Retake
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setForm(f => ({ ...f, image: null }));
                          setCapturedImage(null);
                          setSuccess('');
                          setAiStatus({ faces: 0, people: 0, plates: 0, active: false });
                        }} 
                        className="mvp-btn-icon mvp-btn-danger"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State - Camera Button */}
                {!showCamera && !capturedImage && (
                  <div className="mvp-photo-empty">
                    <div className="mvp-empty-icon">📷</div>
                    <p className="mvp-empty-text">Take a photo of the road hazard</p>
                    <button 
                      type="button" 
                      onClick={startCamera}
                      className="mvp-btn mvp-btn-primary"
                    >
                      <span>📸</span> Open Camera
                    </button>
                    <div className="mvp-upload-alt">
                      <span>or</span>
                      <label className="mvp-upload-label">
                        <input 
                          type="file" 
                          name="image"
                          accept="image/*"
                          onChange={handleChange}
                          style={{ display: 'none' }}
                        />
                        <span className="mvp-upload-link">upload from gallery</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* File Upload for non-camera */}
                {form.image && !capturedImage && (
                  <div className="mvp-file-selected">
                    <span className="mvp-file-icon">📄</span>
                    <span className="mvp-file-name">{form.image.name}</span>
                    <button 
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image: null }))}
                      className="mvp-file-remove"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ==================== SECTION 4: PRIVACY PROTECTION ==================== */}
            <section className="mvp-form-section mvp-privacy-section">
              <div className="mvp-privacy-panel">
                <div className="mvp-privacy-header">
                  <span className="mvp-privacy-icon">🔒</span>
                  <span className="mvp-privacy-title">Privacy Protection</span>
                  <span className={`mvp-privacy-badge ${aiStatus.active ? 'active' : ''}`}>
                    {aiStatus.active ? 'Active' : 'Ready'}
                  </span>
                </div>
                <div className="mvp-privacy-stats">
                  <div className="mvp-stat-item">
                    <span className="mvp-stat-icon">👤</span>
                    <span className="mvp-stat-value">{aiStatus.faces}</span>
                    <span className="mvp-stat-label">Faces</span>
                  </div>
                  <div className="mvp-stat-item">
                    <span className="mvp-stat-icon">🧑</span>
                    <span className="mvp-stat-value">{aiStatus.people}</span>
                    <span className="mvp-stat-label">People</span>
                  </div>
                  <div className="mvp-stat-item">
                    <span className="mvp-stat-icon">🚗</span>
                    <span className="mvp-stat-value">{aiStatus.plates}</span>
                    <span className="mvp-stat-label">Plates</span>
                  </div>
                </div>
                <p className="mvp-privacy-note">
                  Faces and license plates are automatically blurred for privacy
                </p>
              </div>
            </section>

            {/* ==================== SECTION 5: SUBMISSION OPTIONS ==================== */}
            <section className="mvp-form-section mvp-options-section">
              {dailyLimit && (
                <div className={`mvp-daily-limit ${dailyLimit.canSubmit ? '' : 'limit-reached'}`}>
                  <span className="mvp-limit-icon">{dailyLimit.canSubmit ? '📊' : '⚠️'}</span>
                  <div className="mvp-limit-info">
                    <span className="mvp-limit-text">
                      {dailyLimit.canSubmit 
                        ? `${dailyLimit.remaining} report${dailyLimit.remaining !== 1 ? 's' : ''} remaining today`
                        : 'Daily limit reached'}
                    </span>
                    <span className="mvp-limit-count">{dailyLimit.usedToday}/{dailyLimit.maxReports}</span>
                  </div>
                </div>
              )}
            </section>

          </form>
        </div>

        {/* ==================== STICKY FOOTER ==================== */}
        <footer className="mvp-report-footer">
          <button 
            type="button" 
            onClick={handleReset}
            className="mvp-btn mvp-btn-secondary"
            disabled={submitting}
          >
            Reset
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="mvp-btn mvp-btn-text"
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            className="mvp-btn mvp-btn-submit"
            disabled={submitting || checkingLimit || (dailyLimit && !dailyLimit.canSubmit)}
          >
            {submitting ? (
              <>
                <div className="mvp-spinner-small"></div>
                <span>Submitting...</span>
              </>
            ) : checkingLimit ? (
              <>
                <div className="mvp-spinner-small"></div>
                <span>Checking...</span>
              </>
            ) : dailyLimit && !dailyLimit.canSubmit ? (
              <span>Limit Reached</span>
            ) : (
              <>
                <span>🚀</span>
                <span>Submit Report</span>
              </>
            )}
          </button>
        </footer>

        {/* ==================== CONFIRMATION MODAL ==================== */}
        {showConfirmModal && (
          <div className="mvp-confirm-overlay">
            <div className="mvp-confirm-modal">
              <div className={`mvp-confirm-header ${confirmType}`}>
                <div className="mvp-confirm-icon-wrap">
                  {confirmType === 'success' ? (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </div>
                <h3 className="mvp-confirm-title">
                  {confirmType === 'success' ? 'Report Submitted!' : 'Submission Failed'}
                </h3>
              </div>
              <div className="mvp-confirm-body">
                <p className="mvp-confirm-message">
                  {confirmType === 'success' 
                    ? 'Your report has been submitted successfully. Our team will review it shortly.'
                    : confirmMessage}
                </p>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    if (confirmType === 'success' && onClose) {
                      onClose();
                    }
                  }}
                  className={`mvp-btn mvp-btn-block ${confirmType === 'success' ? 'mvp-btn-success' : 'mvp-btn-danger'}`}
                >
                  {confirmType === 'success' ? 'Continue' : 'Try Again'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportFormMVP;
