import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NotificationPage = ({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onRefresh }) => {
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // Refresh notifications when page loads
    onRefresh();
  }, [onRefresh]);

  const filterOptions = [
    { value: 'all', label: 'All Notifications', count: notifications.length },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'verification_status', label: 'Verification', count: notifications.filter(n => n.type === 'verification_status').length },
    { value: 'new_report', label: 'Reports', count: notifications.filter(n => n.type === 'new_report').length },
    { value: 'system_alert', label: 'System', count: notifications.filter(n => n.type === 'system_alert').length }
  ];

  const getFilteredNotifications = () => {
    let filtered = [...notifications];

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => !n.read);
      } else {
        filtered = filtered.filter(n => n.type === filterType);
      }
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'unread') {
      filtered.sort((a, b) => {
        if (a.read && !b.read) return 1;
        if (!a.read && b.read) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return filtered;
  };

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

  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
      onRefresh();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="notification-page">
      <div className="notification-page-header">
        <div className="page-title-section">
          <h1 className="page-title">
            <span className="page-icon">🔔</span>
            Notifications
          </h1>
          <p className="page-subtitle">
            Stay updated with your account and reports
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
          >
            <span className="btn-icon">✓</span>
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      <div className="notification-controls">
        <div className="filter-section">
          <h3>Filter by Type</h3>
          <div className="filter-tabs">
            {filterOptions.map(option => (
              <button
                key={option.value}
                className={`filter-tab ${filterType === option.value ? 'active' : ''}`}
                onClick={() => setFilterType(option.value)}
              >
                {option.label}
                {option.count > 0 && (
                  <span className="filter-count">{option.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

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
          </select>
        </div>
      </div>

      <div className="notifications-container">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications-page">
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <h3>No notifications found</h3>
              <p>
                {filterType === 'all' 
                  ? "You don't have any notifications yet."
                  : `No ${filterType === 'unread' ? 'unread' : filterType.replace('_', ' ')} notifications found.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="notifications-grid">
            {filteredNotifications.map(notif => (
              <div 
                key={notif._id} 
                className={`notification-card ${!notif.read ? 'unread' : 'read'}`}
                data-type={notif.type}
                data-title={notif.title}
                onClick={() => onMarkAsRead(notif._id)}
              >
                <div className="notification-card-header">
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-meta">
                    <span className="notification-type">
                      {notif.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="notification-time">
                      {getRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  {!notif.read && (
                    <div className="unread-indicator">
                      <span className="unread-dot"></span>
                    </div>
                  )}
                </div>
                
                <div className="notification-content">
                  <h4 className="notification-title">{notif.title}</h4>
                  <p className="notification-message">{notif.message}</p>
                </div>

                <div className="notification-card-footer">
                  <span className="full-time">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                  {!notif.read && (
                    <span className="read-action">Click to mark as read</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
