/**
 * Offline Status Indicator - Non-intrusive offline/sync indicator for mobile
 * 
 * Features:
 * - Shows online/offline status
 * - Displays pending upload count
 * - Sync progress indicator
 * - Manual sync trigger
 * - Preserves existing UI design
 */

import React from 'react';
import { useConnectivity } from '../context/ConnectivityContext.jsx';
import './OfflineIndicator.css';

/**
 * Compact status badge for headers/nav
 */
export const OfflineStatusBadge = ({ className = '' }) => {
  const connectivity = useConnectivity();
  
  if (!connectivity) return null;
  
  const { isOnline, pendingCount, isSyncing, getSyncStatusType } = connectivity;
  const statusType = getSyncStatusType();
  
  // Don't show when online with no pending items
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }
  
  return (
    <div className={`offline-badge ${statusType} ${className}`}>
      <span className="badge-dot"></span>
      {!isOnline && <span className="badge-text">Offline</span>}
      {isOnline && isSyncing && <span className="badge-text">Syncing</span>}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <span className="badge-text">{pendingCount} pending</span>
      )}
    </div>
  );
};

/**
 * Sync status pill for inline display
 */
export const SyncStatusPill = ({ showCount = true }) => {
  const connectivity = useConnectivity();
  
  if (!connectivity) return null;
  
  const { isOnline, pendingCount, isSyncing, triggerSync, syncProgress } = connectivity;
  
  return (
    <div className={`sync-pill ${isOnline ? 'online' : 'offline'} ${isSyncing ? 'syncing' : ''}`}>
      <span className="pill-icon">
        {!isOnline && '📴'}
        {isOnline && isSyncing && '🔄'}
        {isOnline && !isSyncing && pendingCount > 0 && '📤'}
        {isOnline && !isSyncing && pendingCount === 0 && '✅'}
      </span>
      
      {showCount && pendingCount > 0 && !isSyncing && (
        <span className="pill-count">{pendingCount}</span>
      )}
      
      {isSyncing && syncProgress?.percent !== undefined && (
        <span className="pill-progress">{syncProgress.percent}%</span>
      )}
      
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button className="pill-sync-btn" onClick={triggerSync}>↑</button>
      )}
    </div>
  );
};

/**
 * Floating offline banner - appears at top when offline
 */
export const OfflineBanner = () => {
  const connectivity = useConnectivity();
  
  if (!connectivity) return null;
  
  const { isOnline, pendingCount, isSyncing, triggerSync, syncProgress } = connectivity;
  
  // Only show when there's something to indicate
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }
  
  return (
    <div className={`offline-banner ${isOnline ? 'online' : 'offline'} ${isSyncing ? 'syncing' : ''}`}>
      <div className="banner-inner">
        {/* Offline state */}
        {!isOnline && (
          <>
            <span className="banner-icon">📴</span>
            <span className="banner-message">
              Offline - Reports will sync when connected
              {pendingCount > 0 && <span className="pending-count">({pendingCount} saved)</span>}
            </span>
          </>
        )}
        
        {/* Syncing state */}
        {isOnline && isSyncing && (
          <>
            <span className="banner-icon spinning">🔄</span>
            <span className="banner-message">
              Syncing {syncProgress?.synced || 0}/{syncProgress?.total || pendingCount}...
            </span>
            {syncProgress?.percent !== undefined && (
              <div className="banner-progress">
                <div className="progress-fill" style={{ width: `${syncProgress.percent}%` }}></div>
              </div>
            )}
          </>
        )}
        
        {/* Pending state */}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <>
            <span className="banner-icon">📤</span>
            <span className="banner-message">
              {pendingCount} report{pendingCount > 1 ? 's' : ''} ready to sync
            </span>
            <button className="banner-sync-btn" onClick={triggerSync}>
              Sync Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Main offline indicator component - configurable display
 */
const OfflineIndicator = ({ 
  variant = 'badge',  // 'badge', 'pill', 'banner', 'full'
  position = 'inline', // 'inline', 'fixed-top', 'fixed-bottom'
  showWhenOnline = false,
  className = ''
}) => {
  const connectivity = useConnectivity();
  
  if (!connectivity) return null;
  
  const { isOnline, pendingCount, isSyncing } = connectivity;
  
  // Don't render if online with nothing pending (unless showWhenOnline)
  if (!showWhenOnline && isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }
  
  const positionClass = position !== 'inline' ? `position-${position}` : '';
  
  switch (variant) {
    case 'badge':
      return (
        <div className={`offline-indicator-wrapper ${positionClass} ${className}`}>
          <OfflineStatusBadge />
        </div>
      );
    
    case 'pill':
      return (
        <div className={`offline-indicator-wrapper ${positionClass} ${className}`}>
          <SyncStatusPill />
        </div>
      );
    
    case 'banner':
      return (
        <div className={`offline-indicator-wrapper ${positionClass} ${className}`}>
          <OfflineBanner />
        </div>
      );
    
    case 'full':
      return (
        <div className={`offline-indicator-wrapper ${positionClass} ${className}`}>
          <FullOfflineStatus />
        </div>
      );
    
    default:
      return <OfflineStatusBadge className={className} />;
  }
};

/**
 * Full status display with all details
 */
const FullOfflineStatus = () => {
  const connectivity = useConnectivity();
  
  if (!connectivity) return null;
  
  const { 
    isOnline, 
    pendingCount, 
    isSyncing, 
    triggerSync, 
    lastSyncTime,
    syncError,
    offlineStats 
  } = connectivity;
  
  return (
    <div className={`offline-status-full ${isOnline ? 'online' : 'offline'}`}>
      {/* Connection status */}
      <div className="status-header">
        <span className="status-icon">{isOnline ? '🌐' : '📴'}</span>
        <span className="status-title">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
      
      {/* Pending items */}
      {pendingCount > 0 && (
        <div className="status-pending">
          <span className="pending-label">Pending uploads:</span>
          <span className="pending-value">{pendingCount}</span>
        </div>
      )}
      
      {/* Last sync time */}
      {lastSyncTime && (
        <div className="status-lastsync">
          <span className="lastsync-label">Last sync:</span>
          <span className="lastsync-value">
            {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        </div>
      )}
      
      {/* Sync error */}
      {syncError && (
        <div className="status-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{syncError}</span>
        </div>
      )}
      
      {/* Sync button */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button className="sync-action-btn" onClick={triggerSync}>
          Sync Now ({pendingCount})
        </button>
      )}
      
      {/* Syncing indicator */}
      {isSyncing && (
        <div className="syncing-indicator">
          <span className="syncing-spinner">🔄</span>
          <span className="syncing-text">Syncing...</span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
