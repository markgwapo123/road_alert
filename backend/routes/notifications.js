const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for the current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    res.json({
      success: true,
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Server error while fetching notifications'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      error: 'Server error while updating notification'
    });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read for the current user
// @access  Private
router.post('/mark-all-read', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id;

    await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      error: 'Server error while updating notifications'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id;
    const notificationId = req.params.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Server error while deleting notification'
    });
  }
});

module.exports = router;
