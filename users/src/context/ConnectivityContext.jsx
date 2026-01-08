/**
 * Connectivity Context - Manages network status and auto-sync
 * 
 * Features:
 * - Real-time connectivity detection
 * - Auto-sync on reconnection
 * - Offline mode indicator
 * - Sync progress tracking
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { initOfflineDB, getPendingReportCount, getOfflineStats } from '../services/offlineStorage';
import { performFullSync, onSyncEvent, retryFailedSyncs } from '../services/syncService';

// Create context
const ConnectivityContext = createContext(null);

// Provider component
export const ConnectivityProvider = ({ children }) => {
  // Connectivity state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  
  // Pending items count
  const [pendingCount, setPendingCount] = useState(0);
  const [offlineStats, setOfflineStats] = useState(null);
  
  // Refs for cleanup
  const syncTimeoutRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Initialize offline database
  useEffect(() => {
    const initDB = async () => {
      try {
        await initOfflineDB();
        console.log('✅ Offline database ready');
        await updatePendingCount();
      } catch (error) {
        console.error('❌ Failed to initialize offline database:', error);
      }
    };
    initDB();
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingReportCount();
      setPendingCount(count);
      
      const stats = await getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('Failed to get pending count:', error);
    }
  }, []);

  // Handle sync events
  useEffect(() => {
    unsubscribeRef.current = onSyncEvent((event) => {
      switch (event.event) {
        case 'sync_start':
        case 'full_sync_start':
          setIsSyncing(true);
          setSyncProgress({ ...event, percent: 0 });
          setSyncError(null);
          break;

        case 'sync_progress':
          const percent = event.total > 0 
            ? Math.round(((event.synced + event.failed) / event.total) * 100)
            : 0;
          setSyncProgress({ ...event, percent });
          break;

        case 'sync_complete':
        case 'full_sync_complete':
          setIsSyncing(false);
          setSyncProgress(null);
          setLastSyncTime(new Date());
          updatePendingCount();
          break;

        case 'report_sync_success':
          updatePendingCount();
          break;

        case 'report_sync_failed':
        case 'full_sync_error':
          setSyncError(event.error);
          break;

        default:
          break;
      }
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [updatePendingCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Network: ONLINE');
      setIsOnline(true);
      
      // If was offline and now online, trigger sync after delay
      if (wasOffline) {
        setWasOffline(false);
        
        // Small delay to ensure connection is stable
        syncTimeoutRef.current = setTimeout(async () => {
          console.log('🔄 Auto-sync triggered after reconnection');
          await triggerSync();
        }, 2000);
      }
    };

    const handleOffline = () => {
      console.log('📴 Network: OFFLINE');
      setIsOnline(false);
      setWasOffline(true);
      setIsSyncing(false);
      
      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [wasOffline]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      console.log('⚠️ Cannot sync - offline');
      return { success: false, reason: 'offline' };
    }

    if (isSyncing) {
      console.log('⚠️ Sync already in progress');
      return { success: false, reason: 'already_syncing' };
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      
      const result = await performFullSync();
      
      if (result.success) {
        // Retry any failed syncs
        await retryFailedSyncs();
      }
      
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Get sync status text
  const getSyncStatusText = useCallback(() => {
    if (!isOnline) return 'Offline';
    if (isSyncing) {
      if (syncProgress?.percent) {
        return `Syncing... ${syncProgress.percent}%`;
      }
      return 'Syncing...';
    }
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Online';
  }, [isOnline, isSyncing, syncProgress, pendingCount]);

  // Get sync status type for styling
  const getSyncStatusType = useCallback(() => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (syncError) return 'error';
    if (pendingCount > 0) return 'pending';
    return 'online';
  }, [isOnline, isSyncing, syncError, pendingCount]);

  // Context value
  const value = {
    // Connectivity
    isOnline,
    wasOffline,
    
    // Sync state
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncError,
    
    // Pending items
    pendingCount,
    offlineStats,
    
    // Actions
    triggerSync,
    updatePendingCount,
    
    // Helpers
    getSyncStatusText,
    getSyncStatusType
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
};

// Custom hook for using connectivity context
export const useConnectivity = () => {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
};

export default ConnectivityContext;
