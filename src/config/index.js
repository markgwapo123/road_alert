// Centralized configuration for admin frontend
// Use local backend for development, production backend for builds
const BACKEND_URL = import.meta.env.DEV 
  ? 'http://localhost:3010'
  : 'https://roadalert-backend-xze4.onrender.com';

const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:3010/api'
  : 'https://roadalert-backend-xze4.onrender.com/api';

// Lightweight logger (only in development)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('🛠 Admin Config Loaded', { BACKEND_URL, API_BASE_URL, MODE: import.meta.env.MODE });
}

export default {
  BACKEND_URL,
  API_BASE_URL
};
