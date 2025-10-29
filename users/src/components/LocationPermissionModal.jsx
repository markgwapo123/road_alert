import React, { useState } from 'react';

const LocationPermissionModal = ({ isOpen, onAllow, onDeny }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      // Request geolocation permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Location permission granted:', position.coords);
            localStorage.setItem('locationPermissionGranted', 'true');
            setIsRequesting(false);
            onAllow();
          },
          (error) => {
            console.error('Location permission denied:', error);
            setIsRequesting(false);
            onDeny();
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
        setIsRequesting(false);
        onDeny();
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      setIsRequesting(false);
      onDeny();
    }
  };

  return (
    <div className="modal-overlay" onClick={onDeny}>
      <div className="location-permission-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-icon-large">
          📍
        </div>
        <h2 className="location-permission-title">
          Enable Location Services
        </h2>
        <p className="location-permission-message">
          Road Alert needs access to your location to show nearby road alerts and help you report hazards accurately.
        </p>
        <div className="location-permission-features">
          <div className="permission-feature">
            <span className="feature-check">✓</span>
            <span>View alerts near you</span>
          </div>
          <div className="permission-feature">
            <span className="feature-check">✓</span>
            <span>Report hazards with precise location</span>
          </div>
          <div className="permission-feature">
            <span className="feature-check">✓</span>
            <span>Get real-time updates in your area</span>
          </div>
        </div>
        <div className="location-permission-actions">
          <button 
            className="location-allow-btn" 
            onClick={handleAllow}
            disabled={isRequesting}
          >
            {isRequesting ? 'Requesting...' : 'Allow Location Access'}
          </button>
          <button className="location-deny-btn" onClick={onDeny}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
