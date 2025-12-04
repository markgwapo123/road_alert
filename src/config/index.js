// Centralized configuration for admin frontend
// Use production backend URL to access images uploaded from mobile devices
const BACKEND_URL = 'https://roadalert-backend-xze4.onrender.com';
const API_BASE_URL = 'https://roadalert-backend-xze4.onrender.com/api';

// Lightweight logger (only in development)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('🛠 Admin Config Loaded', { BACKEND_URL, API_BASE_URL, MODE: import.meta.env.MODE });
}

export default {
  BACKEND_URL,
  API_BASE_URL
};
