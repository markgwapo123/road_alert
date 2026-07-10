import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService';
import * as deviceService from '../services/deviceService';
import * as notificationPreferencesService from '../services/notificationPreferencesService';

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
  
  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(
    notificationPreferencesService.DEFAULT_PREFERENCES
  );
  
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

  /**
   * Initialize push notifications
   */
  const initializePushNotifications = useCallback(async () => {
    if (!token) return;

    try {
      await deviceService.initializePushNotifications();
      setPushEnabled(true);
      
      // Listen for incoming push notifications
      await deviceService.listenForPushNotifications((notification, isActionPerformed = false) => {
        handlePushNotification(notification, isActionPerformed);
      });
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      setPushEnabled(false);
    }
  }, [token]);

  /**
   * Handle incoming push notification
   */
  const handlePushNotification = useCallback(async (notification, isActionPerformed = false) => {
    try {
      const notificationData = notification.data || notification;
      
      // Check user preferences
      const shouldReceive = notificationPreferencesService.shouldReceiveNotification(
        notificationData.type,
        notificationPreferences
      );
      
      if (!shouldReceive) return;

      // If notification was tapped, handle navigation
      if (isActionPerformed && notificationData.reportId) {
        // Store the report ID for navigation
        localStorage.setItem('pendingNavigation', JSON.stringify({
          type: 'report',
          reportId: notificationData.reportId
        }));
        
        // The actual navigation will be handled by the app
        return;
      }

      // If app is in foreground, show toast notification
      if (!isActionPerformed) {
        // Add to local notifications
        const newNotification = {
          _id: notificationData.notificationId || Date.now().toString(),
          type: notificationData.type || 'push_notification',
          title: notification.title || notificationData.title,
          message: notification.body || notificationData.message,
          isRead: false,
          createdAt: notificationData.timestamp || new Date().toISOString(),
          data: notificationData
        };

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error handling push notification:', error);
    }
  }, [notificationPreferences]);

  /**
   * Fetch notification preferences
   */
  const fetchNotificationPreferences = useCallback(async () => {
    if (!token) return;

    try {
      const prefs = await notificationPreferencesService.getNotificationPreferences();
      setNotificationPreferences(prefs);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }, [token]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (newPreferences) => {
    if (!token) return;

    try {
      await notificationPreferencesService.updateNotificationPreferences(newPreferences);
      setNotificationPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [token]);

  /**
   * Send push notification (admin function)
   */
  const sendPushNotification = useCallback(async (notificationData, userIds = [], broadcast = false) => {
    if (!token) return;

    try {
      return await notificationService.sendPushNotification(notificationData, userIds, broadcast);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }, [token]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (token) {
      // Initial fetch
      fetchNotifications();
      
      // Fetch notification preferences
      fetchNotificationPreferences();
      
      // Initialize push notifications
      initializePushNotifications();
      
      // Setup polling
      pollIntervalRef.current = setInterval(() => {
        refreshUnreadCount();
      }, POLL_INTERVAL);
    } else {
      // Clear notifications when logged out
      setNotifications([]);
      setUnreadCount(0);
      setPushEnabled(false);
      
      // Remove device token
      deviceService.removeDeviceToken();
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Remove push listeners on cleanup
      deviceService.removePushListeners();
    };
  }, [token, fetchNotifications, refreshUnreadCount, fetchNotificationPreferences, initializePushNotifications]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    counts,
    isPanelOpen,
    selectedNotification,
    pushEnabled,
    notificationPreferences,
    
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
    
    // Push notification actions
    initializePushNotifications,
    sendPushNotification,
    updatePreferences,
    
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
