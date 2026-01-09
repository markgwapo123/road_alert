/**
 * Centralized API Service for BantayDalan
 * Handles all HTTP requests with proper timeout, retry, and error handling
 * Optimized for APK/mobile environments with cold-start backend support
 */
import axios from 'axios';
import config from '../config/index.js';

// Backend cold start timeout (Render free tier can take 30-60 seconds)
const COLD_START_TIMEOUT = 60000; // 60 seconds
const NORMAL_TIMEOUT = 15000; // 15 seconds for normal requests

/**
 * Create axios instance with default configuration
 */
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: NORMAL_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds auth token and logging
 */
api.interceptors.request.use(
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
api.interceptors.response.use(
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
      isCapacitor: typeof window !== 'undefined' && window.Capacitor !== undefined,
      platform: typeof window !== 'undefined' && window.Capacitor?.getPlatform?.() || 'web',
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
      
      const response = await axios.get(`${config.BACKEND_URL}/api/health`, {
        timeout: attempt === 1 ? COLD_START_TIMEOUT : NORMAL_TIMEOUT, // First attempt allows for cold start
        validateStatus: (status) => status < 500, // Accept any non-server-error response
      });
      
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
      console.warn(`⚠️ Health check attempt ${attempt} failed:`, error.message);
      
      if (attempt <= maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // All retries exhausted
  const errorMessage = lastError?.code === 'ECONNABORTED' 
    ? 'Server is starting up. Please wait and try again.'
    : 'Cannot connect to server. Please check your internet connection.';
    
  console.error('❌ Backend health check failed after all retries');
  return { ok: false, message: errorMessage };
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
 * Auth-specific API calls with cold-start protection
 */
export const authApi = {
  /**
   * Login with email/password
   * Uses health check + extended timeout for cold starts
   */
  login: async (email, password) => {
    // Health check first
    const health = await checkBackendHealth(2, 2000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/login`, 
      { email, password },
      { timeout: COLD_START_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Google login with token
   */
  googleLogin: async (idToken) => {
    const health = await checkBackendHealth(2, 2000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/google-login`,
      { idToken },
      { timeout: COLD_START_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Register new user
   */
  register: async (userData) => {
    const health = await checkBackendHealth(2, 2000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/register`,
      userData,
      { timeout: COLD_START_TIMEOUT }
    );
    return response.data;
  },
  
  /**
   * Forgot password
   */
  forgotPassword: async (email) => {
    const health = await checkBackendHealth(1, 2000);
    if (!health.ok) {
      throw new Error(health.message);
    }
    
    const response = await axios.post(`${config.API_BASE_URL}/auth/forgot-password`,
      { email },
      { timeout: COLD_START_TIMEOUT }
    );
    return response.data;
  },
};

// Export default axios instance for advanced usage
export default api;
