/**
 * Keep-Alive Service for Render.com Cold Start Prevention
 * 
 * Prevents the free tier backend from sleeping by:
 * 1. Self-pinging at regular intervals
 * 2. Warming up database connections
 * 3. Pre-loading frequently accessed data into cache
 * 
 * This reduces cold start delays from 30-60s to <2s
 */

const axios = require('axios');
const { cache, TTL } = require('./CacheService');

class KeepAliveService {
  constructor() {
    this.isRunning = false;
    this.pingInterval = null;
    this.warmupInterval = null;
    this.stats = {
      pings: 0,
      failures: 0,
      lastPing: null,
      avgLatency: 0,
      latencies: [],
    };
    
    // Configuration
    this.config = {
      selfPingIntervalMs: 4 * 60 * 1000,  // 4 minutes (Render sleeps after 15 min)
      warmupIntervalMs: 5 * 60 * 1000,     // 5 minutes
      maxLatencyHistory: 20,
    };
  }
  
  /**
   * Start the keep-alive service
   * @param {string} baseUrl - The server's base URL
   */
  start(baseUrl) {
    if (this.isRunning) {
      console.log('⚠️ Keep-alive service already running');
      return;
    }
    
    this.baseUrl = baseUrl || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
    this.isRunning = true;
    
    console.log(`🔄 Keep-alive service started for: ${this.baseUrl}`);
    
    // Initial ping after 30 seconds (let server fully start)
    setTimeout(() => {
      this.ping();
    }, 30000);
    
    // Regular self-ping
    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.config.selfPingIntervalMs);
    
    // Regular warmup (pre-cache popular data)
    this.warmupInterval = setInterval(() => {
      this.warmupCache();
    }, this.config.warmupIntervalMs);
  }
  
  /**
   * Self-ping to keep server alive
   */
  async ping() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 10000,
        headers: { 'X-Keep-Alive': 'true' }
      });
      
      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      this.stats.pings++;
      this.stats.lastPing = new Date().toISOString();
      
      console.log(`💓 Keep-alive ping: ${latency}ms (total: ${this.stats.pings})`);
      
      return { success: true, latency };
    } catch (error) {
      this.stats.failures++;
      console.error(`❌ Keep-alive ping failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Record latency for statistics
   */
  recordLatency(latency) {
    this.stats.latencies.push(latency);
    
    // Keep only recent history
    if (this.stats.latencies.length > this.config.maxLatencyHistory) {
      this.stats.latencies.shift();
    }
    
    // Calculate average
    this.stats.avgLatency = Math.round(
      this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
    );
  }
  
  /**
   * Pre-cache frequently accessed data
   */
  async warmupCache() {
    console.log('🔥 Warming up cache...');
    
    try {
      // Pre-fetch and cache popular endpoints
      const warmupEndpoints = [
        { url: '/api/reports/lightweight?status=verified&limit=10', key: 'reports_verified_recent' },
        { url: '/api/reports/stats', key: 'reports_stats' },
        { url: '/api/settings/public', key: 'settings_public' },
      ];
      
      for (const endpoint of warmupEndpoints) {
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint.url}`, {
            timeout: 15000,
            headers: { 'X-Warmup': 'true' }
          });
          
          // Cache the response
          cache.set(endpoint.key, response.data, TTL.MEDIUM);
          console.log(`  ✓ Warmed: ${endpoint.key}`);
        } catch (error) {
          console.log(`  ✗ Failed: ${endpoint.key} - ${error.message}`);
        }
      }
      
      console.log('🔥 Cache warmup complete');
    } catch (error) {
      console.error('Cache warmup error:', error.message);
    }
  }
  
  /**
   * Stop the keep-alive service
   */
  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Keep-alive service stopped');
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}

// Export singleton instance
module.exports = new KeepAliveService();
