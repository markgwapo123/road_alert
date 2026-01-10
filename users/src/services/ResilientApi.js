/**
 * Resilient API Service for BantayDalan
 * 
 * Solves the "Route not found" and "Failed to load profile" errors by:
 * 1. Adding hard timeouts to ALL requests (max 8 seconds)
 * 2. Using Promise.allSettled() instead of Promise.all()
 * 3. Providing fallback data when requests fail
 * 4. Separating critical vs optional requests
 * 
 * This ensures the app NEVER hangs waiting for slow/failed requests.
 */

import api from './api.js';
import { localCache, CACHE_TTL } from './LocalCacheService.js';
import config from '../config/index.js';

// Hard timeout for ALL requests (Render free tier can be slow)
const REQUEST_TIMEOUT = 8000; // 8 seconds max
const CRITICAL_TIMEOUT = 10000; // 10 seconds for critical requests
const OPTIONAL_TIMEOUT = 5000; // 5 seconds for optional requests

/**
 * Wrap a promise with a timeout
 * CRITICAL: This prevents requests from hanging forever
 */
export const withTimeout = (promise, ms = REQUEST_TIMEOUT, fallback = null) => {
  let timeoutId;
  
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`⏱️ Request timed out after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });
  
  return Promise.race([
    promise.then(result => {
      clearTimeout(timeoutId);
      return result;
    }).catch(error => {
      clearTimeout(timeoutId);
      console.error('Request failed:', error.message);
      return fallback;
    }),
    timeoutPromise
  ]);
};

/**
 * Safe API request with timeout and fallback
 */
export const safeRequest = async (requestFn, options = {}) => {
  const {
    timeout = REQUEST_TIMEOUT,
    fallback = null,
    cacheKey = null,
    cacheTTL = CACHE_TTL.MEDIUM,
    critical = false,
  } = options;
  
  const effectiveTimeout = critical ? CRITICAL_TIMEOUT : timeout;
  
  // Try cache first
  if (cacheKey) {
    const cached = localCache.get(cacheKey, true); // Allow stale
    if (cached) {
      console.log(`📦 Using cached data: ${cacheKey}`);
      
      // If not stale, return immediately
      if (!cached.isStale) {
        return { data: cached.data, fromCache: true, success: true };
      }
      
      // If stale, try to refresh but don't block
      refreshInBackground(requestFn, cacheKey, cacheTTL);
      return { data: cached.data, fromCache: true, isStale: true, success: true };
    }
  }
  
  try {
    const result = await withTimeout(requestFn(), effectiveTimeout, fallback);
    
    if (result !== fallback && cacheKey) {
      localCache.set(cacheKey, result, cacheTTL);
    }
    
    return { 
      data: result, 
      fromCache: false, 
      success: result !== fallback 
    };
  } catch (error) {
    console.error('Safe request error:', error);
    return { data: fallback, fromCache: false, success: false, error };
  }
};

/**
 * Background refresh without blocking UI
 */
const refreshInBackground = async (requestFn, cacheKey, cacheTTL) => {
  try {
    const result = await withTimeout(requestFn(), OPTIONAL_TIMEOUT, null);
    if (result) {
      localCache.set(cacheKey, result, cacheTTL);
      console.log(`🔄 Background refresh complete: ${cacheKey}`);
    }
  } catch (error) {
    console.warn(`Background refresh failed: ${cacheKey}`);
  }
};

/**
 * Fetch multiple resources with graceful degradation
 * Uses Promise.allSettled to NEVER fail completely
 */
export const fetchMultiple = async (requests) => {
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const { name, requestFn, timeout = REQUEST_TIMEOUT, fallback = null, critical = false } = req;
      
      try {
        const result = await withTimeout(
          requestFn(), 
          critical ? CRITICAL_TIMEOUT : timeout, 
          fallback
        );
        return { name, data: result, success: result !== fallback };
      } catch (error) {
        console.error(`Request failed: ${name}`, error);
        return { name, data: fallback, success: false, error };
      }
    })
  );
  
  // Convert to object for easy access
  const resultMap = {};
  results.forEach((result, index) => {
    const name = requests[index].name;
    if (result.status === 'fulfilled') {
      resultMap[name] = result.value;
    } else {
      resultMap[name] = { 
        name, 
        data: requests[index].fallback || null, 
        success: false, 
        error: result.reason 
      };
    }
  });
  
  return resultMap;
};

// ============================================================
// PRE-BUILT RESILIENT FETCHERS FOR COMMON SCREENS
// ============================================================

/**
 * Fetch profile data with fallback
 * NEVER fails - always returns something usable
 */
export const fetchProfileResilient = async (token) => {
  const headers = { 'Authorization': `Bearer ${token}` };
  
  // Try cache first
  const cachedProfile = localCache.get('user_profile', true);
  const cachedStats = localCache.get('user_stats', true);
  
  // Fetch fresh data with timeout
  const results = await fetchMultiple([
    {
      name: 'profile',
      critical: true,
      timeout: CRITICAL_TIMEOUT,
      fallback: cachedProfile?.data || { success: false },
      requestFn: () => api.get('/users/me', { headers, timeout: CRITICAL_TIMEOUT })
        .then(r => r.data)
    },
    {
      name: 'stats',
      critical: false,
      timeout: OPTIONAL_TIMEOUT,
      fallback: cachedStats?.data || { 
        success: true, 
        data: { totalReports: 0, pendingReports: 0, verifiedReports: 0, resolvedReports: 0 } 
      },
      requestFn: () => api.get('/users/me/stats', { headers, timeout: OPTIONAL_TIMEOUT })
        .then(r => r.data)
        .catch(() => ({ success: true, data: { totalReports: 0 } }))
    }
  ]);
  
  // Cache successful results
  if (results.profile?.success && results.profile?.data?.success) {
    localCache.set('user_profile', results.profile.data, CACHE_TTL.PROFILE);
  }
  if (results.stats?.success) {
    localCache.set('user_stats', results.stats.data, CACHE_TTL.MEDIUM);
  }
  
  return {
    profile: results.profile?.data || cachedProfile?.data || { success: false },
    stats: results.stats?.data || cachedStats?.data || { success: true, data: {} },
    fromCache: !results.profile?.success && !!cachedProfile,
  };
};

/**
 * Fetch dashboard/feed data with fallback
 * NEVER fails - shows empty state if needed
 */
export const fetchDashboardResilient = async () => {
  const cachedReports = localCache.get('reports_feed', true);
  const cachedNews = localCache.get('news_feed', true);
  
  const results = await fetchMultiple([
    {
      name: 'reports',
      critical: true,
      timeout: CRITICAL_TIMEOUT,
      fallback: cachedReports?.data || { data: [], pagination: {} },
      requestFn: () => api.get('/reports/lightweight', {
        params: { status: 'verified,resolved', limit: 20, page: 1 },
        timeout: CRITICAL_TIMEOUT
      }).then(r => r.data)
    },
    {
      name: 'news',
      critical: false,
      timeout: OPTIONAL_TIMEOUT,
      fallback: cachedNews?.data || { posts: [] },
      requestFn: () => api.get('/news/public/posts', {
        params: { limit: 20 },
        timeout: OPTIONAL_TIMEOUT
      }).then(r => r.data).catch(() => ({ posts: [] }))
    }
  ]);
  
  // Cache successful results
  if (results.reports?.success) {
    localCache.set('reports_feed', results.reports.data, CACHE_TTL.REPORTS);
  }
  if (results.news?.success) {
    localCache.set('news_feed', results.news.data, CACHE_TTL.LONG);
  }
  
  return {
    reports: results.reports?.data || { data: [] },
    news: results.news?.data || { posts: [] },
    reportsSuccess: results.reports?.success,
    newsSuccess: results.news?.success,
  };
};

/**
 * Fetch notifications with fallback
 * Always returns empty array on failure
 */
export const fetchNotificationsResilient = async (token) => {
  const headers = { 'Authorization': `Bearer ${token}` };
  const cached = localCache.get('notifications', true);
  
  try {
    const result = await withTimeout(
      api.get('/notifications', { headers, timeout: OPTIONAL_TIMEOUT }).then(r => r.data),
      OPTIONAL_TIMEOUT,
      cached?.data || { notifications: [], unreadCount: 0 }
    );
    
    if (result && result !== cached?.data) {
      localCache.set('notifications', result, CACHE_TTL.SHORT);
    }
    
    return result;
  } catch (error) {
    console.warn('Notifications fetch failed, using fallback');
    return cached?.data || { notifications: [], unreadCount: 0 };
  }
};

export default {
  withTimeout,
  safeRequest,
  fetchMultiple,
  fetchProfileResilient,
  fetchDashboardResilient,
  fetchNotificationsResilient,
};
