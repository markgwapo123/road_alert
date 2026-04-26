import React, { useState } from 'react';
import config from '../config/index.js';

const ReportDetailModal = ({ report, isOpen, onClose, reportUser }) => {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!isOpen || !report) return null;

  // Debug: Log reportUser data to see what's available
  console.log('🔍 ReportDetailModal - reportUser data:', reportUser);
  console.log('🔍 ReportDetailModal - profile data:', reportUser?.profile);
  console.log('🔍 ReportDetailModal - profileImage:', reportUser?.profile?.profileImage);

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
    return icons[type] || '📍';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleImageClick = (e) => {
    e.stopPropagation();

    if (report.images && report.images.length > 0) {
      const imageData = report.images[0];
      let imageUrl;

      if (imageData?.data) {
        imageUrl = `data:${imageData.mimetype};base64,${imageData.data}`;
      } else {
        const filename = imageData?.filename || imageData;
        if (typeof filename === 'string') {
          if (filename.startsWith('http://') || filename.startsWith('https://')) {
            imageUrl = filename;
          } else if (filename.startsWith('data:')) {
            imageUrl = filename;
          } else {
            // Use the image API endpoint
            imageUrl = `${config.BACKEND_URL}/api/reports/${report._id}/image/0`;
          }
        } else {
          // Fallback to image API endpoint
          imageUrl = `${config.BACKEND_URL}/api/reports/${report._id}/image/0`;
        }
      }

      setSelectedImage(imageUrl);
      setImageModalOpen(true);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'white',
          color: 'black',
          padding: '24px',
          borderRadius: '12px 12px 0 0',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
          >
            ×
          </button>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '24px', marginRight: '8px' }}>
              {getTypeIcon(report.type)}
            </span>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {report.type} Report
            </h2>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>

          {/* Status and Priority */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              backgroundColor: getStatusColor(report.status) + '20',
              color: getStatusColor(report.status),
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              border: `2px solid ${getStatusColor(report.status)}40`
            }}>
              {report.status || 'PENDING'}
            </div>
            <div style={{
              backgroundColor: getSeverityColor(report.severity) + '20',
              color: getSeverityColor(report.severity),
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              border: `2px solid ${getSeverityColor(report.severity)}40`
            }}>
              {report.severity || 'MEDIUM'} PRIORITY
            </div>
          </div>

          {/* Reporter Info */}
          {reportUser && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                👤 Reporter Information
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {reportUser.profile?.profileImage ? (
                  <img
                    src={(() => {
                      const img = reportUser.profile.profileImage;
                      if (img.startsWith('http')) return img;
                      if (img.startsWith('data:')) return img;
                      return `${config.BACKEND_URL}${img}`;
                    })()}
                    alt="Reporter"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e2e8f0'
                    }}
                    onError={(e) => {
                      console.log('Profile image failed to load in modal:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <div style="
                          width: 40px;
                          height: 40px;
                          borderRadius: 50%;
                          backgroundColor: #e2e8f0;
                          display: flex;
                          alignItems: center;
                          justifyContent: center;
                          fontSize: 18px;
                          border: 2px solid #e2e8f0;
                        ">👤</div>
                      `;
                    }}
                  />
                ) : (
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    👤
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>
                    {reportUser.username}
                  </div>
                  {reportUser.profile?.firstName && (
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {reportUser.profile.firstName} {reportUser.profile.lastName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Location */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              color: '#1f2937', 
              fontSize: '16px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#dc2626">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg> Location
            </h3>
            <div style={{
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: '#1f2937' }}>
                {report.location?.address || 'Address not available'}
              </p>
              {report.location?.coordinates?.latitude && report.location?.coordinates?.longitude && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Coordinates: {report.location.coordinates.latitude.toFixed(6)}, {report.location.coordinates.longitude.toFixed(6)}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}`;
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
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                >
                  🗺️ Open in Google Maps
                </button>
                <button
                  onClick={() => copyToClipboard(`${report.location.coordinates.latitude}, ${report.location.coordinates.longitude}`)}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                >
                  📋 Copy Coordinates
                </button>
              </div>
            </div>

            {/* Embedded Map */}
            {report.location?.coordinates?.latitude && report.location?.coordinates?.longitude && (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                height: '250px',
                position: 'relative',
                background: '#f9fafb',
                marginTop: '12px'
              }}>
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(report.location.coordinates.longitude - 0.01)},${(report.location.coordinates.latitude - 0.01)},${(report.location.coordinates.longitude + 0.01)},${(report.location.coordinates.latitude + 0.01)}&layer=mapnik&marker=${report.location.coordinates.latitude},${report.location.coordinates.longitude}`}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  title="Report Location Map"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
              📝 Description
            </h3>
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#374151'
            }}>
              {report.description || 'No description provided'}
            </div>
          </div>

          {/* Images - UPDATED WITH LARGER SIZE */}
          {report.images && report.images.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                margin: '0 0 12px 0',
                color: '#1f2937',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                📷 Images ({report.images.length})
              </h3>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                height: '250px',
                width: '100%',
                position: 'relative',
                background: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={(() => {
                    const imageData = report.images[0];
                    if (!imageData) return null;
                    
                    // 1. Priority: Cloudinary URL
                    if (imageData.imageUrl) return imageData.imageUrl;
                    
                    // 2. Base64 data URL
                    if (imageData.data) {
                      return `data:${imageData.mimetype};base64,${imageData.data}`;
                    }
                    
                    // 3. Legacy: Filename as URL
                    const filename = imageData.filename || imageData;
                    if (typeof filename === 'string') {
                      if (filename.startsWith('http')) return filename;
                      if (filename.startsWith('data:')) return filename;
                    }
                    
                    // 4. Fallback: API endpoint
                    return `${config.BACKEND_URL}/api/reports/${report._id}/image/0`;
                  })()}
                  alt="Report image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onClick={handleImageClick}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  onError={(e) => {
                    console.error('Image failed to load');
                    e.target.style.display = 'none';
                    const parent = e.target.parentNode;
                    const fallback = document.createElement('div');
                    fallback.style.cssText = `
                      width: 100%;
                      height: 100%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background: #f3f4f6;
                      color: #6b7280;
                      font-size: 14px;
                      text-align: center;
                    `;
                    fallback.innerHTML = `
                      <div>
                        <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                        <div>Image not available</div>
                      </div>
                    `;
                    parent.appendChild(fallback);
                  }}
                />
              </div>
            </div>
          )}

          {/* Admin Feedback */}
          {report.status === 'resolved' && report.adminFeedback && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                margin: '0 0 12px 0',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                Admin Feedback
              </h3>
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{
                  color: '#1f2937',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  marginBottom: report.evidencePhoto ? '16px' : '0'
                }}>
                  {report.adminFeedback}
                </div>

                {/* Admin Feedback Image */}
                {report.evidencePhoto && (
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#1e40af',
                      marginBottom: '8px'
                    }}>
                      📸 Resolution Image
                    </div>
                    <div style={{
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '250px',
                      width: '100%',
                      position: 'relative',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={(() => {
                          const evidence = report.evidencePhoto;
                          if (!evidence) return null;
                          
                          // 1. Priority: Cloudinary URL
                          if (evidence.imageUrl) return evidence.imageUrl;
                          
                          // 2. Base64 data URL
                          if (evidence.data) {
                            return `data:${evidence.mimetype};base64,${evidence.data}`;
                          }
                          
                          // 3. Legacy: Filename or URL
                          const filename = evidence.filename || evidence;
                          if (typeof filename === 'string') {
                            if (filename.startsWith('http')) return filename;
                            if (filename.startsWith('data:')) return filename;
                          }
                          
                          // 4. Fallback: API endpoint
                          return `${config.BACKEND_URL}/api/reports/${report._id}/evidence-photo`;
                        })()}
                        alt="Admin Feedback"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onClick={(e) => {
                          window.open(e.target.src, '_blank');
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        onError={(e) => {
                          console.error('❌ Admin feedback image failed to load:', e.target.src);
                          e.target.style.display = 'none';
                          const parent = e.target.parentNode;
                          const fallback = document.createElement('div');
                          fallback.style.cssText = `
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #f3f4f6;
                            color: #6b7280;
                            font-size: 14px;
                            text-align: center;
                          `;
                          fallback.innerHTML = `
                            <div>
                              <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                              <div>Image not available</div>
                            </div>
                          `;
                          parent.appendChild(fallback);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resolved Date */}
              {report.resolvedAt && (
                <div style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  textAlign: 'center',
                  marginTop: '12px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#1e40af',
                    marginBottom: '4px'
                  }}>
                    Resolved on
                  </div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {formatDate(report.resolvedAt)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div style={{
            background: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Reported on
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {formatDate(report.createdAt)}
            </div>
          </div>

        </div>
      </div>

      {/* Image Lightbox Modal */}
      {imageModalOpen && selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.90)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setImageModalOpen(false)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            {/* Close button */}
            <button
              onClick={() => setImageModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ×
            </button>

            {/* Image */}
            <img
              src={selectedImage}
              alt="Report evidence - enlarged view"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                console.error('Lightbox image failed to load');
                e.target.style.display = 'none';
              }}
            />

            {/* Instructions */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}>
              Click anywhere outside the image to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetailModal;