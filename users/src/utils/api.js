import axios from 'axios';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// PRODUCTION ONLY - Always use production backend
const API_BASE_URL = 'https://roadalert-backend-xze4.onrender.com/api';
const BACKEND_URL = 'https://roadalert-backend-xze4.onrender.com';
const isNativePlatform = Capacitor.isNativePlatform();

console.log('🔗 API Configuration:', {
  API_BASE_URL,
  BACKEND_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
  isNativePlatform,
  environment: import.meta.env.MODE
});

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.withCredentials = true;

// Native HTTP helper for mobile
const nativePost = async (url, data, headers = {}) => {
  console.log(`📱 Native HTTP POST: ${url}`);
  const response = await CapacitorHttp.post({
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    data,
    connectTimeout: 15000,
    readTimeout: 15000,
  });
  return { data: response.data, status: response.status, headers: response.headers };
};

const nativeGet = async (url, headers = {}) => {
  console.log(`📱 Native HTTP GET: ${url}`);
  const response = await CapacitorHttp.get({
    url,
    headers,
    connectTimeout: 15000,
    readTimeout: 15000,
  });
  return { data: response.data, status: response.status, headers: response.headers };
};

// Test backend connection
export const testConnection = async () => {
  try {
    if (isNativePlatform) {
      const response = await nativeGet(`${API_BASE_URL}/health`);
      return { success: true, data: response.data };
    }
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.code === 'ECONNREFUSED' 
        ? 'Backend server is not responding' 
        : error.message 
    };
  }
};

// API endpoints with native HTTP support
export const authAPI = {
  login: async (credentials) => {
    if (isNativePlatform) {
      return nativePost(`${API_BASE_URL}/auth/login`, credentials);
    }
    return axios.post(`${API_BASE_URL}/auth/login`, credentials);
  },
  register: async (userData) => {
    if (isNativePlatform) {
      return nativePost(`${API_BASE_URL}/auth/register`, userData);
    }
    return axios.post(`${API_BASE_URL}/auth/register`, userData);
  },
};

export const userAPI = {
  getProfile: async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (isNativePlatform) {
      return nativeGet(`${API_BASE_URL}/users/me`, headers);
    }
    return axios.get(`${API_BASE_URL}/users/me`, { headers });
  },
};

export const reportsAPI = {
  getMyReports: async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (isNativePlatform) {
      return nativeGet(`${API_BASE_URL}/reports/my-reports`, headers);
    }
    return axios.get(`${API_BASE_URL}/reports/my-reports`, { headers });
  },
  getVerified: async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (isNativePlatform) {
      return nativeGet(`${API_BASE_URL}/reports/verified`, headers);
    }
    return axios.get(`${API_BASE_URL}/reports/verified`, { headers });
  },
  create: async (reportData, token) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (isNativePlatform) {
      return nativePost(`${API_BASE_URL}/reports`, reportData, headers);
    }
    return axios.post(`${API_BASE_URL}/reports`, reportData, { headers });
  },
};

export default {
  testConnection,
  auth: authAPI,
  user: userAPI,
  reports: reportsAPI,
};
