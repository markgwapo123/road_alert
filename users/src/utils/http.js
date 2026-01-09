/**
 * HTTP Utility for BantayDalan
 * Provides cross-platform HTTP requests that work on both web and mobile (Capacitor)
 * Uses CapacitorHttp on native platforms to bypass CORS restrictions
 */
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// Check if running on native platform (Android/iOS)
export const isNativePlatform = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

console.log(`🔧 HTTP Utility initialized - Platform: ${platform}, Native: ${isNativePlatform}`);

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

/**
 * Make an HTTP GET request
 * Uses CapacitorHttp on native platforms (bypasses CORS)
 */
export const httpGet = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isNativePlatform) {
    console.log(`📱 Native HTTP GET: ${url}`);
    try {
      const response = await CapacitorHttp.get({
        url,
        headers,
        connectTimeout: options.timeout || 15000,
        readTimeout: options.timeout || 15000,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error) {
      console.error(`❌ Native HTTP GET failed: ${url}`, error);
      throw error;
    }
  } else {
    return fetch(url, {
      method: 'GET',
      headers,
      ...options,
    });
  }
};

/**
 * Make an HTTP POST request
 * Uses CapacitorHttp on native platforms (bypasses CORS)
 */
export const httpPost = async (url, data, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isNativePlatform) {
    console.log(`📱 Native HTTP POST: ${url}`);
    try {
      const response = await CapacitorHttp.post({
        url,
        headers,
        data,
        connectTimeout: options.timeout || 15000,
        readTimeout: options.timeout || 15000,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error) {
      console.error(`❌ Native HTTP POST failed: ${url}`, error);
      throw error;
    }
  } else {
    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }
};

/**
 * Make an HTTP PUT request
 */
export const httpPut = async (url, data, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isNativePlatform) {
    console.log(`📱 Native HTTP PUT: ${url}`);
    try {
      const response = await CapacitorHttp.put({
        url,
        headers,
        data,
        connectTimeout: options.timeout || 15000,
        readTimeout: options.timeout || 15000,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error) {
      console.error(`❌ Native HTTP PUT failed: ${url}`, error);
      throw error;
    }
  } else {
    return fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }
};

/**
 * Make an HTTP DELETE request
 */
export const httpDelete = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isNativePlatform) {
    console.log(`📱 Native HTTP DELETE: ${url}`);
    try {
      const response = await CapacitorHttp.delete({
        url,
        headers,
        connectTimeout: options.timeout || 15000,
        readTimeout: options.timeout || 15000,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error) {
      console.error(`❌ Native HTTP DELETE failed: ${url}`, error);
      throw error;
    }
  } else {
    return fetch(url, {
      method: 'DELETE',
      headers,
      ...options,
    });
  }
};

/**
 * Make an HTTP PATCH request
 */
export const httpPatch = async (url, data, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (isNativePlatform) {
    console.log(`📱 Native HTTP PATCH: ${url}`);
    try {
      const response = await CapacitorHttp.patch({
        url,
        headers,
        data,
        connectTimeout: options.timeout || 15000,
        readTimeout: options.timeout || 15000,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        headers: response.headers,
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } catch (error) {
      console.error(`❌ Native HTTP PATCH failed: ${url}`, error);
      throw error;
    }
  } else {
    return fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }
};

// Export default object with all methods
export default {
  get: httpGet,
  post: httpPost,
  put: httpPut,
  delete: httpDelete,
  patch: httpPatch,
  isNativePlatform,
  platform,
};
