/**
 * Notification Preferences Service - Handles user notification preferences
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
 * Default notification preferences
 */
export const DEFAULT_PREFERENCES = {
  verifiedReports: true,
  barangayAnnouncements: true,
  emergencyAlerts: true,
  systemNotifications: true,
  adminResponses: true,
  statusUpdates: true
};

/**
 * Get user notification preferences
 * @returns {Promise<Object>} User preferences
 */
export const getNotificationPreferences = async () => {
  try {
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.preferences || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    // Return default preferences on error
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Update user notification preferences
 * @param {Object} preferences - Updated preferences
 * @returns {Promise<Object>} Update response
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await fetch(`${API_BASE}/notifications/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ preferences })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

/**
 * Check if user should receive notification based on preferences
 * @param {string} notificationType - Type of notification
 * @param {Object} userPreferences - User's notification preferences
 * @returns {boolean} Whether user should receive notification
 */
export const shouldReceiveNotification = (notificationType, userPreferences) => {
  const prefs = userPreferences || DEFAULT_PREFERENCES;

  switch (notificationType) {
    case 'report_verified':
    case 'verified_report':
      return prefs.verifiedReports;
    case 'announcement':
    case 'barangay_announcement':
      return prefs.barangayAnnouncements;
    case 'emergency':
    case 'emergency_alert':
      return prefs.emergencyAlerts;
    case 'system':
    case 'system_alert':
      return prefs.systemNotifications;
    case 'admin_response':
      return prefs.adminResponses;
    case 'status_update':
    case 'report_status_update':
      return prefs.statusUpdates;
    default:
      return true; // Default to true for unknown types
  }
};

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldReceiveNotification,
  DEFAULT_PREFERENCES
};
