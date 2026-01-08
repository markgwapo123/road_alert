import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationItem.css';

/**
 * NotificationItem Component
 * 
 * A single notification card with professional styling.
 * Supports compact mode for panel and full mode for page.
 */
const NotificationItem = ({ 
  notification, 
  onClick, 
  compact = false,
  showDelete = false,
  onDelete 
}) => {
  const {
    getNotificationIcon,
    getNotificationTypeLabel,
    getRelativeTime,
    getStatusColor,
    getPriorityColor
  } = useNotifications();

  const {
    _id,
    type,
    title,
    message,
    status,
    priority,
    isRead,
    createdAt,
    adminMessage,
    isBroadcast
  } = notification;

  const handleClick = () => {
    if (onClick) onClick(notification);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(_id);
  };

  // Get type-specific styling
  const getTypeColor = () => {
    switch (type) {
      case 'admin_response':
        return 'type-admin-response';
      case 'status_update':
      case 'report_status_update':
        return 'type-status-update';
      case 'announcement':
        return 'type-announcement';
      case 'verification_status':
        return 'type-verification';
      case 'system_alert':
        return 'type-system';
      default:
        return 'type-default';
    }
  };

  return (
    <div
      className={`
        notification-item
        ${compact ? 'compact' : 'full'}
        ${isRead ? 'read' : 'unread'}
        ${getTypeColor()}
        ${priority === 'urgent' ? 'urgent' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Left border accent */}
      <div className="notification-accent"></div>

      {/* Icon */}
      <div className="notification-icon-wrapper">
        <span className="notification-icon">{getNotificationIcon(type)}</span>
        {!isRead && <span className="notification-unread-dot"></span>}
      </div>

      {/* Content */}
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-type-badge">
            {getNotificationTypeLabel(type)}
            {isBroadcast && (
              <span className="notification-broadcast-tag">ALL</span>
            )}
          </span>
          <span className="notification-time">{getRelativeTime(createdAt)}</span>
        </div>

        <h4 className="notification-title">{title}</h4>
        
        <p className="notification-message">
          {compact && message.length > 80 
            ? `${message.substring(0, 80)}...` 
            : message
          }
        </p>

        {/* Status badge for status updates */}
        {status && (
          <div className={`notification-status-badge ${getStatusColor(status)}`}>
            {status.replace('_', ' ').toUpperCase()}
          </div>
        )}

        {/* Priority badge for urgent announcements */}
        {priority && priority !== 'normal' && (
          <div className={`notification-priority-badge ${getPriorityColor(priority)}`}>
            {priority.toUpperCase()}
          </div>
        )}

        {/* Admin message preview */}
        {!compact && adminMessage && (
          <div className="notification-admin-preview">
            <span className="admin-preview-label">Admin:</span>
            <span className="admin-preview-text">
              {adminMessage.length > 100 
                ? `${adminMessage.substring(0, 100)}...` 
                : adminMessage
              }
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="notification-actions">
        {showDelete && !isBroadcast && (
          <button
            className="notification-delete-btn"
            onClick={handleDelete}
            aria-label="Delete notification"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        )}
        
        <svg 
          className="notification-chevron" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
};

export default NotificationItem;
