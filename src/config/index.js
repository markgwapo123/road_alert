// Centralized configuration for admin frontend
const BACKEND_URL = 'http://localhost:3001';
const API_BASE_URL = 'http://localhost:3001/api';

// Lightweight logger (only in development)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('🛠 Admin Config Loaded', { BACKEND_URL, API_BASE_URL, MODE: import.meta.env.MODE });
}

export default {
  BACKEND_URL,
  API_BASE_URL
};
