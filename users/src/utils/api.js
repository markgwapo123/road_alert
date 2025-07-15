import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Test backend connection
export const testConnection = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.code === 'ECONNREFUSED' 
        ? 'Backend server is not running on port 3001' 
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
  getProfile: (token) => axios.get(`${API_BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  verify: (formData, token) => axios.post(`${API_BASE_URL}/users/verify`, formData, {
    headers: { Authorization: `Bearer ${token}` }
  }),
};

export const reportsAPI = {
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
