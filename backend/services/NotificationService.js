const Notification = require('../models/Notification');

class NotificationService {
  
  /**
   * Create a notification for report status update
   * @param {Object} params - Notification parameters
   * @param {String} params.userId - User ID who submitted the report
   * @param {String} params.reportId - Report ID
   * @param {String} params.oldStatus - Previous status
   * @param {String} params.newStatus - New status
   * @param {String} params.reportType - Type of report (pothole, debris, etc.)
   * @param {String} params.adminNotes - Optional admin notes
   */
  static async createReportStatusNotification({
    userId,
    reportId,
    oldStatus,
    newStatus,
    reportType,
    adminNotes = null
  }) {
    try {
      if (!userId || oldStatus === newStatus) {
        return null; // Don't create notification if status didn't change or no user
      }

      const { title, message } = this.getStatusUpdateContent({
        oldStatus,
        newStatus,
        reportType,
        adminNotes
      });

      const notification = new Notification({
        userId,
        reportId,
        type: 'verification_status',
        title,
        message,
        status: newStatus,
        isRead: false
      });

      await notification.save();
      console.log(`📧 Notification created for user ${userId}: ${title}`);
      
      return notification;

    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Generate notification content based on status change
   */
  static getStatusUpdateContent({ oldStatus, newStatus, reportType, adminNotes }) {
    const reportTypeDisplay = reportType.charAt(0).toUpperCase() + reportType.slice(1);
    
    switch (newStatus) {
      case 'verified':
        return {
          title: `Report Approved: ${reportTypeDisplay}`,
          message: `Great news! Your ${reportType} report has been verified and is now visible to the community. Thank you for helping improve our roads!`
        };
        
      case 'rejected':
        return {
          title: `Report Update: ${reportTypeDisplay}`,
          message: `Your ${reportType} report has been reviewed and could not be verified at this time.${adminNotes ? ` Admin notes: ${adminNotes}` : ''} You can submit a new report if the issue persists.`
        };
        
      case 'resolved':
        return {
          title: `Issue Resolved: ${reportTypeDisplay}`,
          message: `Excellent news! The ${reportType} issue you reported has been resolved. Thank you for your contribution to road safety!`
        };
        
      case 'pending':
        return {
          title: `Report Under Review: ${reportTypeDisplay}`,
          message: `Your ${reportType} report is currently being reviewed by our team. We'll notify you once it's been processed.`
        };
        
      default:
        return {
          title: `Report Status Update: ${reportTypeDisplay}`,
          message: `Your ${reportType} report status has been updated to ${newStatus}.`
        };
    }
  }

  /**
   * Create a notification for report resolved with admin feedback
   * @param {Object} params - Notification parameters
   * @param {String} params.userId - User ID who submitted the report
   * @param {String} params.reportId - Report ID
   * @param {String} params.reportType - Type of report
   * @param {String} params.adminFeedback - Admin feedback message
   * @param {Boolean} params.hasEvidence - Whether evidence photo was uploaded
   */
  static async createReportResolvedNotification({
    userId,
    reportId,
    reportType,
    adminFeedback,
    hasEvidence
  }) {
    try {
      const reportTypeDisplay = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      
      const notification = new Notification({
        userId,
        reportId,
        type: 'report_resolved',
        title: `✅ Issue Fixed: ${reportTypeDisplay}`,
        message: `Great news! The ${reportType} issue you reported has been resolved. Admin feedback: ${adminFeedback}${hasEvidence ? ' (Evidence photo attached)' : ''}`,
        status: 'resolved',
        isRead: false
      });

      await notification.save();
      console.log(`📧 Resolution notification created for user ${userId}`);
      
      return notification;

    } catch (error) {
      console.error('Failed to create resolution notification:', error);
      return null;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        userId,
        isRead: false
      });
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { 
          isRead: true,
          readAt: new Date()
        }
      );
      return result.modifiedCount;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      return 0;
    }
  }

  /**
   * Create a notification when user submits a new report
   * @param {Object} params - Notification parameters
   * @param {String} params.userId - User ID who submitted the report
   * @param {String} params.reportId - Report ID
   * @param {String} params.reportType - Type of report
   */
  static async createReportSubmittedNotification({
    userId,
    reportId,
    reportType
  }) {
    try {
      const reportTypeDisplay = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      
      const notification = new Notification({
        userId,
        reportId,
        type: 'new_report',
        title: `📝 Report Submitted: ${reportTypeDisplay}`,
        message: `Your ${reportType} report has been submitted successfully and is under review. We'll notify you once it's been verified.`,
        status: 'pending',
        isRead: false
      });

      await notification.save();
      console.log(`📧 Report submission notification created for user ${userId}`);
      
      return notification;

    } catch (error) {
      console.error('Failed to create submission notification:', error);
      return null;
    }
  }

  /**
   * Create a notification when user views a report
   * @param {Object} params - Notification parameters
   * @param {String} params.userId - User ID who viewed
   * @param {String} params.reportId - Report ID
   */
  static async createReportViewedNotification({
    userId,
    reportId,
    reportType
  }) {
    try {
      // Only create if user is the report owner
      const reportTypeDisplay = reportType.charAt(0).toUpperCase() + reportType.slice(1);
      
      const notification = new Notification({
        userId,
        reportId,
        type: 'system_alert',
        title: `👁️ Report Viewed`,
        message: `Your ${reportType} report has received a new view from the community.`,
        isRead: false
      });

      await notification.save();
      console.log(`📧 Report viewed notification created for user ${userId}`);
      
      return notification;

    } catch (error) {
      console.error('Failed to create view notification:', error);
      return null;
    }
  }

  /**
   * Create a welcome notification for new users
   * @param {String} userId - User ID
   * @param {String} username - Username
   */
  static async createWelcomeNotification(userId, username) {
    try {
      const notification = new Notification({
        userId,
        type: 'welcome',
        title: `👋 Welcome to Road Alert, ${username}!`,
        message: `Thank you for joining our community. Start reporting road issues to help make our roads safer for everyone. Your reports will be reviewed by our team.`,
        isRead: false
      });

      await notification.save();
      console.log(`📧 Welcome notification created for user ${userId}`);
      
      return notification;

    } catch (error) {
      console.error('Failed to create welcome notification:', error);
      return null;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }
}

module.exports = NotificationService;