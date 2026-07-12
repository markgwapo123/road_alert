const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const Device = require('../models/Device');
const NotificationPreferences = require('../models/NotificationPreferences');
const Notification = require('../models/Notification');

class FcmService {
  constructor() {
    this.initialized = false;
    this.enabled = process.env.FCM_ENABLED !== 'false';
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized || !this.enabled) {
      if (!this.enabled) {
        console.log('⚠️ FCM is disabled via FCM_ENABLED=false');
      }
      return;
    }

    try {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      };

      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        console.log('⚠️ Firebase credentials not found in environment variables. FCM disabled.');
        this.enabled = false;
        return;
      }

      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if FCM is enabled and initialized
   */
  isReady() {
    return this.enabled && this.initialized;
  }

  /**
   * Send notification to specific tokens
   * @param {Array} tokens - Array of FCM tokens
   * @param {Object} notification - Notification object {title, body}
   * @param {Object} data - Additional data payload
   * @returns {Object} Result with success and failure counts
   */
  async sendNotification(tokens, notification, data = {}) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping push notification');
      return { successCount: 0, failureCount: 0, results: [] };
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No tokens provided for push notification');
      return { successCount: 0, failureCount: 0, results: [] };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        android: {
          notification: {
            sound: 'default',
            channelId: 'default_sound_channel_v2'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        },
        data: data,
        tokens: tokens
      };

      // FCM supports up to 500 tokens per request
      const MAX_TOKENS_PER_REQUEST = 500;
      const chunks = [];

      for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_REQUEST) {
        chunks.push(tokens.slice(i, i + MAX_TOKENS_PER_REQUEST));
      }

      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      const allResults = [];

      for (const chunk of chunks) {
        message.tokens = chunk;
        const response = await getMessaging().sendEachForMulticast(message);

        totalSuccessCount += response.successCount;
        totalFailureCount += response.failureCount;

        // Handle invalid tokens
        for (let i = 0; i < response.responses.length; i++) {
          const resp = response.responses[i];
          if (!resp.success) {
            const token = chunk[i];
            const error = resp.error;

            console.log(`❌ Failed to send to token ${token}:`, error.message);

            // Remove invalid token
            if (error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-registration-token') {
              await this.removeInvalidToken(token);
            }

            allResults.push({ token, success: false, error: error.message });
          } else {
            allResults.push({ token: chunk[i], success: true });
          }
        }
      }

      console.log(`📤 Push notification sent: ${totalSuccessCount} success, ${totalFailureCount} failed`);

      return {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        results: allResults
      };
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return { successCount: 0, failureCount: tokens.length, error: error.message };
    }
  }

  /**
   * Send push notification for verified report to all users
   * @param {Object} report - Report object
   * @returns {Object} Result with success and failure counts
   */
  async sendVerifiedReportNotification(report) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping verified report notification');
      return { successCount: 0, failureCount: 0 };
    }

    try {
      // Check if notification already sent for this report
      const existingNotification = await Notification.findOne({
        reportId: report._id,
        type: 'status_update',
        status: 'verified'
      });

      if (existingNotification) {
        console.log('⚠️ Notification already sent for this report, skipping duplicate');
        return { successCount: 0, failureCount: 0, duplicate: true };
      }

      // Get all active devices
      const devices = await Device.getAllActiveDevices();

      if (devices.length === 0) {
        console.log('⚠️ No active devices found');
        return { successCount: 0, failureCount: 0 };
      }

      // Filter users based on preferences
      const eligibleTokens = [];

      for (const device of devices) {
        const shouldReceive = await NotificationPreferences.shouldReceive(
          device.userId,
          'report_verified'
        );

        if (shouldReceive) {
          eligibleTokens.push(device.token);
        }
      }

      if (eligibleTokens.length === 0) {
        console.log('⚠️ No eligible users based on preferences');
        return { successCount: 0, failureCount: 0 };
      }

      // Format notification
      const notification = {
        title: '🚨 Verified Incident',
        body: `A verified incident has been reported in ${report.barangay || 'your area'}.`
      };

      const data = {
        type: 'report_verified',
        reportId: report._id.toString(),
        title: report.type,
        category: report.type,
        barangay: report.barangay,
        status: 'verified',
        timestamp: new Date().toISOString(),
        description: report.description?.substring(0, 100) || ''
      };

      return await this.sendNotification(eligibleTokens, notification, data);
    } catch (error) {
      console.error('❌ Error sending verified report notification:', error);
      return { successCount: 0, failureCount: 0, error: error.message };
    }
  }

  /**
   * Send personal push notification when a report is rejected
   * @param {Object} report - Report object
   * @returns {Object} Result with success and failure counts
   */
  async sendRejectedReportNotification(report) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping rejected report notification');
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const ownerId = report.reportedBy?.id;
      if (!ownerId) {
        console.log('⚠️ No report owner found, skipping rejected notification');
        return { successCount: 0, failureCount: 0 };
      }

      const devices = await Device.find({ userId: ownerId, isActive: true });
      if (devices.length === 0) {
        console.log('⚠️ No active devices found for report owner');
        return { successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);

      const notification = {
        title: '❌ Report Not Approved',
        body: `Your ${report.type} report could not be verified. Tap to see details.`
      };

      const data = {
        type: 'report_rejected',
        reportId: report._id.toString(),
        title: report.type,
        category: report.type,
        status: 'rejected',
        timestamp: new Date().toISOString(),
        adminNotes: report.adminNotes || ''
      };

      return await this.sendNotification(tokens, notification, data);
    } catch (error) {
      console.error('❌ Error sending rejected report notification:', error);
      return { successCount: 0, failureCount: 0, error: error.message };
    }
  }

  /**
   * Send personal push notification when a report is resolved
   * @param {Object} report - Report object
   * @returns {Object} Result with success and failure counts
   */
  async sendResolvedReportNotification(report) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping resolved report notification');
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const ownerId = report.reportedBy?.id;
      if (!ownerId) {
        console.log('⚠️ No report owner found, skipping resolved notification');
        return { successCount: 0, failureCount: 0 };
      }

      const devices = await Device.find({ userId: ownerId, isActive: true });
      if (devices.length === 0) {
        console.log('⚠️ No active devices found for report owner');
        return { successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);

      const notification = {
        title: '✅ Issue Resolved',
        body: `Great news! Your ${report.type} report has been resolved. Thank you for helping improve our roads!`
      };

      const data = {
        type: 'report_resolved',
        reportId: report._id.toString(),
        title: report.type,
        category: report.type,
        status: 'resolved',
        timestamp: new Date().toISOString()
      };

      return await this.sendNotification(tokens, notification, data);
    } catch (error) {
      console.error('❌ Error sending resolved report notification:', error);
      return { successCount: 0, failureCount: 0, error: error.message };
    }
  }

  /**
   * Send push notification for pending report to admins only
   * @param {Object} report - Report object
   * @param {Array} adminIds - Array of admin user IDs
   * @returns {Object} Result with success and failure counts
   */
  async sendPendingReportNotification(report, adminIds = []) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping pending report notification');
      return { successCount: 0, failureCount: 0 };
    }

    try {
      if (adminIds.length === 0) {
        console.log('⚠️ No admin IDs provided');
        return { successCount: 0, failureCount: 0 };
      }

      // Get devices for admin users
      const devices = await Device.find({
        userId: { $in: adminIds },
        isActive: true
      });

      if (devices.length === 0) {
        console.log('⚠️ No active devices found for admins');
        return { successCount: 0, failureCount: 0 };
      }

      const tokens = devices.map(d => d.token);

      // Format notification
      const notification = {
        title: '📋 New Report Pending',
        body: `A new report "${report.type}" is pending verification.`
      };

      const data = {
        type: 'report_pending',
        reportId: report._id.toString(),
        title: report.type,
        category: report.type,
        barangay: report.barangay,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      return await this.sendNotification(tokens, notification, data);
    } catch (error) {
      console.error('❌ Error sending pending report notification:', error);
      return { successCount: 0, failureCount: 0, error: error.message };
    }
  }

  /**
   * Send push notification broadcast when a news post is created
   * @param {Object} newsPost - News post object
   * @returns {Object} Result with success and failure counts
   */
  async sendNewsNotification(newsPost) {
    if (!this.isReady()) {
      console.log('⚠️ FCM not ready, skipping news notification');
      return { successCount: 0, failureCount: 0 };
    }

    try {
      // Get all active devices
      const devices = await Device.getAllActiveDevices();
      if (devices.length === 0) {
        console.log('⚠️ No active devices found');
        return { successCount: 0, failureCount: 0 };
      }

      // Filter users based on preferences (uses existing 'announcement' preference key)
      const eligibleTokens = [];
      for (const device of devices) {
        const shouldReceive = await NotificationPreferences.shouldReceive(
          device.userId,
          'announcement'
        );
        if (shouldReceive) {
          eligibleTokens.push(device.token);
        }
      }

      if (eligibleTokens.length === 0) {
        console.log('⚠️ No eligible users based on preferences');
        return { successCount: 0, failureCount: 0 };
      }

      const title = newsPost.priority === 'urgent' ? '🚨 Urgent Announcement' : '📰 New Update';

      const notification = {
        title,
        body: newsPost.title
      };

      const data = {
        type: 'news_update',
        newsId: newsPost._id.toString(),
        title: newsPost.title,
        priority: newsPost.priority || 'normal',
        timestamp: new Date().toISOString()
      };

      return await this.sendNotification(eligibleTokens, notification, data);
    } catch (error) {
      console.error('❌ Error sending news notification:', error);
      return { successCount: 0, failureCount: 0, error: error.message };
    }
  }

  /**
   * Remove invalid token from database
   * @param {String} token - Invalid FCM token
   */
  async removeInvalidToken(token) {
    try {
      await Device.removeInvalidToken(token);
      console.log(`🗑️ Removed invalid token: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.error('❌ Error removing invalid token:', error);
    }
  }

  /**
   * Format notification content for verified report
   * @param {Object} report - Report object
   * @returns {Object} Formatted notification
   */
  formatVerifiedReportNotification(report) {
    return {
      title: '🚨 Verified Incident',
      body: `${report.type}\nCategory: ${report.type}\nBarangay: ${report.barangay}\nReport ID: ${report._id}\nTime: ${new Date(report.createdAt).toLocaleString()}`,
      data: {
        type: 'report_verified',
        reportId: report._id.toString(),
        title: report.type,
        category: report.type,
        barangay: report.barangay,
        status: 'verified',
        description: report.description?.substring(0, 100) || ''
      }
    };
  }

  /**
   * Check if notification should be sent (duplicate prevention)
   * @param {String} reportId - Report ID
   * @param {String} fromStatus - Previous status
   * @param {String} toStatus - New status
   * @returns {Boolean} Whether to send notification
   */
  shouldSendNotification(reportId, fromStatus, toStatus) {
    // Only send notification when transitioning from pending to verified
    if (fromStatus === 'pending' && toStatus === 'verified') {
      return true;
    }

    // Don't send for other status changes unless explicitly needed
    return false;
  }
}

// Export singleton instance
const fcmService = new FcmService();

module.exports = fcmService;