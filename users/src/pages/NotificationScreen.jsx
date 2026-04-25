import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import './NotificationScreen.css';

const NotificationScreen = ({ notifications: prefetchedNotifications, onRefresh, onMarkAsRead, onMarkAllAsRead }) => {
  const [notifications, setNotifications] = useState(prefetchedNotifications || []);
  const [loading, setLoading] = useState(!prefetchedNotifications || prefetchedNotifications.length === 0);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Sync when prefetchedNotifications changes
  useEffect(() => {
    if (prefetchedNotifications && prefetchedNotifications.length > 0) {
      setNotifications(prefetchedNotifications);
      setLoading(false);
      setError(null);
    }
  }, [prefetchedNotifications]);

  useEffect(() => {
    // If we don't have pre-fetched notifications, fetch them
    if (!prefetchedNotifications || prefetchedNotifications.length === 0) {
      const fetchNotifications = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          if (!token) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
          }

          const response = await axios.get(`${config.API_BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const fetchedNotifications = response.data.notifications || response.data;
          
          if (Array.isArray(fetchedNotifications)) {
              setNotifications(fetchedNotifications);
          } else {
              setNotifications([]);
          }
          
          setError(null);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to fetch notifications.');
        } finally {
          setLoading(false);
        }
      };

      fetchNotifications();
    }
  }, []);

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

  const getRelativeTime = (date) => {
    if (!date) return '';
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

  const handleNotifClick = (notif) => {
    setSelectedNotif(notif);
    if (!notif.isRead && typeof onMarkAsRead === 'function') {
      onMarkAsRead(notif._id);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'Unread') return !n.isRead;
    if (activeFilter === 'Reports') return n.type === 'new_report' || n.type === 'report_status_update' || n.type === 'report_resolved';
    return true;
  });

  return (
    <div className="notif-screen">
      {/* Fixed Header */}
      <header className="notif-header">
        <div className="notif-title-container">
            <h1 className="notif-title">Notifications</h1>
        </div>
        <p className="notif-subtitle">Stay updated with your reports and announcements</p>
      </header>

      {/* Scrollable Content Area */}
      <main className="notif-content-area">
        {/* Filter Tabs */}
        <div className="notif-filters-scroll-container">
          <div className="notif-filters-row">
            {['All', 'Unread', 'Reports'].map(filter => (
              <button 
                key={filter}
                className={`notif-filter ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                {filter === 'All' && notifications.length > 0 && (
                  <span className="notif-badge">{notifications.length}</span>
                )}
                {filter === 'Unread' && notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="notif-badge" style={{ backgroundColor: '#ef4444' }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {notifications.some(n => !n.isRead) && (
          <div style={{ padding: '0 16px', marginBottom: '8px' }}>
            <button 
              onClick={onMarkAllAsRead}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#374151',
                fontWeight: '600'
              }}
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Sort and Refresh Actions */}
        <div className="notif-actions-row">
            <span className="notif-sort-label">Sort by:</span>
            <select id="sort-by" className="notif-sort">
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
            <button className="notif-refresh-icon-btn" aria-label="Refresh notifications" onClick={onRefresh}>
                <span role="img" aria-label="refresh">⟳</span>
            </button>
        </div>

        <div className="notif-list">
          {loading ? (
            <div className="loading-state">Loading notifications...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(n => (
              <div 
                className={`notif-card ${!n.isRead ? 'unread' : ''}`} 
                key={n._id}
                onClick={() => handleNotifClick(n)}
                style={{ cursor: 'pointer' }}
              >
                <div className="notif-card-row">
                  <span className="notif-card-icon" role="img" aria-label="icon">{getNotificationIcon(n.type)}</span>
                  <span className="notif-card-type">{n.type ? n.type.replace(/_/g, ' ').toUpperCase() : 'NOTIFICATION'}</span>
                  {!n.isRead && <span className="unread-dot"></span>}
                  <span className="notif-card-date">{getRelativeTime(n.createdAt)}</span>
                </div>
                <div className="notif-card-title">{n.title}</div>
                <p className="notif-card-message">{n.message}</p>
                {n.status && (
                  <div className="notif-card-status">
                    <span className="notif-status-badge">✔ {n.status}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">You have no notifications.</div>
          )}
        </div>
      </main>

      {/* Notification Details Modal */}
      {selectedNotif && (
        <div className="notif-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="notif-modal-content" onClick={e => e.stopPropagation()}>
            <div className="notif-modal-header">
              <span className="notif-modal-icon">{getNotificationIcon(selectedNotif.type)}</span>
              <button className="notif-modal-close" onClick={() => setSelectedNotif(null)}>×</button>
            </div>
            <div className="notif-modal-body">
              <div className="notif-modal-type">{selectedNotif.type?.replace(/_/g, ' ').toUpperCase()}</div>
              <h2 className="notif-modal-title">{selectedNotif.title}</h2>
              <div className="notif-modal-date">{new Date(selectedNotif.createdAt).toLocaleString()}</div>
              <p className="notif-modal-message">{selectedNotif.message}</p>
              
              {selectedNotif.status && (
                <div className="notif-modal-status">
                  <strong>Status:</strong> <span className="status-val">{selectedNotif.status}</span>
                </div>
              )}
            </div>
            <button className="notif-modal-btn" onClick={() => setSelectedNotif(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationScreen;
