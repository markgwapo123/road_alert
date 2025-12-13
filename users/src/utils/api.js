import axios from 'axios';

// IMPORTANT: Use production backend for deployed app
// Localhost only works for local development on your PC
const isCapacitor = window.Capacitor !== undefined;
const PRODUCTION_API_URL = 'https://roadalert-backend-xze4.onrender.com/api';
const PRODUCTION_BACKEND_URL = 'https://roadalert-backend-xze4.onrender.com';
const DEVELOPMENT_API_URL = 'http://localhost:3001/api';
const DEVELOPMENT_BACKEND_URL = 'http://localhost:3001';

// Use production URLs for mobile or when VITE env vars are not set to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isCapacitor || typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? PRODUCTION_API_URL 
    : DEVELOPMENT_API_URL);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (isCapacitor || typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? PRODUCTION_BACKEND_URL 
    : DEVELOPMENT_BACKEND_URL);

console.log('🔗 API Configuration:', {
  API_BASE_URL,
  BACKEND_URL,
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
  isCapacitor,
  environment: import.meta.env.MODE
});

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.withCredentials = true;

// Test backend connection
export const testConnection = async () => {
  try {
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

// API endpoints
export const authAPI = {
  login: (credentials) => axios.post(`${API_BASE_URL}/auth/login`, credentials),
  register: (userData) => axios.post(`${API_BASE_URL}/auth/register`, userData),
};

export const userAPI = {
  getProfile: (token) => axios.get(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
};

export const reportsAPI = {
  getMyReports: (token) => axios.get(`${API_BASE_URL}/reports/my-reports`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  getVerified: (token) => axios.get(`${API_BASE_URL}/reports/verified`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  create: (reportData, token) => axios.post(`${API_BASE_URL}/reports`, reportData, {
    headers: { Authorization: `Bearer ${token}` }
  }),
};

export default {
  testConnection,
  auth: authAPI,
  user: userAPI,
  reports: reportsAPI,
};
