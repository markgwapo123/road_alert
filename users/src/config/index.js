// API Configuration
const isCapacitor = window.Capacitor !== undefined;
const isWeb = !isCapacitor;

// For mobile app, use your computer's IP address
// For web, use localhost
const BASE_URL = isCapacitor 
  ? 'http://192.168.1.150:3001' 
  : 'http://localhost:3001';

const config = {
  API_BASE_URL: `${BASE_URL}/api`,
  BACKEND_URL: BASE_URL,
  ENVIRONMENT: 'development',
  IS_MOBILE: isCapacitor,
  IS_WEB: isWeb
};

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
