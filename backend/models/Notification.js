const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      // userId is required unless it's a broadcast announcement
      return this.type !== 'announcement';
    }
  },
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: function() {
      // reportId is only required for report-related notifications
      return ['admin_response', 'status_update', 'verification_status', 'report_status_update', 'new_report'].includes(this.type);
    }
  },
  type: {
    type: String,
    enum: [
      'admin_response',      // Admin replied to user's report
      'status_update',       // Report status changed (pending, under_review, resolved, rejected)
      'announcement',        // System-wide admin announcement
      'verification_status', // Legacy: verification status
      'report_status_update',// Legacy: report status update
      'new_report',          // Legacy: new report
      'system_alert'         // System alerts
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  message: {
    type: String,
    required: true,
    maxLength: 1000
  },
  // For admin responses - preview of the admin's message
  adminMessage: {
    type: String,
    maxLength: 500
  },
  // For status updates
  status: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected', 'resolved', null],
    default: null
  },
  previousStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected', 'resolved', null],
    default: null
  },
  // Priority for announcements
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // For announcements - broadcast to all users
  isBroadcast: {
    type: Boolean,
    default: false
  },
  // Track which users have read broadcast notifications
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  },
  // Expiry for announcements
  expiresAt: {
    type: Date
  },
  // Admin who created the notification (for responses/announcements)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

// Index for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ isBroadcast: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create admin response notification
notificationSchema.statics.createAdminResponse = async function(reportId, userId, adminMessage, adminId) {
  return this.create({
    userId,
    reportId,
    type: 'admin_response',
    title: 'Admin Response to Your Report',
    message: `An admin has responded to your report. ${adminMessage.substring(0, 100)}${adminMessage.length > 100 ? '...' : ''}`,
    adminMessage,
    createdBy: adminId
  });
};

// Static method to create status update notification
notificationSchema.statics.createStatusUpdate = async function(reportId, userId, newStatus, previousStatus) {
  const statusLabels = {
    pending: 'Pending',
    under_review: 'Under Review',
    verified: 'Verified',
    rejected: 'Rejected',
    resolved: 'Resolved'
  };
  
  return this.create({
    userId,
    reportId,
    type: 'status_update',
    title: 'Report Status Updated',
    message: `Your report status has been changed from "${statusLabels[previousStatus] || previousStatus}" to "${statusLabels[newStatus] || newStatus}".`,
    status: newStatus,
    previousStatus
  });
};

// Static method to create announcement
notificationSchema.statics.createAnnouncement = async function(title, message, priority = 'normal', adminId, expiresAt = null) {
  return this.create({
    type: 'announcement',
    title,
    message,
    priority,
    isBroadcast: true,
    createdBy: adminId,
    expiresAt
  });
};

module.exports = mongoose.model('Notification', notificationSchema);