import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService';

const NotificationContext = createContext(null);

// Polling interval (30 seconds)
const POLL_INTERVAL = 30000;

export const NotificationProvider = ({ children, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({
    total: 0,
    unread: 0,
    adminResponses: 0,
    statusUpdates: 0,
    announcements: 0
  });
  
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // Polling ref
  const pollIntervalRef = useRef(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async (options = {}) => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationService.fetchNotifications(options);
      
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
        if (response.counts) {
          setCounts(response.counts);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      // Don't clear notifications on error, keep showing cached ones
    } finally {
      setLoading(false);
    }
  }, [token]);

  /**
   * Refresh unread count only (lightweight)
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await notificationService.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error refreshing unread count:', err);
    }
  }, [token]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!token || !notificationId) return;

    try {
      const response = await notificationService.markAsRead(notificationId);
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId 
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return response;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, [token]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const response = await notificationService.markAllAsRead();
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
      
      return response;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [token]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    if (!token || !notificationId) return;

    try {
      const response = await notificationService.deleteNotification(notificationId);
      
      if (response.success) {
        // Update local state
        const deletedNotif = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        
        // Update unread count if deleted notification was unread
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      
      return response;
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [token, notifications]);

  /**
   * Open notification panel
   */
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  /**
   * Close notification panel
   */
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedNotification(null);
  }, []);

  /**
   * Toggle notification panel
   */
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    if (isPanelOpen) {
      setSelectedNotification(null);
    }
  }, [isPanelOpen]);

  /**
   * Select a notification for detailed view
   */
  const selectNotification = useCallback(async (notification) => {
    setSelectedNotification(notification);
    
    // Mark as read when selected
    if (notification && !notification.isRead) {
      await markAsRead(notification._id);
    }
  }, [markAsRead]);

  /**
   * Clear selected notification
   */
  const clearSelectedNotification = useCallback(() => {
    setSelectedNotification(null);
  }, []);

  /**
   * Get notifications filtered by type
   */
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  /**
   * Get only unread notifications
   */
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.isRead);
  }, [notifications]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (token) {
      // Initial fetch
      fetchNotifications();
      
      // Setup polling
      pollIntervalRef.current = setInterval(() => {
        refreshUnreadCount();
      }, POLL_INTERVAL);
    } else {
      // Clear notifications when logged out
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [token, fetchNotifications, refreshUnreadCount]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    counts,
    isPanelOpen,
    selectedNotification,
    
    // Actions
    fetchNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    
    // Panel controls
    openPanel,
    closePanel,
    togglePanel,
    selectNotification,
    clearSelectedNotification,
    
    // Helpers
    getNotificationsByType,
    getUnreadNotifications,
    
    // Service utilities
    getNotificationIcon: notificationService.getNotificationIcon,
    getNotificationTypeLabel: notificationService.getNotificationTypeLabel,
    getStatusColor: notificationService.getStatusColor,
    getPriorityColor: notificationService.getPriorityColor,
    getRelativeTime: notificationService.getRelativeTime,
    NOTIFICATION_TYPES: notificationService.NOTIFICATION_TYPES
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
