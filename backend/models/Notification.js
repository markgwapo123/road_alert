const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType'
  },
  userType: {
    type: String,
    required: true,
    enum: ['User', 'Admin']
  },
  type: {
    type: String,
    required: true,
    enum: ['new_report', 'report_resolved', 'report_update', 'system_alert', 'welcome', 'verification_status']
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: false
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    required: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ type: 1 });

// Helper method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Helper method to notify about new reports
notificationSchema.statics.notifyNewReport = async function(report) {
  try {
    // Notify all users in the area (you can customize this logic)
    const User = require('./User');
    const users = await User.find({});
    
    const notifications = users.map(user => ({
      userId: user._id,
      userType: 'User',
      type: 'new_report',
      title: '🚨 New Alert in Your Area',
      message: `${report.type.toUpperCase()} alert reported: ${report.description.substring(0, 100)}...`,
      relatedReport: report._id,
      priority: report.severity === 'high' ? 'high' : 'medium'
    }));

    await this.insertMany(notifications);
    console.log(`Created ${notifications.length} notifications for new report`);
  } catch (error) {
    console.error('Error creating new report notifications:', error);
  }
};

// Helper method to notify report resolution
notificationSchema.statics.notifyReportResolved = async function(report, userId) {
  try {
    await this.createNotification({
      userId,
      userType: 'User',
      type: 'report_resolved',
      title: '✅ Your Report Has Been Resolved',
      message: `Your ${report.type} report has been marked as resolved by our team.`,
      relatedReport: report._id,
      priority: 'medium'
    });
  } catch (error) {
    console.error('Error creating report resolved notification:', error);
  }
};

// Helper method to notify verification status changes
notificationSchema.statics.notifyVerificationStatus = async function(userId, status, adminName = 'Admin') {
  try {
    let title, message, priority;
    
    if (status === 'approved') {
      title = '✅ Verification Approved!';
      message = `Congratulations! Your account verification has been approved by ${adminName}. You can now submit reports and access all features.`;
      priority = 'high';
    } else if (status === 'rejected') {
      title = '❌ Verification Rejected';
      message = `Your account verification has been rejected by ${adminName}. Please review your documents and resubmit with correct information.`;
      priority = 'high';
    } else {
      return; // Only notify for approved/rejected status
    }

    await this.createNotification({
      userId,
      userType: 'User',
      type: 'verification_status',
      title,
      message,
      priority,
      metadata: {
        verificationStatus: status,
        reviewedBy: adminName
      }
    });
  } catch (error) {
    console.error('Error creating verification status notification:', error);
  }
};

// Helper method to notify report status changes
notificationSchema.statics.notifyReportStatusChange = async function(report, status, adminName = 'Admin') {
  try {
    let title, message, priority;
    
    switch(status) {
      case 'verified':
        title = '✅ Report Approved!';
        message = `Your ${report.type} report has been approved by ${adminName} and is now visible to the community.`;
        priority = 'high';
        break;
      case 'rejected':
        title = '❌ Report Rejected';
        message = `Your ${report.type} report has been rejected by ${adminName}. ${report.adminNotes ? 'Reason: ' + report.adminNotes : ''}`;
        priority = 'medium';
        break;
      case 'resolved':
        title = '🛠️ Report Resolved';
        message = `Your ${report.type} report has been marked as resolved by ${adminName}. Thank you for helping keep our roads safe!`;
        priority = 'medium';
        break;
      case 'pending':
        title = '⏳ Report Under Review';
        message = `Your ${report.type} report is now under review by our team.`;
        priority = 'low';
        break;
      default:
        return; // Don't send notification for unknown status
    }

    await this.createNotification({
      userId: report.submittedBy,
      userType: 'User',
      type: 'report_update',
      title,
      message,
      relatedReport: report._id,
      priority,
      metadata: {
        reportStatus: status,
        reviewedBy: adminName,
        reportType: report.type
      }
    });
  } catch (error) {
    console.error('Error creating report status change notification:', error);
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
