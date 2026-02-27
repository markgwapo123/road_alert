import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../context/NotificationContext';
import NotificationItem from './NotificationItem';
import './NotificationPanel.css';

/**
 * NotificationPanel Component
 * 
 * A dropdown/drawer panel that displays notifications.
 * Opens from the notification bell.
 */
const NotificationPanel = ({ onViewAll, onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    isPanelOpen,
    selectedNotification,
    closePanel,
    markAllAsRead,
    selectNotification,
    clearSelectedNotification,
    fetchNotifications,
    getNotificationIcon,
    getNotificationTypeLabel,
    getRelativeTime
  } = useNotifications();

  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if click was on the bell button
        if (!event.target.closest('.notification-bell')) {
          closePanel();
          if (onClose) onClose();
        }
      }
    };

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Refresh notifications when panel opens
      fetchNotifications();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen, closePanel, onClose, fetchNotifications]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (selectedNotification) {
          clearSelectedNotification();
        } else {
          closePanel();
          if (onClose) onClose();
        }
      }
    };

    if (isPanelOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPanelOpen, selectedNotification, closePanel, clearSelectedNotification, onClose]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleViewAll = () => {
    closePanel();
    if (onViewAll) onViewAll();
  };

  const handleNotificationClick = (notification) => {
    selectNotification(notification);
  };

  if (!isPanelOpen) return null;

  // Show notification detail view
  if (selectedNotification) {
    return (
      <div className="notification-panel" ref={panelRef}>
        <div className="notification-panel-header">
          <button 
            className="notification-panel-back"
            onClick={clearSelectedNotification}
            aria-label="Back to notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h3 className="notification-panel-title">Notification Details</h3>
          <button 
            className="notification-panel-close"
            onClick={() => { closePanel(); if (onClose) onClose(); }}
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="notification-detail">
          <div className="notification-detail-header">
            <span className="notification-detail-icon">
              {getNotificationIcon(selectedNotification.type)}
            </span>
            <div className="notification-detail-meta">
              <span className="notification-detail-type">
                {getNotificationTypeLabel(selectedNotification.type)}
              </span>
              <span className="notification-detail-time">
                {new Date(selectedNotification.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <h4 className="notification-detail-title">{selectedNotification.title}</h4>
          <p className="notification-detail-message">{selectedNotification.message}</p>

          {selectedNotification.adminMessage && (
            <div className="notification-detail-admin-message">
              <h5>Admin Response:</h5>
              <p>{selectedNotification.adminMessage}</p>
            </div>
          )}

          {selectedNotification.status && (
            <div className={`notification-detail-status status-${selectedNotification.status}`}>
              Status: <strong>{selectedNotification.status.replace('_', ' ').toUpperCase()}</strong>
            </div>
          )}

          {selectedNotification.priority && selectedNotification.priority !== 'normal' && (
            <div className={`notification-detail-priority priority-${selectedNotification.priority}`}>
              Priority: <strong>{selectedNotification.priority.toUpperCase()}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="notification-panel" ref={panelRef}>
      {/* Panel Header */}
      <div className="notification-panel-header">
        <h3 className="notification-panel-title">
          <span className="notification-panel-icon">🔔</span>
          Notifications
          {unreadCount > 0 && (
            <span className="notification-panel-count">{unreadCount}</span>
          )}
        </h3>
        <button 
          className="notification-panel-close"
          onClick={() => { closePanel(); if (onClose) onClose(); }}
          aria-label="Close panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Mark All Read Button */}
      {unreadCount > 0 && (
        <div className="notification-panel-actions">
          <button 
            className="notification-mark-all-btn"
            onClick={handleMarkAllRead}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Mark all as read
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="notification-panel-content">
        {loading && notifications.length === 0 ? (
          <div className="notification-panel-loading">
            <div className="notification-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="notification-panel-error">
            <span className="notification-error-icon">⚠️</span>
            <p>{error}</p>
            <button 
              className="notification-retry-btn"
              onClick={() => fetchNotifications()}
            >
              Retry
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-panel-empty">
            <span className="notification-empty-icon">📭</span>
            <p>No notifications yet</p>
            <span className="notification-empty-hint">
              You'll see updates about your reports here
            </span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.slice(0, 10).map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel Footer */}
      {notifications.length > 0 && (
        <div className="notification-panel-footer">
          <button 
            className="notification-view-all-btn"
            onClick={handleViewAll}
          >
            View all notifications
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
