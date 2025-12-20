import axios from 'axios'
import config from '../config/index.js'

// Use centralized config (supports env overrides)
const API_BASE_URL = config.API_BASE_URL

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
    
    // Add debugging for PATCH requests
    if (config.method === 'patch' && config.url.includes('/status')) {
      console.log('🚀 PATCH request intercepted:', {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers
      })
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
    if (error.response?.status === 401) {
      // Handle unauthorized access
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
  verifyReport: (id) => {
    console.log('🔧 verifyReport called with ID:', id)
    const requestData = { status: 'verified' }
    console.log('🔧 Request data:', requestData)
    console.log('🔧 API URL:', `${API_BASE_URL}/reports/${id}/status`)
    return api.patch(`/reports/${id}/status`, requestData)
  },
  
  // Reject report
  rejectReport: (id) => {
    console.log('🔧 rejectReport called with ID:', id)
    const requestData = { status: 'rejected' }
    console.log('🔧 Request data:', requestData)
    console.log('🔧 API URL:', `${API_BASE_URL}/reports/${id}/status`)
    return api.patch(`/reports/${id}/status`, requestData)
  },
  
  // Update report status (generic)
  updateReportStatus: (id, status) => 
    api.patch(`/reports/${id}/status`, { status }),
  
  // Update report details
  updateReport: (id, data) => {
    console.log('📝 updateReport called with ID:', id, 'Data:', data)
    return api.put(`/reports/${id}`, data)
  },
  
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
