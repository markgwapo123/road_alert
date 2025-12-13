// API Configuration - Production only
const PRODUCTION_API_URL = 'https://roadalert-backend-xze4.onrender.com';

// Always use production backend
const BASE_URL = PRODUCTION_API_URL;

const config = {
  API_BASE_URL: `${BASE_URL}/api`,
  BACKEND_URL: BASE_URL,
  ENVIRONMENT: 'production'
};

// Debug logging
console.log('🔧 App Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  ENVIRONMENT: config.ENVIRONMENT
});

export default config;
