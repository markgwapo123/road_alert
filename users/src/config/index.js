// API Configuration - Updated for production
const isCapacitor = window.Capacitor !== undefined;
const isWeb = !isCapacitor;

// Production and development URLs
const PRODUCTION_API_URL = import.meta.env.VITE_API_URL || 'https://roadalert-backend-xze4.onrender.com'; // Your actual Render URL
const DEVELOPMENT_API_URL = isCapacitor 
  ? 'http://192.168.1.150:3001' 
  : 'http://localhost:3001';

// Use production URL in production, development URL otherwise
// If VITE_API_URL is set, always use it (for development with production backend)
// TEMPORARY: Use local backend for testing Base64 images
const BASE_URL = DEVELOPMENT_API_URL;

const config = {
  API_BASE_URL: `${BASE_URL}/api`,
  BACKEND_URL: BASE_URL,
  ENVIRONMENT: 'development',
  IS_MOBILE: isCapacitor,
  IS_WEB: isWeb
};

// Debug logging for profile image issues
console.log('🔧 Config Debug Info:', {
  BASE_URL,
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  IS_MOBILE: config.IS_MOBILE,
  IS_WEB: config.IS_WEB,
  ENVIRONMENT: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

// Log configuration for debugging
console.log('🔧 App Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  ENVIRONMENT: config.ENVIRONMENT,
  IS_MOBILE: config.IS_MOBILE,
  IS_WEB: config.IS_WEB,
  NODE_ENV: import.meta.env.NODE_ENV,
  PROD: import.meta.env.PROD
});

export default config;
