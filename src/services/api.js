import axios from 'axios'

// API base URL - update this to match your backend server
const API_BASE_URL = 'http://localhost:3001/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors (server down)
    if (!error.response && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK')) {
      console.warn('🚨 Admin API: Network error detected, server may be down');
      // Don't auto-logout here, let the useServerConnection hook handle it
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('🚨 Admin API: Unauthorized access, logging out');
      localStorage.removeItem('adminToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const reportsAPI = {
  // Get all reports
  getAllReports: (params = {}) => api.get('/reports', { params }),
  
  // Get report by ID
  getReportById: (id) => api.get(`/reports/${id}`),
    // Verify/Accept report
  verifyReport: (id) => api.patch(`/reports/${id}/status`, { status: 'verified' }),
  
  // Reject report
  rejectReport: (id) => api.patch(`/reports/${id}/status`, { status: 'rejected' }),
  
  // Update report status (generic)
  updateReportStatus: (id, status) => 
    api.patch(`/reports/${id}/status`, { status }),
  
  // Delete report
  deleteReport: (id) => api.delete(`/reports/${id}`),
  
  // Get reports statistics
  getReportsStats: () => api.get('/reports/stats'),
  
  // Get reports for map display
  getMapReports: (filters = {}) => 
    api.get('/reports/map', { params: filters }),
}

export const authAPI = {
  // Admin login
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Verify token
  verifyToken: () => api.get('/auth/verify'),
  
  // Logout
  logout: () => api.post('/auth/logout'),
}

export const mapAPI = {
  // Get reports for map display
  getMapReports: (filters = {}) => 
    api.get('/reports/map', { params: filters }),
}

export default api
