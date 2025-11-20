// API Configuration
const isCapacitor = window.Capacitor !== undefined;
const isWeb = !isCapacitor;

const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://road-alert-backends.onrender.com/api',
  GOOGLE_CLIENT_ID: '1272896031-jn5nlf6b7dc3b0qk0als90mfy2sfhm5d.apps.googleusercontent.com',
  IS_MOBILE: isCapacitor,
  IS_WEB: isWeb,
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV
};

// Log configuration for debugging
console.log('🔧 App Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  IS_MOBILE: config.IS_MOBILE,
  IS_WEB: config.IS_WEB,
  IS_PRODUCTION: config.IS_PRODUCTION,
  IS_DEVELOPMENT: config.IS_DEVELOPMENT
});

export default config;
