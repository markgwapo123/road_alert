/**
 * ⚡ In-Memory Cache Service
 * 
 * Zero-dependency, in-process cache with TTL support.
 * Used to cache frequently-requested data (profile, reports, notifications)
 * so repeat requests return instantly without hitting MongoDB.
 * 
 * No Redis required – works everywhere (Render, Vercel, local).
 */

class MemoryCache {
  constructor() {
    this.cache = new Map();
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    console.log('⚡ In-memory cache initialized');
  }

  /**
   * Get a cached value. Returns null if missing or expired.
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Set a value with TTL (in seconds). Default 30s.
   */
  set(key, value, ttlSeconds = 30) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Delete a specific cache key.
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Delete all keys that start with a given prefix.
   * Useful for invalidating all data for a specific user.
   * Example: invalidatePrefix('user:abc123') clears profile, reports, notifs for that user.
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  flush() {
    this.cache.clear();
  }

  /**
   * Remove all expired entries.
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache stats for monitoring.
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance – shared across all routes
module.exports = new MemoryCache();
