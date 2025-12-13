// API Configuration - Updated for production
const isCapacitor = window.Capacitor !== undefined;
const isWeb = !isCapacitor;

// Production and development URLs
const PRODUCTION_API_URL = import.meta.env.VITE_API_URL || 'https://roadalert-backend-xze4.onrender.com'; // Your actual Render URL
const DEVELOPMENT_API_URL = 'http://localhost:3001'; // Only for web development

// IMPORTANT: Use production backend for mobile app
// Mobile apps cannot access localhost, they need the real server
const BASE_URL = isCapacitor ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;

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
