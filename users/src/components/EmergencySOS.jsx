import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import './EmergencySOS.css';

const EmergencySOS = () => {
  const { getSetting } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState(null);

  const emergencyData = getSetting('emergency_contacts', {});

  const handleOpen = async () => {
    setIsOpen(true);
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Reverse Geocoding using Nominatim (OpenStreetMap)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            const data = await response.json();
            
            const address = data.address;
            const city = address.city || address.town || address.municipality || address.village || 'default';
            console.log('📍 SOS detected raw location:', city);
            
            setLocation(city);
            
            // ⚡ Robust Matching Logic:
            // 1. Try exact match
            // 2. Try matching without " City" suffix
            // 3. Try case-insensitive matching
            
            const normalizedCity = city.toLowerCase().replace(' city', '').trim();
            
            let matchedCityKey = Object.keys(emergencyData).find(key => {
              const normalizedKey = key.toLowerCase().replace(' city', '').trim();
              return normalizedKey === normalizedCity;
            });

            console.log('🔍 Matching:', normalizedCity, '->', matchedCityKey);
            
            const cityContacts = (matchedCityKey ? emergencyData[matchedCityKey] : null) || emergencyData['default'] || {
              police: '911',
              fire: '911',
              medical: '911'
            };
            
            setContacts(cityContacts);
          } catch (geoError) {
            console.error('Reverse geocoding failed:', geoError);
            setLocation('Unknown');
            setContacts(emergencyData['default']);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Could not access your location. Showing default emergency numbers.');
          setContacts(emergencyData['default']);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err.message);
      setContacts(emergencyData['default']);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button className="sos-fab" onClick={handleOpen} title="Emergency SOS">
        <span className="sos-icon">🆘</span>
        <span className="sos-label">SOS</span>
      </button>

      {/* SOS Modal */}
      {isOpen && (
        <div className="sos-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="sos-modal" onClick={e => e.stopPropagation()}>
            <div className="sos-modal-header">
              <div className="sos-title-group">
                <span className="sos-modal-icon">🚨</span>
                <h2>Emergency Services</h2>
              </div>
              <button className="close-sos" onClick={() => setIsOpen(false)}>&times;</button>
            </div>

            <div className="sos-modal-content">
              {loading ? (
                <div className="sos-loading">
                  <div className="sos-spinner"></div>
                  <p>Detecting your location...</p>
                </div>
              ) : (
                <>
                  <div className="sos-location-badge">
                    <span className="loc-icon">📍</span>
                    <span>Detected Location: <strong>{location || 'Searching...'}</strong></span>
                  </div>

                  {error && <p className="sos-error">{error}</p>}

                  <div className="sos-list">
                    <a href={`tel:${contacts?.police?.number || contacts?.police}`} className="sos-item police">
                      <div className="sos-item-icon">🚔</div>
                      <div className="sos-item-info">
                        <span className="label">{contacts?.police?.label || 'Police Department'}</span>
                        <span className="number">{contacts?.police?.number || contacts?.police}</span>
                      </div>
                      <span className="call-icon">📞</span>
                    </a>

                    <a href={`tel:${contacts?.fire?.number || contacts?.fire}`} className="sos-item fire">
                      <div className="sos-item-icon">🚒</div>
                      <div className="sos-item-info">
                        <span className="label">{contacts?.fire?.label || 'Fire Station'}</span>
                        <span className="number">{contacts?.fire?.number || contacts?.fire}</span>
                      </div>
                      <span className="call-icon">📞</span>
                    </a>

                    <a href={`tel:${contacts?.medical?.number || contacts?.medical}`} className="sos-item medical">
                      <div className="sos-item-icon">🚑</div>
                      <div className="sos-item-info">
                        <span className="label">{contacts?.medical?.label || 'Ambulance / Medical'}</span>
                        <span className="number">{contacts?.medical?.number || contacts?.medical}</span>
                      </div>
                      <span className="call-icon">📞</span>
                    </a>
                  </div>

                  <p className="sos-disclaimer">
                    Tap any contact to initiate a direct call. In case of extreme life-threatening emergency, always dial 911 immediately.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencySOS;
