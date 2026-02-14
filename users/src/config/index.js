// API Configuration
const PRODUCTION_API_URL = 'https://roadalert-backend-xze4.onrender.com';
const LOCAL_API_URL = 'http://localhost:3010';

// Use local backend in development, production in builds
const BASE_URL = import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL;

const config = {
  API_BASE_URL: `${BASE_URL}/api`,
  BACKEND_URL: BASE_URL,
  ENVIRONMENT: import.meta.env.DEV ? 'development' : 'production'
};

// Debug logging
console.log('🔧 App Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  ENVIRONMENT: config.ENVIRONMENT,
  MODE: import.meta.env.MODE
});

export default config;
