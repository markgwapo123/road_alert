import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import './NotificationScreen.css';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
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
        
        // The backend returns a complex object, let's ensure we get the array
        const fetchedNotifications = response.data.notifications || response.data;
        
        if (Array.isArray(fetchedNotifications)) {
            setNotifications(fetchedNotifications);
        } else {
            // Handle cases where the structure is not as expected
            console.error("Fetched data is not an array:", fetchedNotifications);
            setNotifications([]);
        }
        
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch notifications.');
        console.error("Notification fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
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
            {['All', 'Unread', 'Mentions', 'Reports', 'Archive'].map(filter => (
              <button 
                key={filter}
                className={`notif-filter ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                {filter === 'All' && notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Sort and Refresh Actions */}
        <div className="notif-actions-row">
            <span className="notif-sort-label">Sort by:</span>
            <select id="sort-by" className="notif-sort">
              <option>Newest First</option>
              <option>Oldest First</option>
            </select>
            <button className="notif-refresh-icon-btn" aria-label="Refresh notifications">
                <span role="img" aria-label="refresh">⟳</span>
            </button>
        </div>

        <div className="notif-list">
          {loading ? (
            <div className="loading-state">Loading notifications...</div>
          ) : error ? (
            <div className="error-state">{error}</div>
          ) : notifications.length > 0 ? (
            notifications.map(n => (
              <div className="notif-card" key={n._id}>
                <div className="notif-card-row">
                  <span className="notif-card-icon" role="img" aria-label="icon">{getNotificationIcon(n.type)}</span>
                  <span className="notif-card-type">{n.type ? n.type.replace(/_/g, ' ').toUpperCase() : 'NOTIFICATION'}</span>
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
    </div>
  );
};

export default NotificationScreen;
