import React, { useState, useEffect } from 'react';
import { getReverseGeocode } from '../services/geocoding.js';
import { processGeocodedAddress } from '../utils/addressMatcher.js';

const LocationPermissionModal = ({ onLocationGranted, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('permission'); // 'permission', 'loading', 'success', 'error'

  useEffect(() => {
    // Auto-request location on mount
    handleGetLocation();
  }, []);

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      setError('❌ Location services not supported on this device');
      setStep('error');
      return;
    }

    setLoading(true);
    setStep('loading');
    setError('');

    const options = {
      enableHighAccuracy: true, // Use GPS for best accuracy
      timeout: 15000, // 15 seconds
      maximumAge: 0 // Don't use cached location
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log('📍 Location obtained:', { latitude, longitude, accuracy });
          console.log(`📍 GPS: ${latitude}, ${longitude}`);
          
          // Get reverse geocoding (province, city, barangay)
          setStep('loading');
          const addressData = await getReverseGeocode(latitude, longitude);
          
          if (addressData && !addressData.error) {
            console.log('✅ Address data received from geocoding:', addressData);
            console.log('🏷️ Labels:', addressData.provinceLabel, '/', addressData.cityLabel, '/', addressData.barangayLabel);
            console.log('📦 Full Address:', addressData.fullAddress);
            
            // Process and validate address data against dropdown options
            const processedAddress = processGeocodedAddress(addressData);
            console.log('🎯 Matched dropdown values:', processedAddress);
            
            console.log('📋 Validated address for form:', processedAddress);
            
            // Check if we got valid dropdown-matched address data
            const hasValidAddress = processedAddress.province || processedAddress.city || processedAddress.barangay;
            
            if (!hasValidAddress) {
              console.warn('⚠️ No matching address found in dropdown options');
              console.warn('📍 Raw address:', {
                province: addressData.provinceLabel,
                city: addressData.cityLabel,
                barangay: addressData.barangayLabel
              });
            }
            
            // Pass location data back to parent with validated dropdown values
            onLocationGranted({
              location: {
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                address: addressData.fullAddress,
                source: 'gps'
              },
              province: processedAddress.province,
              city: processedAddress.city,
              barangay: processedAddress.barangay,
              // Keep labels for display
              provinceLabel: processedAddress.provinceLabel,
              cityLabel: processedAddress.cityLabel,
              barangayLabel: processedAddress.barangayLabel
            });
            
            setStep('success');
            
            // Auto-close after success
            setTimeout(() => {
              onClose();
            }, 800);
          } else {
            // Location obtained but address lookup failed
            setError('⚠️ Location found, but unable to determine address. You can enter it manually.');
            setStep('error');
            
            // Still pass the coordinates
            onLocationGranted({
              location: {
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                source: 'gps'
              },
              province: '',
              city: '',
              barangay: ''
            });
            
            setTimeout(() => {
              onClose();
            }, 2000);
          }
        } catch (err) {
          console.error('Address lookup error:', err);
          setError('⚠️ Could not get address. Please enter manually.');
          setStep('error');
          
          setTimeout(() => {
            onClose();
          }, 2000);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLoading(false);
        
        let errorMessage = '';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '❌ Location access denied. Please enable location in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = '❌ Location unavailable. Please check your device settings.';
            break;
          case err.TIMEOUT:
            errorMessage = '❌ Location request timed out. Please try again.';
            break;
          default:
            errorMessage = '❌ Unable to get location. Please try again.';
        }
        
        setError(errorMessage);
        setStep('error');
      },
      options
    );
  };

  const handleSkip = () => {
    // Allow user to skip and fill manually
    onLocationGranted({
      location: null,
      province: '',
      city: '',
      barangay: ''
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Icon based on step */}
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>
          {step === 'permission' && '📍'}
          {step === 'loading' && (
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}
          {step === 'success' && '✅'}
          {step === 'error' && '⚠️'}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          {step === 'permission' && 'Getting Your Location'}
          {step === 'loading' && 'Finding Your Address...'}
          {step === 'success' && 'Location Found!'}
          {step === 'error' && 'Location Issue'}
        </h2>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          {step === 'permission' && 'Please allow location access to automatically fill in your province, city, and barangay.'}
          {step === 'loading' && 'Getting your address details...'}
          {step === 'success' && 'Your location has been detected successfully!'}
          {step === 'error' && error}
        </p>

        {/* Action Buttons */}
        {step === 'permission' && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleGetLocation}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Getting Location...' : 'Allow Location'}
            </button>
            <button
              onClick={handleSkip}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Skip
            </button>
          </div>
        )}

        {step === 'loading' && (
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            This may take a few seconds...
          </p>
        )}

        {step === 'error' && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleGetLocation}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Try Again
            </button>
            <button
              onClick={handleSkip}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Continue Anyway
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LocationPermissionModal;
