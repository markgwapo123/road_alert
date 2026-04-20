import React from 'react';
import './NotificationScreen.css';

const notifications = [
  // Example data
  {
    id: 1,
    type: 'Verification',
    date: '24/02/2026',
    title: 'Report Approved: Other',
    message: 'Great news! Your other report has been verified and is now visible to the...',
    status: 'Verified',
  },
  {
    id: 2,
    type: 'Verification',
    date: '15/02/2026',
    title: 'Report Approved: Construction',
    message: 'Your construction report has been approved.',
    status: 'Verified',
  },
];

export default function NotificationScreen() {
  return (
    <div className="notif-root">
      <header className="notif-header">
        <div className="notif-title-container">
            <span role="img" aria-label="bell" className="notif-title-icon">🔔</span>
            <h1 className="notif-title">Notifications</h1>
        </div>
        <p className="notif-subtitle">Stay updated with your reports and announcements</p>
      </header>

      <div className="notif-filters-row">
        <button className="notif-filter active">All <span className="notif-badge">20</span></button>
        <button className="notif-filter">
            <span className="notif-filter-dot"></span>
        </button>
        <button className="notif-filter" aria-label="messages">
            <span role="img" aria-label="envelope">✉️</span>
        </button>
        <button className="notif-filter" aria-label="updates">
            <span role="img" aria-label="refresh">🔄</span>
        </button>
        <button className="notif-filter" aria-label="resolved">
            <span role="img" aria-label="checkmark">📢</span>
        </button>
      </div>

      <div className="notif-actions-row">
        <div className="notif-sort-container">
            <label htmlFor="sort-by" className="notif-sort-label">Sort by:</label>
            <select id="sort-by" className="notif-sort">
            <option>Newest First</option>
            <option>Oldest First</option>
            </select>
        </div>
        <button className="notif-refresh">
            <span role="img" aria-label="refresh" className="notif-refresh-icon">⟳</span>
            Refresh
        </button>
      </div>

      <div className="notif-list">
        {notifications.map(n => (
          <div className="notif-card" key={n.id}>
            <div className="notif-card-row">
              <span className="notif-card-icon" role="img" aria-label="lock">🔐</span>
              <span className="notif-card-type">{n.type.toUpperCase()}</span>
              <span className="notif-card-date">{n.date}</span>
              <span className="notif-card-arrow">></span>
            </div>
            <div className="notif-card-title">{n.title}</div>
            <div className="notif-card-message">{n.message}</div>
            <div className="notif-card-status">{n.status === 'Verified' && <span className="notif-status-badge">✔ Verified</span>}</div>
          </div>
        ))}
      </div>

      <nav className="notif-bottom-nav">
        <button><span role="img" aria-label="home">🏠</span></button>
        <button><span role="img" aria-label="stats">📊</span></button>
        <button className="notif-add">＋</button>
        <button className="notif-active"><span role="img" aria-label="notifications">🔔</span></button>
        <button><span role="img" aria-label="menu">≡</span></button>
      </nav>
    </div>
  );
}
