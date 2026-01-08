/**
 * Sync Service - Handles automatic synchronization of offline data
 * 
 * Features:
 * - Auto-sync when connectivity is restored
 * - Retry failed syncs with exponential backoff
 * - Conflict resolution
 * - Progress tracking
 */

import config from '../config/index.js';
import {
  getPendingReports,
  updatePendingReportStatus,
  deletePendingReport,
  getSyncQueue,
  removeFromSyncQueue,
  cacheReports,
  cacheNotifications,
  SYNC_STATUS,
  base64ToBlob
} from './offlineStorage.js';

const API_BASE = config.API_BASE_URL;

// Sync configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [5000, 15000, 30000]; // Exponential backoff
const SYNC_BATCH_SIZE = 5; // Max concurrent syncs

// Sync event emitter
const syncListeners = new Set();

/**
 * Subscribe to sync events
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onSyncEvent = (callback) => {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
};

/**
 * Emit sync event to all listeners
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitSyncEvent = (event, data) => {
  syncListeners.forEach(callback => {
    try {
      callback({ event, ...data });
    } catch (error) {
      console.error('Sync event listener error:', error);
    }
  });
};

/**
 * Get authorization headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Check if user is authenticated
 */
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

// ============================================================================
// REPORT SYNCHRONIZATION
// ============================================================================

/**
 * Sync a single pending report to the server
 * @param {Object} report - Pending report data
 * @returns {Promise<Object>} Sync result
 */
export const syncReport = async (report) => {
  const { localId, image, ...reportData } = report;

  try {
    console.log(`🔄 Syncing report (localId: ${localId})...`);
    emitSyncEvent('report_sync_start', { localId });

    // Update status to syncing
    await updatePendingReportStatus(localId, SYNC_STATUS.SYNCING);

    // Prepare FormData for upload
    const formData = new FormData();
    
    // Add report fields
    Object.entries(reportData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && 
          !['syncStatus', 'createdAt', 'lastSyncAttempt', 'syncError', 'retryCount'].includes(key)) {
        if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    // Add image if present (convert from base64 if needed)
    if (image) {
      let imageBlob;
      if (typeof image === 'string' && image.startsWith('data:')) {
        imageBlob = base64ToBlob(image);
      } else if (image instanceof Blob || image instanceof File) {
        imageBlob = image;
      }
      
      if (imageBlob) {
        formData.append('image', imageBlob, 'report-image.jpg');
      }
    }

    // Send to server
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/reports/user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const serverReport = await response.json();
    
    // Success - delete local pending report
    await deletePendingReport(localId);
    
    console.log(`✅ Report synced successfully (serverId: ${serverReport._id || serverReport.id})`);
    emitSyncEvent('report_sync_success', { 
      localId, 
      serverId: serverReport._id || serverReport.id 
    });

    return {
      success: true,
      localId,
      serverId: serverReport._id || serverReport.id,
      report: serverReport
    };

  } catch (error) {
    console.error(`❌ Report sync failed (localId: ${localId}):`, error);
    
    // Update status to failed
    await updatePendingReportStatus(localId, SYNC_STATUS.FAILED, {
      syncError: error.message
    });

    emitSyncEvent('report_sync_failed', { localId, error: error.message });

    return {
      success: false,
      localId,
      error: error.message
    };
  }
};

/**
 * Sync all pending reports
 * @returns {Promise<Object>} Sync results summary
 */
export const syncAllPendingReports = async () => {
  if (!isAuthenticated()) {
    console.log('⚠️ Not authenticated - skipping sync');
    return { success: false, reason: 'not_authenticated' };
  }

  const pendingReports = await getPendingReports();
  
  if (pendingReports.length === 0) {
    console.log('ℹ️ No pending reports to sync');
    return { success: true, synced: 0, failed: 0 };
  }

  console.log(`🔄 Syncing ${pendingReports.length} pending report(s)...`);
  emitSyncEvent('sync_start', { total: pendingReports.length });

  // Filter reports that haven't exceeded retry limit
  const reportsToSync = pendingReports.filter(r => 
    r.syncStatus !== SYNC_STATUS.SYNCING && 
    (r.retryCount || 0) < MAX_RETRY_ATTEMPTS
  );

  let synced = 0;
  let failed = 0;

  // Sync in batches
  for (let i = 0; i < reportsToSync.length; i += SYNC_BATCH_SIZE) {
    const batch = reportsToSync.slice(i, i + SYNC_BATCH_SIZE);
    const results = await Promise.all(batch.map(report => syncReport(report)));
    
    results.forEach(result => {
      if (result.success) synced++;
      else failed++;
    });

    emitSyncEvent('sync_progress', { 
      synced, 
      failed, 
      total: reportsToSync.length 
    });
  }

  console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
  emitSyncEvent('sync_complete', { synced, failed, total: pendingReports.length });

  return { success: true, synced, failed, total: pendingReports.length };
};

// ============================================================================
// NOTIFICATION SYNCHRONIZATION
// ============================================================================

/**
 * Fetch and cache notifications from server
 * @returns {Promise<Array>}
 */
export const syncNotifications = async () => {
  if (!isAuthenticated()) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/notifications?limit=50`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const notifications = data.notifications || data || [];
    
    // Cache notifications locally
    await cacheNotifications(notifications);
    
    console.log(`✅ Synced ${notifications.length} notifications`);
    return notifications;

  } catch (error) {
    console.error('❌ Failed to sync notifications:', error);
    return [];
  }
};

// ============================================================================
// REPORTS DATA SYNC (Fetch from server)
// ============================================================================

/**
 * Fetch and cache user's reports from server
 * @returns {Promise<Array>}
 */
export const syncUserReports = async () => {
  if (!isAuthenticated()) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/reports/user`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reports = await response.json();
    
    // Cache reports locally
    await cacheReports(reports);
    
    console.log(`✅ Synced ${reports.length} user reports`);
    return reports;

  } catch (error) {
    console.error('❌ Failed to sync user reports:', error);
    return [];
  }
};

/**
 * Fetch and cache public reports from server
 * @returns {Promise<Array>}
 */
export const syncPublicReports = async () => {
  try {
    const response = await fetch(`${API_BASE}/reports?status=approved&limit=100`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const reports = data.reports || data || [];
    
    console.log(`✅ Fetched ${reports.length} public reports`);
    return reports;

  } catch (error) {
    console.error('❌ Failed to fetch public reports:', error);
    return [];
  }
};

// ============================================================================
// SYNC QUEUE PROCESSING
// ============================================================================

/**
 * Process sync queue (mark as read, etc.)
 * @returns {Promise<Object>}
 */
export const processSyncQueue = async () => {
  if (!isAuthenticated()) {
    return { processed: 0 };
  }

  const queue = await getSyncQueue();
  
  if (queue.length === 0) {
    return { processed: 0 };
  }

  console.log(`🔄 Processing ${queue.length} queued operations...`);

  let processed = 0;

  for (const item of queue) {
    try {
      switch (item.operation) {
        case 'mark_notification_read':
          await fetch(`${API_BASE}/notifications/${item.data.notificationId}/read`, {
            method: 'PUT',
            headers: getAuthHeaders()
          });
          break;

        case 'delete_notification':
          await fetch(`${API_BASE}/notifications/${item.data.notificationId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          break;

        // Add more operations as needed
        default:
          console.warn(`Unknown sync operation: ${item.operation}`);
      }

      await removeFromSyncQueue(item.queueId);
      processed++;

    } catch (error) {
      console.error(`Failed to process queue item ${item.queueId}:`, error);
    }
  }

  console.log(`✅ Processed ${processed}/${queue.length} queue items`);
  return { processed, total: queue.length };
};

// ============================================================================
// FULL SYNC
// ============================================================================

/**
 * Perform full synchronization
 * @returns {Promise<Object>}
 */
export const performFullSync = async () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔄 STARTING FULL SYNC');
  console.log('═══════════════════════════════════════════════════');

  const startTime = Date.now();
  const results = {
    reports: { synced: 0, failed: 0 },
    notifications: 0,
    userReports: 0,
    queue: 0
  };

  try {
    emitSyncEvent('full_sync_start', {});

    // 1. Sync pending reports to server
    const reportResults = await syncAllPendingReports();
    results.reports = {
      synced: reportResults.synced || 0,
      failed: reportResults.failed || 0
    };

    // 2. Process sync queue
    const queueResults = await processSyncQueue();
    results.queue = queueResults.processed || 0;

    // 3. Fetch fresh data from server
    const [notifications, userReports] = await Promise.all([
      syncNotifications(),
      syncUserReports()
    ]);

    results.notifications = notifications.length;
    results.userReports = userReports.length;

    const duration = Date.now() - startTime;
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ FULL SYNC COMPLETE (${duration}ms)`);
    console.log(`   Reports uploaded: ${results.reports.synced}`);
    console.log(`   Reports failed: ${results.reports.failed}`);
    console.log(`   Queue processed: ${results.queue}`);
    console.log(`   Notifications: ${results.notifications}`);
    console.log(`   User reports cached: ${results.userReports}`);
    console.log('═══════════════════════════════════════════════════');

    emitSyncEvent('full_sync_complete', { results, duration });

    return { success: true, results, duration };

  } catch (error) {
    console.error('❌ Full sync failed:', error);
    emitSyncEvent('full_sync_error', { error: error.message });
    return { success: false, error: error.message };
  }
};

// ============================================================================
// DAILY LIMIT CHECK
// ============================================================================

/**
 * Check daily submission limit
 * @returns {Promise<Object>}
 */
export const checkDailyLimit = async () => {
  try {
    const response = await fetch(`${API_BASE}/reports/daily-limit`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check daily limit:', error);
    // Return default limit info if offline
    return {
      dailyLimit: 5,
      submittedToday: 0,
      remaining: 5,
      offline: true
    };
  }
};

// ============================================================================
// RETRY MECHANISM
// ============================================================================

/**
 * Retry failed syncs with exponential backoff
 * @returns {Promise<void>}
 */
export const retryFailedSyncs = async () => {
  const pendingReports = await getPendingReports();
  const failedReports = pendingReports.filter(r => 
    r.syncStatus === SYNC_STATUS.FAILED &&
    (r.retryCount || 0) < MAX_RETRY_ATTEMPTS
  );

  if (failedReports.length === 0) {
    return;
  }

  console.log(`🔄 Retrying ${failedReports.length} failed report(s)...`);

  for (const report of failedReports) {
    const retryCount = report.retryCount || 0;
    const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
    
    console.log(`   Waiting ${delay/1000}s before retry #${retryCount + 1}...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    await syncReport(report);
  }
};

export default {
  // Sync functions
  syncReport,
  syncAllPendingReports,
  syncNotifications,
  syncUserReports,
  syncPublicReports,
  processSyncQueue,
  performFullSync,
  // Utilities
  checkDailyLimit,
  retryFailedSyncs,
  // Events
  onSyncEvent
};
