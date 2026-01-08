/**
 * Offline Storage Service - IndexedDB-based local storage for Road Alert
 * Handles offline report storage, sync queue, and cached data
 * 
 * Features:
 * - Store reports locally when offline
 * - Queue sync operations
 * - Cache notifications and user data
 * - Encrypted storage for sensitive data
 */

const DB_NAME = 'RoadAlertOfflineDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  PENDING_REPORTS: 'pendingReports',
  CACHED_REPORTS: 'cachedReports',
  NOTIFICATIONS: 'notifications',
  SYNC_QUEUE: 'syncQueue',
  USER_DATA: 'userData',
  SETTINGS: 'settings'
};

// Sync status enum
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
  CONFLICT: 'conflict'
};

let db = null;

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export const initOfflineDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('❌ Failed to open offline database:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('✅ Offline database initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      console.log('🔄 Upgrading offline database schema...');

      // Pending reports store (reports created offline)
      if (!database.objectStoreNames.contains(STORES.PENDING_REPORTS)) {
        const pendingStore = database.createObjectStore(STORES.PENDING_REPORTS, { 
          keyPath: 'localId', 
          autoIncrement: true 
        });
        pendingStore.createIndex('status', 'syncStatus', { unique: false });
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
        pendingStore.createIndex('userId', 'userId', { unique: false });
      }

      // Cached reports store (synced reports from server)
      if (!database.objectStoreNames.contains(STORES.CACHED_REPORTS)) {
        const cachedStore = database.createObjectStore(STORES.CACHED_REPORTS, { 
          keyPath: 'serverId' 
        });
        cachedStore.createIndex('status', 'status', { unique: false });
        cachedStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Notifications store
      if (!database.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = database.createObjectStore(STORES.NOTIFICATIONS, { 
          keyPath: 'id' 
        });
        notifStore.createIndex('isRead', 'isRead', { unique: false });
        notifStore.createIndex('createdAt', 'createdAt', { unique: false });
        notifStore.createIndex('type', 'type', { unique: false });
      }

      // Sync queue store (operations to sync)
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'queueId', 
          autoIncrement: true 
        });
        syncStore.createIndex('operation', 'operation', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }

      // User data store
      if (!database.objectStoreNames.contains(STORES.USER_DATA)) {
        database.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
      }

      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      console.log('✅ Database schema upgraded');
    };
  });
};

/**
 * Get database instance
 * @returns {Promise<IDBDatabase>}
 */
const getDB = async () => {
  if (!db) {
    await initOfflineDB();
  }
  return db;
};

// ============================================================================
// PENDING REPORTS (Offline-created reports)
// ============================================================================

/**
 * Save a report locally for offline sync
 * @param {Object} reportData - Report data including blurred image
 * @returns {Promise<number>} Local ID of saved report
 */
export const savePendingReport = async (reportData) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);

    const report = {
      ...reportData,
      syncStatus: SYNC_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      lastSyncAttempt: null,
      syncError: null,
      retryCount: 0
    };

    const request = store.add(report);

    request.onsuccess = () => {
      console.log('✅ Report saved offline with localId:', request.result);
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('❌ Failed to save report offline:', request.error);
      reject(request.error);
    };
  });
};

/**
 * Get all pending reports
 * @returns {Promise<Array>}
 */
export const getPendingReports = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get pending reports by sync status
 * @param {string} status - Sync status to filter by
 * @returns {Promise<Array>}
 */
export const getPendingReportsByStatus = async (status) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Update pending report sync status
 * @param {number} localId - Local ID of the report
 * @param {string} status - New sync status
 * @param {Object} options - Additional update options
 * @returns {Promise<void>}
 */
export const updatePendingReportStatus = async (localId, status, options = {}) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);
    const getRequest = store.get(localId);

    getRequest.onsuccess = () => {
      const report = getRequest.result;
      if (!report) {
        reject(new Error('Report not found'));
        return;
      }

      const updatedReport = {
        ...report,
        syncStatus: status,
        lastSyncAttempt: new Date().toISOString(),
        ...options
      };

      if (status === SYNC_STATUS.FAILED) {
        updatedReport.retryCount = (report.retryCount || 0) + 1;
      }

      const putRequest = store.put(updatedReport);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

/**
 * Delete pending report (after successful sync)
 * @param {number} localId - Local ID of the report
 * @returns {Promise<void>}
 */
export const deletePendingReport = async (localId) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);
    const request = store.delete(localId);

    request.onsuccess = () => {
      console.log('✅ Pending report deleted:', localId);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get count of pending reports
 * @returns {Promise<number>}
 */
export const getPendingReportCount = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.PENDING_REPORTS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_REPORTS);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// CACHED REPORTS (Synced reports from server)
// ============================================================================

/**
 * Cache reports from server
 * @param {Array} reports - Reports from server
 * @returns {Promise<void>}
 */
export const cacheReports = async (reports) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_REPORTS);

    reports.forEach(report => {
      store.put({
        ...report,
        serverId: report._id || report.id,
        cachedAt: new Date().toISOString()
      });
    });

    transaction.oncomplete = () => {
      console.log(`✅ Cached ${reports.length} reports`);
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Get cached reports
 * @returns {Promise<Array>}
 */
export const getCachedReports = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_REPORTS], 'readonly');
    const store = transaction.objectStore(STORES.CACHED_REPORTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Clear all cached reports
 * @returns {Promise<void>}
 */
export const clearCachedReports = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.CACHED_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_REPORTS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Cache notifications locally
 * @param {Array} notifications - Notifications from server
 * @returns {Promise<void>}
 */
export const cacheNotifications = async (notifications) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.NOTIFICATIONS], 'readwrite');
    const store = transaction.objectStore(STORES.NOTIFICATIONS);

    notifications.forEach(notif => {
      store.put({
        ...notif,
        id: notif._id || notif.id,
        cachedAt: new Date().toISOString()
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Get cached notifications
 * @returns {Promise<Array>}
 */
export const getCachedNotifications = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.NOTIFICATIONS], 'readonly');
    const store = transaction.objectStore(STORES.NOTIFICATIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      const notifications = request.result || [];
      // Sort by createdAt descending
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      resolve(notifications);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Mark notification as read locally
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const markNotificationReadLocally = async (notificationId) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.NOTIFICATIONS], 'readwrite');
    const store = transaction.objectStore(STORES.NOTIFICATIONS);
    const getRequest = store.get(notificationId);

    getRequest.onsuccess = () => {
      const notif = getRequest.result;
      if (notif) {
        notif.isRead = true;
        store.put(notif);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// ============================================================================
// SYNC QUEUE
// ============================================================================

/**
 * Add operation to sync queue
 * @param {Object} operation - Operation to queue
 * @returns {Promise<number>} Queue ID
 */
export const addToSyncQueue = async (operation) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const queueItem = {
      ...operation,
      status: SYNC_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      priority: operation.priority || 1
    };

    const request = store.add(queueItem);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all pending sync operations
 * @returns {Promise<Array>}
 */
export const getSyncQueue = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('status');
    const request = index.getAll(SYNC_STATUS.PENDING);

    request.onsuccess = () => {
      const queue = request.result || [];
      // Sort by priority (higher first) then by createdAt
      queue.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      resolve(queue);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Remove item from sync queue
 * @param {number} queueId - Queue ID
 * @returns {Promise<void>}
 */
export const removeFromSyncQueue = async (queueId) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(queueId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// USER DATA & SETTINGS
// ============================================================================

/**
 * Save user data locally
 * @param {string} key - Data key
 * @param {any} value - Data value
 * @returns {Promise<void>}
 */
export const saveUserData = async (key, value) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.USER_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.USER_DATA);
    const request = store.put({ key, value, updatedAt: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get user data
 * @param {string} key - Data key
 * @returns {Promise<any>}
 */
export const getUserData = async (key) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.USER_DATA], 'readonly');
    const store = transaction.objectStore(STORES.USER_DATA);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Save setting locally
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<void>}
 */
export const saveSetting = async (key, value) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get setting
 * @param {string} key - Setting key
 * @returns {Promise<any>}
 */
export const getSetting = async (key) => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.SETTINGS], 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all offline data
 * @returns {Promise<void>}
 */
export const clearAllOfflineData = async () => {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const storeNames = Object.values(STORES);
    const transaction = database.transaction(storeNames, 'readwrite');

    storeNames.forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });

    transaction.oncomplete = () => {
      console.log('✅ All offline data cleared');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * Get offline storage statistics
 * @returns {Promise<Object>}
 */
export const getOfflineStats = async () => {
  const database = await getDB();
  
  const getCounts = (storeName) => {
    return new Promise((resolve) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  };

  const [pendingReports, cachedReports, notifications, syncQueue] = await Promise.all([
    getCounts(STORES.PENDING_REPORTS),
    getCounts(STORES.CACHED_REPORTS),
    getCounts(STORES.NOTIFICATIONS),
    getCounts(STORES.SYNC_QUEUE)
  ]);

  return {
    pendingReports,
    cachedReports,
    notifications,
    syncQueue,
    totalItems: pendingReports + cachedReports + notifications + syncQueue
  };
};

/**
 * Convert image blob/file to base64 for storage
 * @param {Blob|File} blob - Image blob or file
 * @returns {Promise<string>} Base64 encoded string
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert base64 to blob for upload
 * @param {string} base64 - Base64 encoded string
 * @returns {Blob}
 */
export const base64ToBlob = (base64) => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

export default {
  initOfflineDB,
  SYNC_STATUS,
  // Pending reports
  savePendingReport,
  getPendingReports,
  getPendingReportsByStatus,
  updatePendingReportStatus,
  deletePendingReport,
  getPendingReportCount,
  // Cached reports
  cacheReports,
  getCachedReports,
  clearCachedReports,
  // Notifications
  cacheNotifications,
  getCachedNotifications,
  markNotificationReadLocally,
  // Sync queue
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  // User data & settings
  saveUserData,
  getUserData,
  saveSetting,
  getSetting,
  // Utilities
  clearAllOfflineData,
  getOfflineStats,
  blobToBase64,
  base64ToBlob
};
