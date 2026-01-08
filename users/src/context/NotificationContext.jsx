import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService';
import { 
  cacheNotifications, 
  getCachedNotifications, 
  markNotificationReadLocally,
  addToSyncQueue 
} from '../services/offlineStorage';

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
   * Fetch notifications from API (with offline fallback)
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
      
      // Check if online
      if (!navigator.onLine) {
        // Load from cache when offline
        console.log('📴 Offline - loading cached notifications');
        const cachedNotifs = await getCachedNotifications();
        setNotifications(cachedNotifs);
        setUnreadCount(cachedNotifs.filter(n => !n.isRead).length);
        return;
      }
      
      const response = await notificationService.fetchNotifications(options);
      
      if (response.success) {
        const notifs = response.notifications || [];
        setNotifications(notifs);
        setUnreadCount(response.unreadCount || 0);
        if (response.counts) {
          setCounts(response.counts);
        }
        
        // Cache notifications for offline use
        if (notifs.length > 0) {
          await cacheNotifications(notifs);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      
      // On error, try to load from cache
      try {
        const cachedNotifs = await getCachedNotifications();
        if (cachedNotifs.length > 0) {
          console.log('📦 Loading cached notifications after error');
          setNotifications(cachedNotifs);
          setUnreadCount(cachedNotifs.filter(n => !n.isRead).length);
        }
      } catch (cacheErr) {
        console.error('Cache error:', cacheErr);
      }
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
   * Mark a notification as read (with offline support)
   */
  const markAsRead = useCallback(async (notificationId) => {
    if (!token || !notificationId) return;

    try {
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Mark as read locally
      await markNotificationReadLocally(notificationId);
      
      // If offline, queue for sync
      if (!navigator.onLine) {
        await addToSyncQueue({
          operation: 'mark_notification_read',
          data: { notificationId },
          priority: 0
        });
        return { success: true, offline: true };
      }
      
      // Online - sync immediately
      const response = await notificationService.markAsRead(notificationId);
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
