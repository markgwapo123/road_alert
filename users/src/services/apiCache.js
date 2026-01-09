/**
 * API Cache Service for BantayDalan
 * Provides client-side caching to reduce API calls and improve performance
 * 
 * Features:
 * - Memory cache with TTL (Time To Live)
 * - LocalStorage persistence for critical data
 * - Request deduplication (prevents multiple simultaneous requests)
 * - Stale-while-revalidate pattern
 * - Cache invalidation
 */

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  REPORTS: 2 * 60 * 1000,      // 2 minutes for reports (changes frequently)
  MY_REPORTS: 3 * 60 * 1000,   // 3 minutes for user's reports
  PROFILE: 10 * 60 * 1000,     // 10 minutes for profile (rarely changes)
  STATS: 5 * 60 * 1000,        // 5 minutes for stats
  NOTIFICATIONS: 1 * 60 * 1000, // 1 minute for notifications
  SETTINGS: 30 * 60 * 1000,    // 30 minutes for app settings
  NEWS: 5 * 60 * 1000,         // 5 minutes for news
};

// In-memory cache store
const memoryCache = new Map();

// Pending requests (for deduplication)
const pendingRequests = new Map();

/**
 * Generate a cache key from request parameters
 */
const generateCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}${sortedParams ? '?' + sortedParams : ''}`;
};

/**
 * Get item from memory cache
 */
const getFromMemory = (key) => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached;
};

/**
 * Set item in memory cache
 */
const setInMemory = (key, data, ttl) => {
  memoryCache.set(key, {
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
  });
};

/**
 * Get item from localStorage
 */
const getFromStorage = (key) => {
  try {
    const stored = localStorage.getItem(`cache_${key}`);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    
    return parsed;
  } catch (e) {
    console.warn('Cache storage read error:', e);
    return null;
  }
};

/**
 * Set item in localStorage (for persistence across sessions)
 */
const setInStorage = (key, data, ttl) => {
  try {
    const item = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(item));
  } catch (e) {
    console.warn('Cache storage write error:', e);
    // If storage is full, clear old cache items
    clearOldCacheItems();
  }
};

/**
 * Clear old cache items from localStorage
 */
const clearOldCacheItems = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (Date.now() > item.expiresAt) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Cache cleanup error:', e);
  }
};

/**
 * API Cache Service
 */
const apiCache = {
  /**
   * Get cached data or fetch from API
   * @param {string} cacheKey - Unique cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {Object} options - Cache options
   */
  async getOrFetch(cacheKey, fetchFn, options = {}) {
    const {
      ttl = CACHE_TTL.REPORTS,
      persist = false,
      staleWhileRevalidate = true,
      forceRefresh = false,
    } = options;

    // Check memory cache first
    if (!forceRefresh) {
      const memoryCached = getFromMemory(cacheKey);
      if (memoryCached) {
        console.log(`📦 Cache HIT (memory): ${cacheKey}`);
        return memoryCached.data;
      }

      // Check localStorage if persistence is enabled
      if (persist) {
        const storageCached = getFromStorage(cacheKey);
        if (storageCached) {
          console.log(`📦 Cache HIT (storage): ${cacheKey}`);
          // Also set in memory for faster access
          setInMemory(cacheKey, storageCached.data, ttl);
          
          // If stale-while-revalidate, return stale data and refresh in background
          if (staleWhileRevalidate && Date.now() > storageCached.createdAt + (ttl / 2)) {
            console.log(`🔄 Revalidating in background: ${cacheKey}`);
            this.revalidateInBackground(cacheKey, fetchFn, { ttl, persist });
          }
          
          return storageCached.data;
        }
      }
    }

    // Check for pending request (deduplication)
    if (pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: ${cacheKey}`);
      return pendingRequests.get(cacheKey);
    }

    // Fetch fresh data
    console.log(`🌐 Cache MISS, fetching: ${cacheKey}`);
    const fetchPromise = fetchFn()
      .then(data => {
        // Store in cache
        setInMemory(cacheKey, data, ttl);
        if (persist) {
          setInStorage(cacheKey, data, ttl);
        }
        pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        pendingRequests.delete(cacheKey);
        throw error;
      });

    pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  /**
   * Revalidate cache in background
   */
  async revalidateInBackground(cacheKey, fetchFn, options) {
    try {
      const data = await fetchFn();
      setInMemory(cacheKey, data, options.ttl);
      if (options.persist) {
        setInStorage(cacheKey, data, options.ttl);
      }
      console.log(`✅ Background revalidation complete: ${cacheKey}`);
    } catch (error) {
      console.warn(`⚠️ Background revalidation failed: ${cacheKey}`, error);
    }
  },

  /**
   * Invalidate specific cache key
   */
  invalidate(cacheKey) {
    memoryCache.delete(cacheKey);
    localStorage.removeItem(`cache_${cacheKey}`);
    console.log(`🗑️ Cache invalidated: ${cacheKey}`);
  },

  /**
   * Invalidate cache by prefix
   */
  invalidateByPrefix(prefix) {
    // Clear memory cache
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`cache_${prefix}`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`🗑️ Cache invalidated by prefix: ${prefix}`);
  },

  /**
   * Clear all cache
   */
  clearAll() {
    memoryCache.clear();
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`🗑️ All cache cleared`);
  },

  /**
   * Get cache stats
   */
  getStats() {
    let storageCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith('cache_')) {
        storageCount++;
      }
    }
    
    return {
      memoryEntries: memoryCache.size,
      storageEntries: storageCount,
      pendingRequests: pendingRequests.size,
    };
  },
};

// Preload critical data on app start
export const preloadCriticalData = async (fetchFunctions) => {
  console.log('🚀 Preloading critical data...');
  const promises = [];
  
  if (fetchFunctions.profile) {
    promises.push(
      apiCache.getOrFetch('profile', fetchFunctions.profile, {
        ttl: CACHE_TTL.PROFILE,
        persist: true,
      }).catch(e => console.warn('Profile preload failed:', e))
    );
  }
  
  if (fetchFunctions.settings) {
    promises.push(
      apiCache.getOrFetch('settings', fetchFunctions.settings, {
        ttl: CACHE_TTL.SETTINGS,
        persist: true,
      }).catch(e => console.warn('Settings preload failed:', e))
    );
  }
  
  await Promise.allSettled(promises);
  console.log('✅ Critical data preloaded');
};

export { CACHE_TTL, generateCacheKey };
export default apiCache;
