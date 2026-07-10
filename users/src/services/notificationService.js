/**
 * Notification Service - Handles all notification-related API calls
 */
import config from '../config/index.js';

const API_BASE = config.API_BASE_URL;

/**
 * Get authorization headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Fetch all notifications for the current user
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {boolean} options.unreadOnly - Filter only unread
 * @param {string} options.type - Filter by notification type
 */
export const fetchNotifications = async ({ page = 1, limit = 20, unreadOnly = false, type = 'all' } = {}) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unread_only: unreadOnly.toString(),
      type
    });

    const response = await fetch(`${API_BASE}/notifications?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const response = await fetch(`${API_BASE}/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }
};

/**
 * Mark a specific notification as read
 * @param {string} notificationId - The notification ID
 */
export const markAsRead = async (notificationId) => {
  try {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  try {
    const response = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - The notification ID
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get only announcements
 * @param {number} limit - Maximum number of announcements
 */
export const fetchAnnouncements = async (limit = 10) => {
  try {
    const response = await fetch(`${API_BASE}/notifications/announcements?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

/**
 * Notification type definitions
 */
export const NOTIFICATION_TYPES = {
  ADMIN_RESPONSE: 'admin_response',
  STATUS_UPDATE: 'status_update',
  ANNOUNCEMENT: 'announcement',
  VERIFICATION_STATUS: 'verification_status',
  REPORT_STATUS_UPDATE: 'report_status_update',
  NEW_REPORT: 'new_report',
  SYSTEM_ALERT: 'system_alert'
};

/**
 * Get notification icon based on type
 */
export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.ADMIN_RESPONSE:
      return '📩';
    case NOTIFICATION_TYPES.STATUS_UPDATE:
    case NOTIFICATION_TYPES.REPORT_STATUS_UPDATE:
      return '🔄';
    case NOTIFICATION_TYPES.ANNOUNCEMENT:
      return '📢';
    case NOTIFICATION_TYPES.VERIFICATION_STATUS:
      return '🔐';
    case NOTIFICATION_TYPES.NEW_REPORT:
      return '🚨';
    case NOTIFICATION_TYPES.SYSTEM_ALERT:
      return '⚠️';
    default:
      return '🔔';
  }
};

/**
 * Get notification type label
 */
export const getNotificationTypeLabel = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.ADMIN_RESPONSE:
      return 'Admin Response';
    case NOTIFICATION_TYPES.STATUS_UPDATE:
    case NOTIFICATION_TYPES.REPORT_STATUS_UPDATE:
      return 'Status Update';
    case NOTIFICATION_TYPES.ANNOUNCEMENT:
      return 'Announcement';
    case NOTIFICATION_TYPES.VERIFICATION_STATUS:
      return 'Verification';
    case NOTIFICATION_TYPES.NEW_REPORT:
      return 'New Report';
    case NOTIFICATION_TYPES.SYSTEM_ALERT:
      return 'System Alert';
    default:
      return 'Notification';
  }
};

/**
 * Get status color class
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'status-pending';
    case 'under_review':
      return 'status-review';
    case 'verified':
    case 'resolved':
      return 'status-success';
    case 'rejected':
      return 'status-rejected';
    default:
      return 'status-default';
  }
};

/**
 * Get priority color class
 */
export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'urgent':
      return 'priority-urgent';
    case 'high':
      return 'priority-high';
    case 'normal':
      return 'priority-normal';
    case 'low':
      return 'priority-low';
    default:
      return 'priority-normal';
  }
};

/**
 * Format relative time
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffInSeconds = Math.floor((now - notifDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  
  return notifDate.toLocaleDateString();
};

/**
 * Send push notification to specific users
 * @param {Object} notificationData - Notification data
 * @param {Array} userIds - Array of user IDs to send to
 * @param {boolean} broadcast - Send to all users if true
 */
export const sendPushNotification = async (notificationData, userIds = [], broadcast = false) => {
  try {
    const response = await fetch(`${API_BASE}/notifications/push`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        notification: notificationData,
        userIds,
        broadcast
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send push notification for verified report
 * @param {Object} reportData - Report information
 * @param {boolean} broadcast - Send to all users
 */
export const sendVerifiedReportNotification = async (reportData, broadcast = true) => {
  const notificationData = {
    title: '🚨 Verified Incident',
    body: `A verified incident has been reported in ${reportData.barangay || 'your area'}.`,
    type: 'report_verified',
    data: {
      reportId: reportData._id || reportData.reportId,
      title: reportData.title,
      category: reportData.category,
      barangay: reportData.barangay,
      status: 'verified',
      timestamp: new Date().toISOString()
    }
  };

  return sendPushNotification(notificationData, [], broadcast);
};

/**
 * Send push notification for pending report (admin only)
 * @param {Object} reportData - Report information
 * @param {Array} adminIds - Array of admin user IDs
 */
export const sendPendingReportNotification = async (reportData, adminIds = []) => {
  const notificationData = {
    title: '📋 New Report Pending',
    body: `A new report "${reportData.title}" is pending verification.`,
    type: 'report_pending',
    data: {
      reportId: reportData._id || reportData.reportId,
      title: reportData.title,
      category: reportData.category,
      barangay: reportData.barangay,
      status: 'pending',
      timestamp: new Date().toISOString()
    }
  };

  return sendPushNotification(notificationData, adminIds, false);
};

/**
 * Format push notification content for verified report
 * @param {Object} report - Report data
 * @returns {Object} Formatted notification
 */
export const formatVerifiedReportNotification = (report) => {
  return {
    title: '🚨 Verified Incident',
    body: `${report.title}\nCategory: ${report.category}\nBarangay: ${report.barangay}\nReport ID: ${report._id}\nTime: ${new Date(report.createdAt).toLocaleString()}`,
    data: {
      type: 'report_verified',
      reportId: report._id,
      title: report.title,
      category: report.category,
      barangay: report.barangay,
      status: 'verified',
      description: report.description?.substring(0, 100) || ''
    }
  };
};

/**
 * Check if notification should be sent (duplicate prevention)
 * @param {string} reportId - Report ID
 * @param {string} fromStatus - Previous status
 * @param {string} toStatus - New status
 * @returns {boolean} Whether to send notification
 */
export const shouldSendNotification = (reportId, fromStatus, toStatus) => {
  // Only send notification when transitioning from pending to verified
  if (fromStatus === 'pending' && toStatus === 'verified') {
    return true;
  }
  
  // Don't send for other status changes unless explicitly needed
  return false;
};

export default {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  fetchAnnouncements,
  NOTIFICATION_TYPES,
  getNotificationIcon,
  getNotificationTypeLabel,
  getStatusColor,
  getPriorityColor,
  getRelativeTime,
  sendPushNotification,
  sendVerifiedReportNotification,
  sendPendingReportNotification,
  formatVerifiedReportNotification,
  shouldSendNotification
};
