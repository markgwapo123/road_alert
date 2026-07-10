/**
 * Push Notification Utilities
 * Helper functions for handling push notifications
 */

/**
 * Handle push notification click/tap
 * @param {Object} notificationData - Notification data
 * @param {Function} navigate - Navigation function
 */
export const handlePushNotificationClick = (notificationData, navigate) => {
  try {
    const data = notificationData.data || notificationData;

    // Check if there's a pending navigation from localStorage
    const pendingNav = localStorage.getItem('pendingNavigation');
    if (pendingNav) {
      const parsed = JSON.parse(pendingNav);
      localStorage.removeItem('pendingNavigation');

      if (parsed.type === 'report' && parsed.reportId) {
        navigate(`/report/${parsed.reportId}`);
        return;
      }
    }

    // Handle report navigation
    if (data.reportId) {
      navigate(`/report/${data.reportId}`);
      return;
    }

    // Handle other navigation types
    if (data.type === 'announcement') {
      navigate('/news');
    } else if (data.type === 'admin_response') {
      navigate('/my-reports');
    } else {
      // Default to notifications page
      navigate('/notifications');
    }
  } catch (error) {
    console.error('Error handling push notification click:', error);
  }
};

/**
 * Format push notification for display
 * @param {Object} pushNotification - Raw push notification
 * @returns {Object} Formatted notification for ToastNotification
 */
export const formatPushNotificationForToast = (pushNotification) => {
  const data = pushNotification.data || {};
  
  return {
    _id: data.notificationId || Date.now().toString(),
    type: data.type || 'push_notification',
    title: pushNotification.title || data.title || 'Notification',
    message: pushNotification.body || data.message || '',
    isRead: false,
    createdAt: data.timestamp || new Date().toISOString(),
    priority: data.priority || 'normal',
    isBroadcast: data.broadcast || false,
    status: data.status || null,
    data: data
  };
};

/**
 * Check if notification should trigger navigation
 * @param {Object} notification - Notification data
 * @returns {boolean}
 */
export const shouldNavigateOnTap = (notification) => {
  const data = notification.data || notification;
  return !!(data.reportId || data.type === 'announcement');
};

/**
 * Get navigation path from notification
 * @param {Object} notification - Notification data
 * @returns {string|null} Navigation path
 */
export const getNavigationPath = (notification) => {
  const data = notification.data || notification;
  
  if (data.reportId) {
    return `/report/${data.reportId}`;
  }
  
  if (data.type === 'announcement') {
    return '/news';
  }
  
  if (data.type === 'admin_response') {
    return '/my-reports';
  }
  
  return '/notifications';
};

/**
 * Store notification for later handling
 * @param {Object} notification - Notification data
 */
export const storePendingNotification = (notification) => {
  try {
    localStorage.setItem('pendingNotification', JSON.stringify(notification));
  } catch (error) {
    console.error('Error storing pending notification:', error);
  }
};

/**
 * Retrieve and clear pending notification
 * @returns {Object|null} Pending notification or null
 */
export const retrievePendingNotification = () => {
  try {
    const pending = localStorage.getItem('pendingNotification');
    if (pending) {
      localStorage.removeItem('pendingNotification');
      return JSON.parse(pending);
    }
  } catch (error) {
    console.error('Error retrieving pending notification:', error);
  }
  return null;
};

/**
 * Check if app is in foreground
 * @returns {boolean}
 */
export const isAppInForeground = () => {
  return document.visibilityState === 'visible';
};

/**
 * Request notification permission (for web)
 * @returns {Promise<boolean>}
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * Show local notification (fallback for web)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 */
export const showLocalNotification = (title, body, data = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/phlogo.png',
      badge: '/phlogo.png',
      tag: data.reportId || data.type || 'notification',
      data: data
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Store for navigation handling
      if (data.reportId) {
        storePendingNotification({ type: 'report', reportId: data.reportId });
      }
    };

    return notification;
  }
};

export default {
  handlePushNotificationClick,
  formatPushNotificationForToast,
  shouldNavigateOnTap,
  getNavigationPath,
  storePendingNotification,
  retrievePendingNotification,
  isAppInForeground,
  requestNotificationPermission,
  showLocalNotification
};
