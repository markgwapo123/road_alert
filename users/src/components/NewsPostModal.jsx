import React from 'react';
import config from '../config/index.js';

const NewsPostModal = ({ post, isOpen, onClose }) => {
  if (!isOpen || !post) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPriorityTheme = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', icon: '🚨' };
      case 'high':
        return { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa', icon: '🔥' };
      case 'normal':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: '📢' };
      case 'low':
        return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', icon: '✅' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: '📰' };
    }
  };

  const theme = getPriorityTheme(post.priority);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Section */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📢 ANNOUNCEMENT
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              fontSize: '12px',
              color: '#94a3b8',
              fontWeight: '500'
            }}>
              {formatDate(post.publishDate)}, {formatTime(post.publishDate)}
            </span>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{
          padding: '0 24px 24px 24px',
          overflowY: 'auto',
          flex: 1
        }}>
          
          {/* 2. Metadata Badges (Secondary Focus) */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '16px',
            marginTop: '8px'
          }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '600'
            }}>
              admin
            </div>
            <div style={{
              backgroundColor: theme.bg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {post.priority}
            </div>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: '600'
            }}>
              target: {post.targetAudience?.replace('_', ' ') || 'all'}
            </div>
          </div>

          {/* 3. Title (Primary Focus) */}
          <h1 style={{
            fontSize: '22px',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 16px 0',
            lineHeight: '1.3',
            letterSpacing: '-0.4px',
            textAlign: 'left'
          }}>
            {post.title}
          </h1>

          {/* 4. Message Content (Subtle Container) */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #f1f5f9',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#334155',
              margin: 0,
              whiteSpace: 'pre-wrap',
              textAlign: 'left'
            }}>
              {post.content}
            </p>
          </div>

          {/* Attachments Hint */}
          {post.attachments && post.attachments.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: '#94a3b8'
              }}>
                <span style={{ fontSize: '16px' }}>📎</span>
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Attachments ({post.attachments.length})
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px'
              }}>
                {post.attachments.map((attachment, index) => (
                  <div key={index} style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}>
                    {attachment.type === 'image' ? (
                      <img
                        src={`${config.BACKEND_URL}/api/news/image/${post._id}/${index}`}
                        alt="attachment"
                        style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🎥</span>
                        <span style={{ fontSize: '10px', textAlign: 'center', color: '#94a3b8' }}>Video</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer Action (CTA) */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'center', // Centered for CTA emphasis
          backgroundColor: '#ffffff'
        }}>
          <button 
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            Close Announcement
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NewsPostModal;