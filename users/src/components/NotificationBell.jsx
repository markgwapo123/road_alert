import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationBell.css';

/**
 * NotificationBell Component
 * 
 * A compact bell icon with unread badge for the header/navbar.
 * Clicking opens the notification panel.
 */
const NotificationBell = ({ onClick, className = '' }) => {
  const { unreadCount, togglePanel, isPanelOpen } = useNotifications();

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      togglePanel();
    }
  };

  return (
    <button
      className={`notification-bell ${isPanelOpen ? 'active' : ''} ${className}`}
      onClick={handleClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <span className="notification-bell-icon">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </span>
      
      {unreadCount > 0 && (
        <span className="notification-bell-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {/* Animated ring effect when there are unread notifications */}
      {unreadCount > 0 && (
        <span className="notification-bell-ring"></span>
      )}
    </button>
  );
};

export default NotificationBell;
