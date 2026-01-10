/**
 * In-Memory Cache Service for API Response Caching
 * Optimized for Render.com free tier to reduce cold start impact
 * 
 * Features:
 * - TTL-based expiration
 * - LRU eviction when max size reached
 * - Automatic cleanup of expired entries
 * - Cache statistics for monitoring
 */

class CacheService {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;  // Max cache entries
    this.defaultTTL = options.defaultTTL || 60000;  // 1 minute default
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }
  
  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
    
    this.stats.sets++;
  }
  
  /**
   * Delete cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * Delete all entries matching a pattern
   * @param {string} pattern - Key pattern (prefix match)
   */
  deletePattern(pattern) {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
  
  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
      
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
    };
  }
  
  /**
   * Express middleware for caching GET requests
   * @param {number} ttl - Cache TTL in milliseconds
   * @param {Function} keyGenerator - Optional custom key generator
   */
  middleware(ttl = this.defaultTTL, keyGenerator = null) {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Generate cache key
      const key = keyGenerator 
        ? keyGenerator(req)
        : `${req.originalUrl}`;
      
      // Check cache
      const cached = this.get(key);
      if (cached) {
        console.log(`📦 Cache HIT: ${key}`);
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json to cache response
      res.json = (body) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(key, body, ttl);
          console.log(`📦 Cache SET: ${key} (TTL: ${ttl}ms)`);
        }
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };
      
      next();
    };
  }
  
  /**
   * Destroy the cache service
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Create singleton instance with sensible defaults
const cacheService = new CacheService({
  maxSize: 200,           // Max 200 cached entries
  defaultTTL: 60000,      // 1 minute default TTL
});

// Export cache instance and TTL constants
module.exports = {
  cache: cacheService,
  TTL: {
    SHORT: 30000,          // 30 seconds - for frequently changing data
    MEDIUM: 60000,         // 1 minute - for reports list
    LONG: 300000,          // 5 minutes - for stats, settings
    VERY_LONG: 600000,     // 10 minutes - for rarely changing data
  }
};
