/**
 * Device Service - Handles device registration and push notification token management
 */
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
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
 * Register device for push notifications
 * @param {string} pushToken - The FCM push token
 * @returns {Promise<Object>} Registration response
 */
export const registerDevice = async (pushToken) => {
  try {
    const deviceInfo = await Device.getInfo();
    const userId = localStorage.getItem('userId');

    const deviceData = {
      userId,
      token: pushToken,
      platform: deviceInfo.platform,
      model: deviceInfo.model,
      osVersion: deviceInfo.osVersion,
      appVersion: '1.0.0',
      lastActive: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE}/devices/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(deviceData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Store device ID locally
    if (result.deviceId) {
      localStorage.setItem('deviceId', result.deviceId);
    }

    return result;
  } catch (error) {
    console.error('Error registering device:', error);
    throw error;
  }
};

/**
 * Update device token when it changes
 * @param {string} oldToken - The old push token
 * @param {string} newToken - The new push token
 * @returns {Promise<Object>} Update response
 */
export const updateDeviceToken = async (oldToken, newToken) => {
  try {
    const deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      console.warn('No device ID found, registering as new device');
      return registerDevice(newToken);
    }

    const response = await fetch(`${API_BASE}/devices/${deviceId}/token`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        oldToken,
        newToken,
        lastActive: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating device token:', error);
    throw error;
  }
};

/**
 * Remove device token (logout)
 * @returns {Promise<Object>} Removal response
 */
export const removeDeviceToken = async () => {
  try {
    const deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      console.warn('No device ID found, nothing to remove');
      return { success: true };
    }

    const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Clear local storage
    localStorage.removeItem('deviceId');

    return await response.json();
  } catch (error) {
    console.error('Error removing device token:', error);
    throw error;
  }
};

/**
 * Update last active timestamp
 * @returns {Promise<Object>} Update response
 */
export const updateLastActive = async () => {
  try {
    const deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      return { success: true };
    }

    const response = await fetch(`${API_BASE}/devices/${deviceId}/active`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        lastActive: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating last active:', error);
    throw error;
  }
};

/**
 * Initialize push notifications and register device
 * @returns {Promise<string>} Push token
 */
export const initializePushNotifications = async () => {
  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('Push notification permission not granted');
    }

    // Register with APNS/FCM
    await PushNotifications.register();

    // Get the token
    const result = await PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      registerDevice(token.value);
    });

    // Handle registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Get current token (if already registered)
    const currentToken = await PushNotifications.getDeliveredNotifications();
    
    return result;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    throw error;
  }
};

/**
 * Listen for incoming push notifications
 * @param {Function} callback - Callback function to handle notification
 */
export const listenForPushNotifications = async (callback) => {
  try {
    // Listen for notification received when app is in foreground
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ' + JSON.stringify(notification));
      callback(notification);
    });

    // Listen for notification action performed (tapped)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed: ' + JSON.stringify(notification));
      callback(notification, true);
    });
  } catch (error) {
    console.error('Error setting up push notification listeners:', error);
    throw error;
  }
};

/**
 * Remove all push notification listeners
 */
export const removePushListeners = async () => {
  try {
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error('Error removing push notification listeners:', error);
  }
};

export default {
  registerDevice,
  updateDeviceToken,
  removeDeviceToken,
  updateLastActive,
  initializePushNotifications,
  listenForPushNotifications,
  removePushListeners
};
