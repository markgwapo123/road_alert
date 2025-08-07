// Admin API Configuration
const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  ENVIRONMENT: import.meta.env.MODE || 'development'
};

console.log('🔧 Admin Configuration:', {
  API_BASE_URL: config.API_BASE_URL,
  BACKEND_URL: config.BACKEND_URL,
  ENVIRONMENT: config.ENVIRONMENT
});

export default config;
