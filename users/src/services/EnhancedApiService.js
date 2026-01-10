/**
 * Enhanced API Service with Performance Optimizations
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Local caching with stale-while-revalidate
 * - Request deduplication
 * - Cold start handling for Render.com
 * - Timeout fallback with cached data
 */

import api, { checkBackendHealth, wakeUpBackend } from './api.js';
import { localCache, CACHE_TTL } from './LocalCacheService.js';
import config from '../config/index.js';

// Request deduplication map
const pendingRequests = new Map();

/**
 * Make an API request with retry logic and caching
 * @param {Object} options - Request options
 */
export const cachedRequest = async ({
  method = 'GET',
  endpoint,
  data = null,
  cacheKey = null,
  cacheTTL = CACHE_TTL.MEDIUM,
  useCache = true,
  allowStale = true,
  maxRetries = 3,
  retryDelay = 1000,
  timeout = 15000,
  onCacheHit = null,
}) => {
  // Generate cache key if not provided
  const effectiveCacheKey = cacheKey || `${method}_${endpoint}_${JSON.stringify(data || {})}`;
  
  // For GET requests, check cache first
  if (method === 'GET' && useCache) {
    const cached = localCache.get(effectiveCacheKey, allowStale);
    if (cached) {
      console.log(`📦 Cache ${cached.isStale ? 'STALE' : 'HIT'}: ${endpoint}`);
      
      // If we have fresh cache, return immediately
      if (!cached.isStale) {
        if (onCacheHit) onCacheHit(cached.data);
        return { data: cached.data, fromCache: true, isStale: false };
      }
      
      // If stale, return cached data but also refresh in background
      if (cached.isStale && allowStale) {
        if (onCacheHit) onCacheHit(cached.data);
        
        // Refresh in background (don't await)
        refreshInBackground(method, endpoint, data, effectiveCacheKey, cacheTTL);
        
        return { data: cached.data, fromCache: true, isStale: true };
      }
    }
  }
  
  // Check for duplicate in-flight requests
  if (pendingRequests.has(effectiveCacheKey)) {
    console.log(`🔄 Deduplicating request: ${endpoint}`);
    return pendingRequests.get(effectiveCacheKey);
  }
  
  // Make the request with retry logic
  const requestPromise = executeWithRetry(
    method, endpoint, data, maxRetries, retryDelay, timeout
  );
  
  // Store pending request for deduplication
  pendingRequests.set(effectiveCacheKey, requestPromise);
  
  try {
    const response = await requestPromise;
    
    // Cache successful GET responses
    if (method === 'GET' && useCache && response) {
      localCache.set(effectiveCacheKey, response, cacheTTL);
      console.log(`📦 Cache SET: ${endpoint} (TTL: ${cacheTTL}ms)`);
    }
    
    return { data: response, fromCache: false, isStale: false };
  } catch (error) {
    // On error, try to return stale cache
    if (method === 'GET' && allowStale) {
      const stale = localCache.get(effectiveCacheKey, true);
      if (stale) {
        console.log(`📦 Returning stale cache after error: ${endpoint}`);
        return { data: stale.data, fromCache: true, isStale: true, hadError: true };
      }
    }
    throw error;
  } finally {
    // Remove from pending requests
    pendingRequests.delete(effectiveCacheKey);
  }
};

/**
 * Background refresh for stale-while-revalidate pattern
 */
const refreshInBackground = async (method, endpoint, data, cacheKey, cacheTTL) => {
  try {
    const response = await executeWithRetry(method, endpoint, data, 1, 1000, 10000);
    if (response) {
      localCache.set(cacheKey, response, cacheTTL);
      console.log(`📦 Background refresh complete: ${endpoint}`);
    }
  } catch (error) {
    console.warn(`📦 Background refresh failed: ${endpoint}`, error.message);
  }
};

/**
 * Execute request with retry logic and exponential backoff
 */
const executeWithRetry = async (method, endpoint, data, maxRetries, retryDelay, timeout) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 API ${method} ${endpoint} (attempt ${attempt}/${maxRetries})`);
      
      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await api.get(endpoint, { timeout });
          break;
        case 'POST':
          response = await api.post(endpoint, data, { timeout });
          break;
        case 'PUT':
          response = await api.put(endpoint, data, { timeout });
          break;
        case 'DELETE':
          response = await api.delete(endpoint, { timeout });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      return response.data;
    } catch (error) {
      lastError = error;
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message?.includes('Network');
      
      console.warn(`⚠️ Request failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      // Don't retry client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Pre-warm cache with essential data on app launch
 */
export const prewarmCache = async () => {
  console.log('🔥 Pre-warming cache...');
  
  const endpoints = [
    { endpoint: '/reports/lightweight?status=verified&limit=10', key: 'reports_verified', ttl: CACHE_TTL.REPORTS },
    { endpoint: '/settings/public', key: 'settings_public', ttl: CACHE_TTL.SETTINGS },
  ];
  
  const results = await Promise.allSettled(
    endpoints.map(async ({ endpoint, key, ttl }) => {
      try {
        const response = await api.get(endpoint, { timeout: 10000 });
        localCache.set(key, response.data, ttl);
        return { endpoint, success: true };
      } catch (error) {
        return { endpoint, success: false, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  console.log(`🔥 Cache prewarm complete: ${successful}/${endpoints.length} endpoints`);
  
  return results;
};

/**
 * Get reports with caching
 */
export const getReportsCached = async (params = {}, options = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/reports/lightweight${queryString ? '?' + queryString : ''}`;
  const cacheKey = `reports_${queryString}`;
  
  return cachedRequest({
    method: 'GET',
    endpoint,
    cacheKey,
    cacheTTL: CACHE_TTL.REPORTS,
    ...options,
  });
};

/**
 * Get user profile with caching
 */
export const getUserProfileCached = async (options = {}) => {
  return cachedRequest({
    method: 'GET',
    endpoint: '/users/me',
    cacheKey: 'user_profile',
    cacheTTL: CACHE_TTL.PROFILE,
    ...options,
  });
};

/**
 * Get app settings with caching
 */
export const getSettingsCached = async (options = {}) => {
  return cachedRequest({
    method: 'GET',
    endpoint: '/settings/public',
    cacheKey: 'settings_public',
    cacheTTL: CACHE_TTL.SETTINGS,
    ...options,
  });
};

/**
 * Invalidate cache for a specific key pattern
 */
export const invalidateCache = (pattern) => {
  // Clear from local cache
  if (pattern) {
    console.log(`🗑️ Invalidating cache: ${pattern}`);
    localCache.delete(pattern);
  } else {
    localCache.clear();
  }
};

/**
 * Smart backend wake-up that only runs if needed
 */
let lastWakeUp = 0;
const WAKEUP_COOLDOWN = 30000; // 30 seconds

export const smartWakeUp = async () => {
  const now = Date.now();
  
  // Skip if we just woke up
  if (now - lastWakeUp < WAKEUP_COOLDOWN) {
    console.log('💓 Backend recently awake, skipping wake-up');
    return { ok: true, skipped: true };
  }
  
  const result = await wakeUpBackend();
  if (result.ok) {
    lastWakeUp = now;
  }
  
  return result;
};

export default {
  cachedRequest,
  prewarmCache,
  getReportsCached,
  getUserProfileCached,
  getSettingsCached,
  invalidateCache,
  smartWakeUp,
};
