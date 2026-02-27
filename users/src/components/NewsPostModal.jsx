import React from 'react';
import config from '../config/index.js';

const NewsPostModal = ({ post, isOpen, onClose }) => {
  if (!isOpen || !post) return null;

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

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { backgroundColor: '#dc2626', color: '#ffffff' };
      case 'high':
        return { backgroundColor: '#ea580c', color: '#ffffff' };
      case 'normal':
        return { backgroundColor: '#2563eb', color: '#ffffff' };
      case 'low':
        return { backgroundColor: '#16a34a', color: '#ffffff' };
      default:
        return { backgroundColor: '#6b7280', color: '#ffffff' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'safety_tip':
        return '🛡️';
      case 'road_update':
        return '🚧';
      case 'general':
        return 'ℹ️';
      default:
        return '📰';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '35px',
            height: '35px',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#64748b',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{
          padding: '25px 25px 0 25px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px'
          }}>
            <span 
              style={{
                ...getPriorityStyle(post.priority),
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {getTypeIcon(post.type)} {post.type.replace('_', ' ').toUpperCase()}
            </span>
            <span style={{
              color: '#6b7280',
              fontSize: '14px'
            }}>
              {formatDate(post.publishDate)}
            </span>
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0',
            color: '#1f2937',
            lineHeight: '1.3',
            paddingRight: '30px'
          }}>
            {post.title}
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <div>
              <strong>Author:</strong> {post.authorName}
            </div>
            <div>
              <strong>Priority:</strong> 
              <span 
                style={{
                  ...getPriorityStyle(post.priority),
                  marginLeft: '5px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                {post.priority.toUpperCase()}
              </span>
            </div>
            <div>
              <strong>Target:</strong> {post.targetAudience.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '0 25px'
        }}>
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#374151'
          }}>
            {post.content}
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                marginBottom: '15px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📎 Attachments ({post.attachments.length})
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px'
              }}>
                {post.attachments.map((attachment, index) => (
                  <div 
                    key={index}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {attachment.type === 'image' ? (
                      <div>
                        <img
                          src={`${config.BACKEND_URL}${attachment.url}`}
                          alt={attachment.originalName}
                          style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                            maxHeight: '400px',
                            display: 'block',
                            backgroundColor: '#f8f9fa'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div style="
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                min-height: 200px; 
                                background: #f3f4f6; 
                                color: #9ca3af;
                                flex-direction: column;
                                gap: 8px;
                              ">
                                <span style="font-size: 40px;">📷</span>
                                <span>Image not available</span>
                              </div>
                            `;
                          }}
                        />

                      </div>
                    ) : (
                      <div>
                        <div style={{
                          minHeight: '200px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f3f4f6',
                          color: '#6b7280',
                          padding: '20px'
                        }}>
                          <span style={{ fontSize: '60px', marginBottom: '10px' }}>🎥</span>
                          <span style={{ fontSize: '14px', textAlign: 'center', fontWeight: 'medium' }}>
                            Video File
                          </span>
                        </div>

                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '10px',
                color: '#1f2937'
              }}>
                🏷️ Tags
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 'medium'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsPostModal;