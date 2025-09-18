// Centralized configuration for admin frontend
// Uses Vite environment variables when available with sensible fallbacks
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${BACKEND_URL}/api`;

// Lightweight logger (only in development)
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('🛠 Admin Config Loaded', { BACKEND_URL, API_BASE_URL, MODE: import.meta.env.MODE });
}

export default {
  BACKEND_URL,
  API_BASE_URL
};
