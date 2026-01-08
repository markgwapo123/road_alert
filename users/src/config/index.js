// API Configuration - Production only
// This ensures APK builds always use the deployed backend
const PRODUCTION_API_URL = 'https://roadalert-backend-xze4.onrender.com';

// Always use production backend (required for APK)
const BASE_URL = PRODUCTION_API_URL;

const config = {
  API_BASE_URL: `${BASE_URL}/api`,
  BACKEND_URL: BASE_URL,
  HEALTH_URL: `${BASE_URL}/api/health`,
  ENVIRONMENT: 'production',
  
  // Timeout settings for Render.com free tier (cold starts)
  TIMEOUTS: {
    COLD_START: 60000,  // 60 seconds for sleeping backend
    NORMAL: 15000,      // 15 seconds for normal requests
    UPLOAD: 120000,     // 2 minutes for file uploads
  },
  
  // Retry settings
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 2000,
  }
};

// Debug logging (helps diagnose APK issues)
console.log('🔧 App Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  ENVIRONMENT: config.ENVIRONMENT
});

export default config;
