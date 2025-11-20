import React from 'react';

const LocationMapInterface = ({ form, gettingLocation = false, getLocation, submitting }) => {
  return (
    <>
      {gettingLocation && (
        <div className="location-loading" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '15px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px', 
          marginBottom: '15px',
          border: '1px solid #1976d2'
        }}>
          <div className="loading-spinner" style={{
            animation: 'spin 1s linear infinite'
          }}>🔄</div>
          <span>Getting your location...</span>
        </div>
      )}
      
      {/* Location Map */}
      {form.location && form.location.lat && form.location.lng ? (
        <div className="location-map-container" style={{
          border: '2px solid #10b981',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#f0fdf4',
          marginBottom: '15px'
        }}>
          {/* Location Status */}
          <div style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📍</span>
            <span>Location Detected</span>
            <button 
              type="button"
              onClick={getLocation}
              style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              disabled={gettingLocation}
            >
              🔄 Update
            </button>
          </div>
          
          {/* Interactive Map */}
          <div style={{
            height: '250px',
            position: 'relative',
            background: '#f9fafb'
          }}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(form.location.lng - 0.005)},${(form.location.lat - 0.005)},${(form.location.lng + 0.005)},${(form.location.lat + 0.005)}&layer=mapnik&marker=${form.location.lat},${form.location.lng}`}
              width="100%"
              height="250"
              style={{ border: 0 }}
              loading="lazy"
              title="Report Location Map"
            />
          </div>
          
          {/* Location Details */}
          <div style={{
            padding: '12px',
            backgroundColor: 'white',
            borderTop: '1px solid #e5e7eb'
          }}>
            {form.location.address && (
              <div style={{
                fontSize: '14px',
                color: '#374151',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                📍 {form.location.address}
              </div>
            )}
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              Coordinates: {form.location.lat.toFixed(6)}, {form.location.lng.toFixed(6)}
            </div>
            {form.location.source === 'image_exif' && (
              <div style={{
                fontSize: '12px',
                color: '#0369a1',
                marginTop: '4px'
              }}>
                📷 Location extracted from photo GPS data
              </div>
            )}
          </div>
        </div>
      ) : (
        /* No Location Yet */
        <div className="location-placeholder" style={{
          border: '2px dashed #d1d5db',
          borderRadius: '12px',
          padding: '30px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          marginBottom: '15px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📍</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>
            Waiting for Location
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>
            {gettingLocation 
              ? 'Getting your current location...' 
              : 'Location will be automatically detected when you open this form'}
          </div>
          {!gettingLocation && (
            <button 
              type="button"
              onClick={getLocation}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              disabled={submitting}
            >
              📍 Get Location Now
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default LocationMapInterface;