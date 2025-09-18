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