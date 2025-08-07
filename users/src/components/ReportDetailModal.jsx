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

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
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
              {getUserInitials(reportUser?.fullName || reportUser?.username)}
            </div>
            <div>
              <div style={{ 
                fontWeight: '600', 
                color: '#1f2937', 
                fontSize: '16px' 
              }}>
                {reportUser?.fullName || reportUser?.username || 'Anonymous User'}
              </div>
              <div style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {reportUser?.isVerified ? (
                  <>
                    <span style={{ color: '#10b981' }}>✓</span>
                    Verified User
                  </>
                ) : (
                  <>
                    <span style={{ color: '#f59e0b' }}>○</span>
                    Unverified User
                  </>
                )}
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
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ color: '#4b5563', fontSize: '14px' }}>
                📍 Coordinates: {report.location?.lat?.toFixed(6)}, {report.location?.lng?.toFixed(6)}
              </div>
              {report.locationName && (
                <div style={{ color: '#4b5563', fontSize: '14px', marginTop: '4px' }}>
                  🏷️ {report.locationName}
                </div>
              )}
            </div>
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
                {report.images.map((image, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img 
                      src={`${config.BACKEND_URL}/uploads/${image.filename}`}
                      alt={`Report image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
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
