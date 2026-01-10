/**
 * Local Storage Cache Service for Frontend
 * Provides fast cached data while waiting for network responses
 * 
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup
 * - Size limits to prevent storage overflow
 * - Stale-while-revalidate pattern support
 */

const CACHE_PREFIX = 'bd_cache_';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

class LocalCacheService {
  constructor() {
    this.memoryCache = new Map(); // Fast in-memory fallback
    this.isStorageAvailable = this.checkStorageAvailable();
    
    // Cleanup on initialization
    if (this.isStorageAvailable) {
      this.cleanup();
    }
  }
  
  /**
   * Check if localStorage is available
   */
  checkStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available, using memory cache');
      return false;
    }
  }
  
  /**
   * Generate cache key with prefix
   */
  getKey(key) {
    return `${CACHE_PREFIX}${key}`;
  }
  
  /**
   * Get cached value
   * @param {string} key - Cache key
   * @param {boolean} allowStale - Return stale data if available
   * @returns {any|null} - Cached value or null
   */
  get(key, allowStale = false) {
    const prefixedKey = this.getKey(key);
    
    // Try memory cache first (fastest)
    const memCached = this.memoryCache.get(prefixedKey);
    if (memCached) {
      if (Date.now() < memCached.expiresAt) {
        return { data: memCached.value, isStale: false, fromMemory: true };
      } else if (allowStale) {
        return { data: memCached.value, isStale: true, fromMemory: true };
      }
    }
    
    // Try localStorage
    if (this.isStorageAvailable) {
      try {
        const stored = localStorage.getItem(prefixedKey);
        if (stored) {
          const entry = JSON.parse(stored);
          const isExpired = Date.now() > entry.expiresAt;
          
          if (!isExpired) {
            // Update memory cache
            this.memoryCache.set(prefixedKey, entry);
            return { data: entry.value, isStale: false, fromMemory: false };
          } else if (allowStale) {
            return { data: entry.value, isStale: true, fromMemory: false };
          } else {
            // Remove expired entry
            localStorage.removeItem(prefixedKey);
          }
        }
      } catch (e) {
        console.warn('Cache read error:', e);
      }
    }
    
    return null;
  }
  
  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = 60000) {
    const prefixedKey = this.getKey(key);
    const entry = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    };
    
    // Always update memory cache
    this.memoryCache.set(prefixedKey, entry);
    
    // Try to save to localStorage
    if (this.isStorageAvailable) {
      try {
        const serialized = JSON.stringify(entry);
        
        // Check size before saving
        if (serialized.length > MAX_CACHE_SIZE / 10) {
          console.warn('Cache entry too large, skipping localStorage');
          return;
        }
        
        localStorage.setItem(prefixedKey, serialized);
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('Storage quota exceeded, clearing old cache');
          this.clearOldEntries();
          try {
            localStorage.setItem(prefixedKey, JSON.stringify(entry));
          } catch (e2) {
            console.error('Still cannot save to cache:', e2);
          }
        }
      }
    }
  }
  
  /**
   * Delete cached value
   */
  delete(key) {
    const prefixedKey = this.getKey(key);
    this.memoryCache.delete(prefixedKey);
    
    if (this.isStorageAvailable) {
      localStorage.removeItem(prefixedKey);
    }
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    this.memoryCache.clear();
    
    if (this.isStorageAvailable) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
  
  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clean localStorage
    if (this.isStorageAvailable) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key));
            if (now > entry.expiresAt) {
              keysToRemove.push(key);
            }
          } catch (e) {
            keysToRemove.push(key); // Remove corrupted entries
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
  
  /**
   * Clear oldest entries when storage is full
   */
  clearOldEntries() {
    if (!this.isStorageAvailable) return;
    
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          entries.push({ key, createdAt: entry.createdAt });
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by creation time and remove oldest 25%
    entries.sort((a, b) => a.createdAt - b.createdAt);
    const toRemove = Math.ceil(entries.length * 0.25);
    entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key));
  }
}

// Export singleton
export const localCache = new LocalCacheService();

// TTL Constants
export const CACHE_TTL = {
  SHORT: 30 * 1000,        // 30 seconds
  MEDIUM: 60 * 1000,       // 1 minute
  LONG: 5 * 60 * 1000,     // 5 minutes
  VERY_LONG: 30 * 60 * 1000, // 30 minutes
  PROFILE: 10 * 60 * 1000,  // 10 minutes for user profile
  REPORTS: 60 * 1000,      // 1 minute for reports list
  SETTINGS: 5 * 60 * 1000, // 5 minutes for app settings
};

export default localCache;
