import React, { useState, useEffect, useCallback } from 'react';
import './NotificationPage.css';

/**
 * NotificationPage Component
 * 
 * Full-page notification view with filtering, sorting, and detailed views.
 * Supports both context-based and props-based usage for backward compatibility.
 */
const NotificationPage = ({ 
  notifications: propNotifications = [],
  unreadCount: propUnreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh
}) => {
  const notifications = propNotifications;
  const unreadCount = propUnreadCount;

  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locallyRead, setLocallyRead] = useState(() => {
    try {
      const raw = localStorage.getItem('locallyReadNotifications');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  });

  // Refresh notifications on mount
  useEffect(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, []);

  // Keep locallyRead in sync with server
  useEffect(() => {
    if (locallyRead.size === 0) return;
    setLocallyRead(prev => {
      const next = new Set(prev);
      for (const id of Array.from(prev)) {
        const serverNotif = notifications.find(n => n._id === id);
        if (serverNotif && (serverNotif.read || serverNotif.isRead)) next.delete(id);
      }
      if (next.size !== prev.size) {
        localStorage.setItem('locallyReadNotifications', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  }, [notifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'admin_response': return '📩';
      case 'status_update':
      case 'report_status_update': return '🔄';
      case 'announcement': return '📢';
      case 'verification_status': return '🔐';
      case 'new_report': return '🚨';
      case 'system_alert': return '⚠️';
      case 'report_resolved': return '✅';
      case 'welcome': return '👋';
      default: return '🔔';
    }
  };

  // Get notification type label
  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'admin_response': return 'Admin Response';
      case 'status_update':
      case 'report_status_update': return 'Status Update';
      case 'announcement': return 'Announcement';
      case 'verification_status': return 'Verification';
      case 'new_report': return 'New Report';
      case 'system_alert': return 'System Alert';
      default: return 'Notification';
    }
  };

  // Get relative time
  const getRelativeTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInMinutes = Math.floor((now - notifDate) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  // Calculate counts for filters
  const adminResponseCount = notifications.filter(n => n.type === 'admin_response').length;
  const statusUpdateCount = notifications.filter(n => 
    n.type === 'status_update' || n.type === 'report_status_update'
  ).length;
  const announcementCount = notifications.filter(n => n.type === 'announcement').length;

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All', icon: '📋', count: notifications.length },
    { value: 'unread', label: 'Unread', icon: '🔵', count: unreadCount },
    { value: 'admin_response', label: 'Admin Responses', icon: '📩', count: adminResponseCount },
    { value: 'status_update', label: 'Status Updates', icon: '🔄', count: statusUpdateCount },
    { value: 'announcement', label: 'Announcements', icon: '📢', count: announcementCount }
  ];

  // Get filtered and sorted notifications
  const getFilteredNotifications = useCallback(() => {
    let filtered = [...notifications];

    // Apply type filter
    if (filterType === 'unread') {
      filtered = filtered.filter(n => !(n.read || n.isRead) && !locallyRead.has(n._id));
    } else if (filterType !== 'all') {
      filtered = filtered.filter(n => {
        if (filterType === 'status_update') {
          return n.type === 'status_update' || n.type === 'report_status_update';
        }
        return n.type === filterType;
      });
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'unread') {
      filtered.sort((a, b) => {
        const aRead = (a.read || a.isRead) || locallyRead.has(a._id);
        const bRead = (b.read || b.isRead) || locallyRead.has(b._id);
        if (aRead && !bRead) return 1;
        if (!aRead && bRead) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    } else if (sortBy === 'priority') {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      filtered.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] ?? 2;
        const priorityB = priorityOrder[b.priority] ?? 2;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return filtered;
  }, [notifications, filterType, sortBy, locallyRead]);

  const filteredNotifications = getFilteredNotifications();

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      if (onMarkAllAsRead) {
        await onMarkAllAsRead();
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Open notification modal
  const openModal = (notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);
  };

  // Close modal and mark as read
  const closeModal = async () => {
    try {
      if (selectedNotification && !(selectedNotification.read || selectedNotification.isRead)) {
        // Mark locally as read
        setLocallyRead(prev => {
          const next = new Set(prev);
          next.add(selectedNotification._id);
          localStorage.setItem('locallyReadNotifications', JSON.stringify(Array.from(next)));
          return next;
        });
        
        if (onMarkAsRead) {
          await onMarkAsRead(selectedNotification._id);
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
    setIsModalOpen(false);
    setSelectedNotification(null);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get status display info
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { label: 'Pending', class: 'status-pending', icon: '⏳' },
      under_review: { label: 'Under Review', class: 'status-review', icon: '🔍' },
      verified: { label: 'Verified', class: 'status-verified', icon: '✅' },
      resolved: { label: 'Resolved', class: 'status-resolved', icon: '✅' },
      rejected: { label: 'Rejected', class: 'status-rejected', icon: '❌' }
    };
    return statusMap[status] || { label: status, class: 'status-default', icon: '📋' };
  };

  // Get type-specific accent class
  const getTypeAccentClass = (type) => {
    switch (type) {
      case 'admin_response': return 'accent-admin-response';
      case 'status_update':
      case 'report_status_update': return 'accent-status-update';
      case 'announcement': return 'accent-announcement';
      case 'verification_status': return 'accent-verification';
      case 'system_alert': return 'accent-system';
      default: return 'accent-default';
    }
  };

  return (
    <div className="notification-page">
      {/* Page Header */}
      <div className="notification-page-header">
        <div className="page-title-section">
          <h1 className="page-title">
            <span className="page-icon">🔔</span>
            Notifications
          </h1>
          <p className="page-subtitle">
            Stay updated with your reports and announcements
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Mark All Read</span>
            <span className="unread-badge">{unreadCount}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-section">
        <div className="filter-tabs">
          {filterOptions.map(option => (
            <button
              key={option.value}
              className={`filter-tab ${filterType === option.value ? 'active' : ''}`}
              onClick={() => setFilterType(option.value)}
            >
              <span className="filter-icon">{option.icon}</span>
              <span className="filter-label">{option.label}</span>
              {option.count > 0 && (
                <span className="filter-count">{option.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sort & Actions Bar */}
      <div className="actions-bar">
        <div className="sort-section">
          <label htmlFor="sort-select">Sort by:</label>
          <select 
            id="sort-select"
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="unread">Unread First</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        <button 
          className="refresh-btn"
          onClick={() => onRefresh && onRefresh()}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
      </div>

      {/* Notifications List */}
      <div className="notifications-container">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No notifications found</h3>
            <p>
              {filterType === 'all' 
                ? "You don't have any notifications yet. They'll appear here when there's activity on your reports."
                : filterType === 'unread'
                ? "You're all caught up! No unread notifications."
                : `No ${filterType.replace('_', ' ')} notifications found.`
              }
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notif) => {
              const isUnread = !(notif.read || notif.isRead) && !locallyRead.has(notif._id);
              
              return (
                <div 
                  key={notif._id} 
                  className={`notification-card ${isUnread ? 'unread' : 'read'} ${getTypeAccentClass(notif.type)}`}
                  onClick={() => openModal(notif)}
                >
                  {/* Left accent bar */}
                  <div className="notification-accent"></div>
                  
                  {/* Icon */}
                  <div className="notification-icon-wrapper">
                    <span className="notification-icon">{getNotificationIcon(notif.type)}</span>
                    {isUnread && <span className="unread-dot"></span>}
                  </div>
                  
                  {/* Content */}
                  <div className="notification-content">
                    <div className="notification-header">
                      <span className="notification-type-badge">
                        {getNotificationTypeLabel(notif.type)}
                        {notif.isBroadcast && (
                          <span className="broadcast-tag">ALL</span>
                        )}
                      </span>
                      <span className="notification-time">{getRelativeTime(notif.createdAt)}</span>
                    </div>
                    
                    <h4 className="notification-title">{notif.title}</h4>
                    <p className="notification-message">{notif.message}</p>
                    
                    {/* Status badge */}
                    {notif.status && (
                      <div className={`notification-status-badge ${getStatusInfo(notif.status).class}`}>
                        {getStatusInfo(notif.status).icon} {getStatusInfo(notif.status).label}
                      </div>
                    )}
                    
                    {/* Priority badge for urgent */}
                    {notif.priority && notif.priority !== 'normal' && (
                      <div className={`notification-priority-badge priority-${notif.priority}`}>
                        {notif.priority.toUpperCase()}
                      </div>
                    )}

                    {/* Admin message preview */}
                    {notif.adminMessage && (
                      <div className="admin-message-preview">
                        <span className="admin-label">Admin:</span>
                        <span className="admin-preview">
                          {notif.adminMessage.length > 100 
                            ? `${notif.adminMessage.substring(0, 100)}...` 
                            : notif.adminMessage
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Chevron */}
                  <div className="notification-chevron">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      {isModalOpen && selectedNotification && (
        <div 
          className="notification-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="notification-modal">
            <div className="notification-modal-header">
              <div className="modal-type-info">
                <span className="modal-icon">{getNotificationIcon(selectedNotification.type)}</span>
                <div className="modal-meta">
                  <span className="modal-type">
                    {getNotificationTypeLabel(selectedNotification.type)}
                    {selectedNotification.isBroadcast && (
                      <span className="broadcast-badge">BROADCAST</span>
                    )}
                  </span>
                  <span className="modal-time">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="notification-modal-body">
              <h2 className="modal-title">{selectedNotification.title}</h2>
              <p className="modal-message">{selectedNotification.message}</p>

              {/* Admin Response Section */}
              {selectedNotification.adminMessage && (
                <div className="admin-response-section">
                  <div className="admin-response-header">
                    <span className="admin-icon">👤</span>
                    <span className="admin-response-label">Admin Response</span>
                  </div>
                  <p className="admin-response-message">
                    {selectedNotification.adminMessage}
                  </p>
                </div>
              )}

              {/* Status Section */}
              {selectedNotification.status && (
                <div className="status-section">
                  <span className="status-label">Current Status:</span>
                  <div className={`status-badge-large ${getStatusInfo(selectedNotification.status).class}`}>
                    <span>{getStatusInfo(selectedNotification.status).icon}</span>
                    <span>{getStatusInfo(selectedNotification.status).label}</span>
                  </div>
                  
                  {selectedNotification.previousStatus && (
                    <div className="status-change">
                      <span className="change-label">Changed from:</span>
                      <span className={`previous-status ${getStatusInfo(selectedNotification.previousStatus).class}`}>
                        {getStatusInfo(selectedNotification.previousStatus).label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Priority Badge */}
              {selectedNotification.priority && selectedNotification.priority !== 'normal' && (
                <div className={`priority-section priority-${selectedNotification.priority}`}>
                  <span className="priority-label">Priority:</span>
                  <span className="priority-value">{selectedNotification.priority.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="notification-modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
