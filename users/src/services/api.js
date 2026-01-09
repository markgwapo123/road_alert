/**
 * Centralized API Service for BantayDalan
 * Handles all HTTP requests with proper timeout, retry, and error handling
 * Optimized for APK/mobile environments with cold-start backend support
 * Uses Capacitor HTTP plugin to bypass CORS on mobile
 */
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import config from '../config/index.js';

// Backend cold start timeout (Render free tier can take 30-60 seconds)
// Mobile devices need longer timeouts due to variable network conditions
const COLD_START_TIMEOUT = 120000; // 120 seconds for cold starts
const AUTH_TIMEOUT = 90000; // 90 seconds for auth operations
const NORMAL_TIMEOUT = 30000; // 30 seconds for normal requests
const HEALTH_CHECK_TIMEOUT = 60000; // 60 seconds for health checks

// Check if running on native platform (Android/iOS)
const isNativePlatform = Capacitor.isNativePlatform();
console.log(`📱 Platform: ${Capacitor.getPlatform()}, isNative: ${isNativePlatform}`);

/**
 * Native HTTP request using Capacitor (bypasses CORS)
 * Enhanced with better timeout handling for mobile networks
 */
const nativeHttp = {
  async request(options) {
    const { method = 'GET', url, data, headers = {}, timeout = NORMAL_TIMEOUT } = options;
    
    // Build full URL
    const fullUrl = url.startsWith('http') ? url : `${config.API_BASE_URL}${url}`;
    
    // Use longer timeouts for auth endpoints
    const isAuthEndpoint = fullUrl.includes('/auth/');
    const effectiveTimeout = isAuthEndpoint ? Math.max(timeout, AUTH_TIMEOUT) : timeout;
    
    console.log(`📱 Native HTTP: ${method} ${fullUrl} (timeout: ${effectiveTimeout}ms)`);
    
    try {
      const response = await CapacitorHttp.request({
        url: fullUrl,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        data: data,
        connectTimeout: effectiveTimeout,
        readTimeout: effectiveTimeout,
        // Android-specific: disable response buffering for faster response
        responseType: 'json',
      });
      
      console.log(`✅ Native Response: ${fullUrl} - ${response.status}`);
      
      // Transform to axios-like response
      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
        config: options,
      };
    } catch (error) {
      console.error(`❌ Native HTTP Error: ${fullUrl}`, error);
      
      // Enhanced error handling for timeout
      const isTimeout = error.message?.toLowerCase().includes('timeout') || 
                       error.message?.toLowerCase().includes('timed out');
      
      throw {
        message: isTimeout 
          ? 'Server is taking too long to respond. Please try again.' 
          : (error.message || 'Network Error'),
        code: isTimeout ? 'ERR_TIMEOUT' : 'ERR_NETWORK',
        config: options,
        response: error.response,
        isTimeout,
      };
    }
  },
  
  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  },
  
  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  },
  
  put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  },
  
  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  },
  
  patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  },
};

/**
 * Create axios instance with default configuration (for web)
 */
const axiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: NORMAL_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds auth token and logging
 */
axiosInstance.interceptors.request.use(
  (requestConfig) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    console.log(`📤 API Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
    
    return requestConfig;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles errors and logging
 */
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // Enhanced error logging for debugging mobile connectivity
    const errorInfo = {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code,
      isCapacitor: isNativePlatform,
      platform: Capacitor.getPlatform(),
    };
    
    console.error('❌ API Error (Mobile Debug):', JSON.stringify(errorInfo, null, 2));
    
    // Transform error for better handling
    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timed out. The server may be starting up, please try again in 30 seconds.';
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.message?.includes('Network')) {
      // More detailed network error for mobile debugging
      console.error('🔴 Network Error Details:', {
        targetURL: `${config.BACKEND_URL}/api/health`,
        errorCode: error.code,
        errorMessage: error.message,
        suggestion: 'Check: 1) Internet connection, 2) Backend is running, 3) Android network permissions'
      });
      error.userMessage = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.response?.status === 401) {
      error.userMessage = 'Session expired. Please login again.';
      // Clear stored auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else if (error.response?.status >= 500) {
      error.userMessage = 'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

/**
 * Backend health check with retry support
 * Essential for APK apps to verify connectivity before auth requests
 * Uses native HTTP on mobile to bypass CORS
 * 
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @param {number} retryDelay - Delay between retries in ms (default: 2000)
 * @returns {Promise<{ok: boolean, message: string, latency?: number}>}
 */
export const checkBackendHealth = async (maxRetries = 2, retryDelay = 2000) => {
  const startTime = Date.now();
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🏥 Health check attempt ${attempt}/${maxRetries + 1}...`);
      
      let response;
      const healthUrl = `${config.BACKEND_URL}/api/health`;
      // Use longer timeout for health checks, especially first attempt (cold start)
      const timeout = attempt === 1 ? HEALTH_CHECK_TIMEOUT : NORMAL_TIMEOUT;
      
      if (isNativePlatform) {
        // Use Capacitor native HTTP (bypasses CORS)
        console.log(`📱 Using native HTTP for health check: ${healthUrl} (timeout: ${timeout}ms)`);
        response = await CapacitorHttp.get({
          url: healthUrl,
          headers: {
            'Accept': 'application/json',
          },
          connectTimeout: timeout,
          readTimeout: timeout,
        });
      } else {
        // Use axios for web
        response = await axios.get(healthUrl, {
          timeout: timeout,
          validateStatus: (status) => status < 500,
        });
      }
      
      const latency = Date.now() - startTime;
      
      if (response.status === 200) {
        console.log(`✅ Backend healthy (${latency}ms)`);
        return { ok: true, message: 'Backend is online', latency };
      } else {
        console.warn(`⚠️ Unexpected health status: ${response.status}`);
        return { ok: true, message: 'Backend responded', latency };
      }
    } catch (error) {
      lastError = error;
      const isTimeout = error.message?.toLowerCase().includes('timeout');
      console.warn(`⚠️ Health check attempt ${attempt} failed:`, error.message, isTimeout ? '(timeout)' : '');
      
      if (attempt <= maxRetries) {
        // Longer delay for cold start scenarios
        const delay = isTimeout ? retryDelay * 2 : retryDelay;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries exhausted
  const isTimeout = lastError?.message?.toLowerCase().includes('timeout');
  const errorMessage = isTimeout 
    ? 'Server is starting up. Please wait a moment and try again.'
    : 'Cannot connect to server. Please check your internet connection.';
    
  console.error('❌ Backend health check failed after all retries');
  return { ok: false, message: errorMessage, isTimeout };
};

/**
 * Wrapper for requests that might hit a cold backend
 * Automatically uses longer timeout for initial requests
 * 
 * @param {Function} requestFn - Async function that makes the API call
 * @returns {Promise<any>}
 */
export const withColdStartSupport = async (requestFn) => {
  // Check backend health first
  const health = await checkBackendHealth(1, 1000);
  
  if (!health.ok) {
    const error = new Error(health.message);
    error.isHealthCheckError = true;
    throw error;
  }
  
  // Proceed with the actual request
  return requestFn();
};

/**
 * API helper methods with built-in error handling
 */
export const apiHelpers = {
  /**
   * GET request with auth
   */
  get: async (endpoint, params = {}) => {
    const response = await api.get(endpoint, { params });
    return response.data;
  },
  
  /**
   * POST request with auth
   */
  post: async (endpoint, data = {}, config = {}) => {
    const response = await api.post(endpoint, data, config);
    return response.data;
  },
  
  /**
   * PUT request with auth
   */
  put: async (endpoint, data = {}) => {
    const response = await api.put(endpoint, data);
    return response.data;
  },
  
  /**
   * DELETE request with auth
   */
  delete: async (endpoint) => {
    const response = await api.delete(endpoint);
    return response.data;
  },
  
  /**
   * POST with FormData (for file uploads)
   */
  postFormData: async (endpoint, formData) => {
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: COLD_START_TIMEOUT, // File uploads need more time
    });
    return response.data;
  },
};

/**
 * Wake up the backend server (for Render cold starts)
 * Sends a lightweight request to wake the server before heavy operations
 */
export const wakeUpBackend = async () => {
  console.log('🔔 Waking up backend server...');
  const startTime = Date.now();
  
  try {
    const healthUrl = `${config.BACKEND_URL}/api/health`;
    
    if (isNativePlatform) {
      await CapacitorHttp.get({
        url: healthUrl,
        headers: { 'Accept': 'application/json' },
        connectTimeout: HEALTH_CHECK_TIMEOUT,
        readTimeout: HEALTH_CHECK_TIMEOUT,
      });
    } else {
      await axios.get(healthUrl, { timeout: HEALTH_CHECK_TIMEOUT });
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Backend awake (${elapsed}ms)`);
    return { ok: true, elapsed };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.warn(`⚠️ Wake-up call failed after ${elapsed}ms:`, error.message);
    return { ok: false, elapsed, error: error.message };
  }
};

/**
 * Auth-specific API calls with cold-start protection
 * Uses native HTTP on mobile to bypass CORS
 */
export const authApi = {
  /**
   * Login with email/password
   * Uses wake-up + health check + extended timeout for cold starts
   */
  login: async (email, password) => {
    console.log('🔐 Starting login process...');
    
    // Wake up backend first (handles Render cold starts)
    const wakeUp = await wakeUpBackend();
    if (!wakeUp.ok) {
      console.log('⏳ Backend may be cold, proceeding with extended timeout...');
    }
    
    // Health check to confirm backend is ready
    const health = await checkBackendHealth(3, 3000); // More retries with longer delay
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    console.log(`✅ Backend ready, attempting login... (latency: ${health.latency}ms)`);
    
    // Use native HTTP on mobile to bypass CORS
    if (isNativePlatform) {
      console.log('📱 Using native HTTP for login');
      const response = await nativeHttp.post('/auth/login', 
        { email, password },
        { timeout: AUTH_TIMEOUT }
      );
      return response.data;
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/login`, 
      { email, password },
      { timeout: AUTH_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Google login with token
   */
  googleLogin: async (idToken) => {
    console.log('🔐 Starting Google login process...');
    
    // Wake up backend first
    await wakeUpBackend();
    
    const health = await checkBackendHealth(3, 3000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    // Use native HTTP on mobile to bypass CORS
    if (isNativePlatform) {
      console.log('📱 Using native HTTP for Google login');
      const response = await nativeHttp.post('/auth/google-login',
        { idToken },
        { timeout: AUTH_TIMEOUT }
      );
      return response.data;
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/google-login`,
      { idToken },
      { timeout: AUTH_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Register new user
   */
  register: async (userData) => {
    console.log('🔐 Starting registration process...');
    
    // Wake up backend first
    await wakeUpBackend();
    
    const health = await checkBackendHealth(3, 3000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    // Use native HTTP on mobile to bypass CORS
    if (isNativePlatform) {
      console.log('📱 Using native HTTP for register');
      const response = await nativeHttp.post('/auth/register',
        userData,
        { timeout: AUTH_TIMEOUT }
      );
      return response.data;
    }
    
    const response = await api.post('/auth/register',
      userData,
      { timeout: AUTH_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Forgot password
   */
  forgotPassword: async (email) => {
    // Wake up backend first
    await wakeUpBackend();
    
    const health = await checkBackendHealth(2, 3000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    // Use native HTTP on mobile to bypass CORS
    if (isNativePlatform) {
      console.log('📱 Using native HTTP for forgot password');
      const response = await nativeHttp.post('/auth/forgot-password',
        { email },
        { timeout: AUTH_TIMEOUT }
      );
      return response.data;
    }
    
    const response = await api.post('/auth/forgot-password',
      { email },
      { timeout: AUTH_TIMEOUT }
    );
    return response.data;
  },
};

// Export the appropriate HTTP client (native for mobile, axios for web)
// This is the main API instance that should be used throughout the app
const api = isNativePlatform ? nativeHttp : axiosInstance;

// Add auth token to native HTTP requests
if (isNativePlatform) {
  const originalRequest = nativeHttp.request.bind(nativeHttp);
  nativeHttp.request = async (options) => {
    const token = localStorage.getItem('token');
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return originalRequest(options);
  };
}

export default api;
