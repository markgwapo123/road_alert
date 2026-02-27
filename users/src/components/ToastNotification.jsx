import React, { useEffect, useState } from 'react';

/**
 * ToastNotification Component
 * 
 * A professional toast notification for real-time updates.
 * Supports admin responses, status updates, and announcements.
 */
const ToastNotification = ({ notification, onClose, autoClose = true, duration = 5000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [autoClose, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'admin_response':
        return '📩';
      case 'status_update':
      case 'report_status_update':
        return '🔄';
      case 'announcement':
        return '📢';
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
        return '🔔';
    }
  };

  const getNotificationColor = (type, priority) => {
    // Urgent priority overrides type color
    if (priority === 'urgent') return '#ef4444';
    if (priority === 'high') return '#f59e0b';

    switch (type) {
      case 'admin_response':
        return '#0ea5e9'; // Cyan
      case 'status_update':
      case 'report_status_update':
        return '#6366f1'; // Indigo
      case 'announcement':
        return '#f59e0b'; // Amber
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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'admin_response':
        return 'Admin Response';
      case 'status_update':
      case 'report_status_update':
        return 'Status Update';
      case 'announcement':
        return 'Announcement';
      case 'verification_status':
        return 'Verification';
      case 'new_report':
        return 'New Report';
      case 'system_alert':
        return 'System Alert';
      default:
        return 'Notification';
    }
  };

  const accentColor = getNotificationColor(notification.type, notification.priority);

  return (
    <div
      className={`toast-notification ${isExiting ? 'exiting' : ''}`}
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 10000,
        maxWidth: '400px',
        width: 'calc(100% - 40px)',
        backgroundColor: 'white',
        borderRadius: '14px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        animation: isExiting ? 'slideOutRight 0.3s ease-out' : 'slideInRight 0.3s ease-out',
      }}
    >
      {/* Color accent bar */}
      <div
        style={{
          height: '4px',
          background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
        }}
      />
      
      <div
        style={{
          padding: '16px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: '28px',
            flexShrink: 0,
            marginTop: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            backgroundColor: `${accentColor}15`,
            borderRadius: '10px',
          }}
        >
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Type label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: accentColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {getTypeLabel(notification.type)}
            </span>
            {notification.priority === 'urgent' && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'white',
                  backgroundColor: '#ef4444',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                URGENT
              </span>
            )}
            {notification.isBroadcast && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'white',
                  backgroundColor: '#f59e0b',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                ALL
              </span>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              fontWeight: '600',
              fontSize: '15px',
              color: '#1e293b',
              marginBottom: '4px',
              lineHeight: '1.4',
            }}
          >
            {notification.title}
          </div>

          {/* Message */}
          <div
            style={{
              fontSize: '13px',
              color: '#64748b',
              lineHeight: '1.5',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {notification.message}
          </div>

          {/* Status badge for status updates */}
          {notification.status && (
            <div
              style={{
                marginTop: '10px',
                display: 'inline-block',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '6px',
                backgroundColor: notification.status === 'resolved' || notification.status === 'verified' 
                  ? '#d1fae5' 
                  : notification.status === 'rejected' 
                    ? '#fee2e2'
                    : notification.status === 'under_review'
                      ? '#e0e7ff'
                      : '#fef3c7',
                color: notification.status === 'resolved' || notification.status === 'verified'
                  ? '#065f46'
                  : notification.status === 'rejected'
                    ? '#991b1b'
                    : notification.status === 'under_review'
                      ? '#3730a3'
                      : '#92400e',
              }}
            >
              {notification.status.replace('_', ' ').toUpperCase()}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      {autoClose && (
        <div
          style={{
            height: '3px',
            backgroundColor: '#f1f5f9',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: accentColor,
              width: '100%',
              animation: `progressBar ${duration}ms linear`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(420px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(420px);
            opacity: 0;
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
          .toast-notification {
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
