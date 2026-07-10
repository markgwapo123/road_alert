import React, { useEffect, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import ToastNotification from './ToastNotification';
import { formatPushNotificationForToast } from '../utils/pushNotificationUtils';

/**
 * PushNotificationHandler Component
 * 
 * Handles incoming push notifications and displays them as toast notifications
 * when the app is in the foreground. Integrates with the existing ToastNotification component.
 */
const PushNotificationHandler = () => {
  const { notifications, pushEnabled } = useNotifications();
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    // Check for new push notifications
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      
      // Only show toast if it's a push notification and not already read
      if (!latestNotification.isRead && (latestNotification.type?.includes('push') || latestNotification.type?.includes('verified'))) {
        // Format for toast display
        const toastData = formatPushNotificationForToast(latestNotification);
        
        // Show toast notification
        setActiveToast(toastData);
      }
    }
  }, [notifications]);

  const handleToastClose = () => {
    setActiveToast(null);
  };

  // Don't render anything if push is not enabled or no active toast
  if (!pushEnabled || !activeToast) {
    return null;
  }

  return (
    <ToastNotification
      notification={activeToast}
      onClose={handleToastClose}
      autoClose={true}
      duration={5000}
    />
  );
};

export default PushNotificationHandler;
