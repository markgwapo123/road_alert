import React from 'react';
import config from '../config/index.js';

const ReportDetailModal = ({ report, isOpen, onClose, reportUser }) => {
  if (!isOpen || !report) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      emergency: '🚨',
      caution: '⚠️',
      info: 'ℹ️',
      safe: '✅',
      construction: '🚧',
      pothole: '🕳️',
      accident: '💥',
      traffic: '🚦'
    };
    return icons[type] || 'ℹ️';
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase();
    }
    
    if (user.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    
    return '?';
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
          color: 'white',
          borderRadius: '16px 16px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>{getTypeIcon(report.type)}</span>
            <h2 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: '700',
              textTransform: 'capitalize'
            }}>
              {report.type.replace('_', ' ')} Alert
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ×
          </button>
        </div>

        {/* User Profile Section */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          background: '#f9fafb'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            color: '#1f2937', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Reported by
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '600',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              {getUserInitials(reportUser)}
            </div>
            <div>
              <div style={{ 
                fontWeight: '600', 
                color: '#1f2937', 
                fontSize: '16px' 
              }}>
                {reportUser?.profile?.firstName && reportUser?.profile?.lastName 
                  ? `${reportUser.profile.firstName} ${reportUser.profile.lastName}`
                  : reportUser?.username || 'Anonymous User'}
              </div>
              <div style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {/* Verification status removed per feature change */}
                <>
                  <span style={{ color: '#3b82f6' }}>●</span>
                  Member
                </>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Status and Severity Badges */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <span style={{
              background: getStatusColor(report.status),
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {report.status}
            </span>
            <span style={{
              background: getSeverityColor(report.severity),
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {report.severity} Severity
            </span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#1f2937', 
              fontSize: '16px', 
              fontWeight: '600' 
            }}>
              Description
            </h3>
            <p style={{ 
              margin: 0, 
              color: '#4b5563', 
              lineHeight: '1.6',
              fontSize: '15px'
            }}>
              {report.description}
            </p>
          </div>

          {/* Location Details */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#1f2937', 
              fontSize: '16px', 
              fontWeight: '600' 
            }}>
              Location
            </h3>
            <div style={{ 
              background: '#f9fafb', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '12px'
            }}>
              <div style={{ color: '#4b5563', fontSize: '14px' }}>
                📍 Coordinates: {report.location?.lat?.toFixed(6)}, {report.location?.lng?.toFixed(6)}
              </div>
              {report.locationName && (
                <div style={{ color: '#4b5563', fontSize: '14px', marginTop: '4px' }}>
                  🏷️ {report.locationName}
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '8px'
              }}>
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${report.location?.coordinates?.latitude},${report.location?.coordinates?.longitude}`;
                    window.open(url, '_blank');
                  }}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🗺️ Open in Google Maps
                </button>
                <button
                  onClick={() => {
                    const coordinates = `${report.location?.lat}, ${report.location?.lng}`;
                    navigator.clipboard.writeText(coordinates).then(() => {
                      // Create and show a better notification
                      const notification = document.createElement('div');
                      notification.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: #10b981;
                        color: white;
                        padding: 12px 16px;
                        border-radius: 8px;
                        font-size: 14px;
                        z-index: 10000;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                      `;
                      notification.textContent = `📋 Coordinates copied: ${coordinates}`;
                      document.body.appendChild(notification);
                      
                      // Remove notification after 3 seconds
                      setTimeout(() => {
                        document.body.removeChild(notification);
                      }, 3000);
                    }).catch(() => {
                      alert('Coordinates copied to clipboard!');
                    });
                  }}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  📋 Copy Coordinates
                </button>
              </div>
            </div>
            
            {/* Embedded Map */}
            {report.location?.lat && report.location?.lng && (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                height: '250px',
                position: 'relative',
                background: '#f9fafb'
              }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(report.location.lng - 0.01)},${(report.location.lat - 0.01)},${(report.location.lng + 0.01)},${(report.location.lat + 0.01)}&layer=mapnik&marker=${report.location.lat},${report.location.lng}`}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  title="Report Location Map"
                  onLoad={() => {
                    console.log('Map loaded successfully');
                  }}
                  onError={(e) => {
                    console.error('Map failed to load');
                    // If map fails to load, show a fallback
                    e.target.style.display = 'none';
                    const parent = e.target.parentNode;
                    const fallback = document.createElement('div');
                    fallback.style.cssText = `
                      height: 250px; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      background: #f3f4f6; 
                      color: #6b7280;
                      text-align: center;
                      padding: 20px;
                      flex-direction: column;
                    `;
                    fallback.innerHTML = `
                      <div>
                        <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Interactive Map Unavailable</div>
                        <div style="font-size: 14px; margin-bottom: 12px;">
                          Location: ${report.location.coordinates.latitude.toFixed(6)}, ${report.location.coordinates.longitude.toFixed(6)}
                        </div>
                        <button onclick="window.open('https://www.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}', '_blank')" 
                                style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                          🗺️ View on Google Maps
                        </button>
                      </div>
                    `;
                    parent.appendChild(fallback);
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  📍 Report Location
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  border: '1px solid #e5e7eb'
                }}>
                  📍 {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          {report.images && report.images.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                color: '#1f2937', 
                fontSize: '16px', 
                fontWeight: '600' 
              }}>
                Images ({report.images.length})
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {report.images.map((image, index) => {
                  const imageUrl = `${config.BACKEND_URL}/uploads/${image.filename || image}`;
                  return (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={imageUrl}
                        alt={`Report image ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onClick={(e) => {
                          // Open image in new tab
                          window.open(e.target.src, '_blank');
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        onError={(e) => {
                          console.error('Image failed to load:', imageUrl);
                          // Replace with a placeholder
                          e.target.style.display = 'none';
                          const parent = e.target.parentNode;
                          const fallback = document.createElement('div');
                          fallback.style.cssText = `
                            width: 100%;
                            height: 200px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #f3f4f6;
                            border-radius: 8px;
                            border: 1px solid #e5e7eb;
                            color: #6b7280;
                            font-size: 14px;
                            text-align: center;
                          `;
                          fallback.innerHTML = `
                            <div>
                              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                              <div>Image not available</div>
                              <div style="font-size: 12px; margin-top: 4px; color: #9ca3af;">
                                ${image.filename || image}
                              </div>
                            </div>
                          `;
                          parent.appendChild(fallback);
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', imageUrl);
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Click to enlarge
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              color: '#6b7280', 
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>🕒 Reported on</span>
              <span style={{ fontWeight: '500', color: '#1f2937' }}>
                {formatDate(report.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
