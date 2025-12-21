import React, { useEffect } from 'react';

const ToastNotification = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'verification_status':
        return '🔐';
      case 'new_report':
        return '🚨';
      case 'report_resolved':
        return '✅';
      case 'system_alert':
        return '⚠️';
      case 'welcome':
        return '👋';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'verification_status':
        return '#3b82f6'; // Blue
      case 'new_report':
        return '#f59e0b'; // Orange
      case 'report_resolved':
        return '#10b981'; // Green
      case 'system_alert':
        return '#ef4444'; // Red
      case 'welcome':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 10000,
        maxWidth: '380px',
        width: 'calc(100% - 40px)',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          height: '4px',
          backgroundColor: getNotificationColor(notification.type),
        }}
      />
      
      <div
        style={{
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '24px',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: '600',
              fontSize: '14px',
              color: '#1f2937',
              marginBottom: '4px',
              lineHeight: '1.4',
            }}
          >
            {notification.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: '1.5',
              wordBreak: 'break-word',
            }}
          >
            {notification.message}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f3f4f6';
            e.target.style.color = '#374151';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#9ca3af';
          }}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          backgroundColor: '#f3f4f6',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: getNotificationColor(notification.type),
            width: '100%',
            animation: 'progressBar 5s linear',
          }}
        />
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @media (max-width: 480px) {
          [style*="position: fixed"][style*="top: 80px"] {
            top: 70px !important;
            right: 10px !important;
            left: 10px !important;
            width: auto !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;
