/**
 * App Initialization Hook
 * Handles backend warm-up and cache pre-loading on app start
 * 
 * Optimized for:
 * - Fast perceived startup
 * - Render.com cold start handling
 * - Smart background loading
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { smartWakeUp, prewarmCache } from '../services/EnhancedApiService.js';
import { checkBackendHealth } from '../services/api.js';
import { localCache } from '../services/LocalCacheService.js';

// Initialization states
const INIT_STATES = {
  IDLE: 'idle',
  WAKING: 'waking_backend',
  CHECKING: 'checking_health',
  WARMING: 'warming_cache',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Hook for managing app initialization
 */
export const useAppInitialization = () => {
  const [state, setState] = useState(INIT_STATES.IDLE);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [latency, setLatency] = useState(null);
  const initStartTime = useRef(null);
  const hasInitialized = useRef(false);
  
  // Messages for each state
  const stateMessages = {
    [INIT_STATES.IDLE]: 'Starting...',
    [INIT_STATES.WAKING]: 'Connecting to server...',
    [INIT_STATES.CHECKING]: 'Verifying connection...',
    [INIT_STATES.WARMING]: 'Loading data...',
    [INIT_STATES.READY]: 'Ready!',
    [INIT_STATES.ERROR]: 'Connection failed',
  };
  
  /**
   * Main initialization function
   */
  const initialize = useCallback(async (options = {}) => {
    const { skipWakeUp = false, timeout = 30000 } = options;
    
    // Prevent double initialization
    if (hasInitialized.current && state === INIT_STATES.READY) {
      return { success: true, cached: true };
    }
    
    initStartTime.current = Date.now();
    setError(null);
    
    try {
      // Step 1: Wake up backend (if needed)
      if (!skipWakeUp) {
        setState(INIT_STATES.WAKING);
        setProgress(20);
        
        const wakeResult = await Promise.race([
          smartWakeUp(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Wake-up timeout')), timeout / 2)
          )
        ]);
        
        if (!wakeResult.ok && !wakeResult.skipped) {
          console.warn('Wake-up failed, continuing anyway...');
        }
      }
      
      // Step 2: Health check
      setState(INIT_STATES.CHECKING);
      setProgress(50);
      
      const health = await Promise.race([
        checkBackendHealth(2, 2000),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), timeout / 2)
        )
      ]);
      
      if (health.latency) {
        setLatency(health.latency);
      }
      
      if (!health.ok) {
        throw new Error(health.message || 'Backend not available');
      }
      
      // Step 3: Pre-warm cache (non-blocking)
      setState(INIT_STATES.WARMING);
      setProgress(80);
      
      // Don't wait for cache warmup - let it run in background
      prewarmCache().catch(err => {
        console.warn('Cache prewarm failed:', err.message);
      });
      
      // Done!
      setState(INIT_STATES.READY);
      setProgress(100);
      hasInitialized.current = true;
      
      const totalTime = Date.now() - initStartTime.current;
      console.log(`✅ App initialized in ${totalTime}ms (latency: ${health.latency}ms)`);
      
      return { 
        success: true, 
        latency: health.latency,
        totalTime,
      };
      
    } catch (err) {
      console.error('❌ Initialization failed:', err.message);
      setState(INIT_STATES.ERROR);
      setError(err.message);
      
      return { 
        success: false, 
        error: err.message,
      };
    }
  }, [state]);
  
  /**
   * Retry initialization
   */
  const retry = useCallback(() => {
    hasInitialized.current = false;
    setState(INIT_STATES.IDLE);
    setProgress(0);
    setError(null);
    return initialize({ skipWakeUp: false });
  }, [initialize]);
  
  /**
   * Check if we have cached data available
   */
  const hasCachedData = useCallback(() => {
    const reports = localCache.get('reports_verified', true);
    return reports !== null;
  }, []);
  
  return {
    state,
    isInitializing: state !== INIT_STATES.READY && state !== INIT_STATES.ERROR,
    isReady: state === INIT_STATES.READY,
    hasError: state === INIT_STATES.ERROR,
    error,
    progress,
    latency,
    message: stateMessages[state],
    initialize,
    retry,
    hasCachedData,
  };
};

/**
 * Splash screen component for app initialization
 */
export const AppSplashScreen = ({ 
  initState, 
  onSkip = null,
  appName = 'BantayDalan',
  showSkipAfter = 5000,
}) => {
  const [showSkip, setShowSkip] = useState(false);
  
  useEffect(() => {
    if (initState.isInitializing) {
      const timer = setTimeout(() => {
        setShowSkip(true);
      }, showSkipAfter);
      
      return () => clearTimeout(timer);
    }
  }, [initState.isInitializing, showSkipAfter]);
  
  if (initState.isReady) {
    return null;
  }
  
  return (
    <div className="app-splash-screen">
      <div className="splash-content">
        <div className="splash-logo">🚨</div>
        <h1 className="splash-title">{appName}</h1>
        
        {initState.isInitializing && (
          <>
            <div className="splash-progress-container">
              <div 
                className="splash-progress-bar"
                style={{ width: `${initState.progress}%` }}
              />
            </div>
            <p className="splash-message">{initState.message}</p>
            
            {showSkip && onSkip && (
              <button 
                className="splash-skip-btn"
                onClick={onSkip}
              >
                Continue Anyway
              </button>
            )}
          </>
        )}
        
        {initState.hasError && (
          <div className="splash-error">
            <p className="splash-error-message">{initState.error}</p>
            <button 
              className="splash-retry-btn"
              onClick={initState.retry}
            >
              Try Again
            </button>
            {onSkip && (
              <button 
                className="splash-skip-btn"
                onClick={onSkip}
              >
                Continue Offline
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default useAppInitialization;
