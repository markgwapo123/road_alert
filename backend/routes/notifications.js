const express = require('express');
const Notification = require('../models/Notification');
const userAuth = require('../middleware/userAuth');
const cache = require('../services/cache');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications (including broadcasts)
// @access  Private (User)
router.get('/', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false, type = 'all' } = req.query;
    const userId = req.user.id;

    // ⚡ Check cache first (15s TTL) – only cache page 1 with default filters
    const isDefaultRequest = page == 1 && unread_only === 'false' && type === 'all';
    const cacheKey = `notifs:${userId}:${page}:${unread_only}:${type}`;
    if (isDefaultRequest) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`⚡ Cache HIT: notifications for user ${userId}`);
        return res.json({ ...cached, fromCache: true });
      }
    }
    
    // Build filter for user-specific notifications
    const userFilter = { userId: userId };
    if (unread_only === 'true') {
      userFilter.isRead = false;
    }
    if (type !== 'all') {
      userFilter.type = type;
    }

    // Build broadcast filter
    const broadcastFilter = { 
      isBroadcast: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    };

    // ⚡ Run ALL queries in parallel instead of sequentially
    const [userNotifications, broadcastNotifications, userUnreadCount, userTotalCount] = await Promise.all([
      // 1) User-specific notifications
      Notification.find(userFilter)
        .populate('reportId', 'type description status')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),

      // 2) Broadcast announcements
      Notification.find(broadcastFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // 3) Unread count
      Notification.countDocuments({ userId: userId, isRead: false }),

      // 4) Total count for pagination
      Notification.countDocuments(userFilter)
    ]);

    // Mark broadcasts as read/unread based on user's read status
    const processedBroadcasts = broadcastNotifications.map(broadcast => {
      const readEntry = broadcast.readBy?.find(r => r.userId.toString() === userId.toString());
      return {
        ...broadcast,
        isRead: !!readEntry,
        readAt: readEntry?.readAt || null
      };
    });

    // Combine and sort all notifications
    const allNotifications = [...userNotifications, ...processedBroadcasts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    const broadcastUnreadCount = processedBroadcasts.filter(b => !b.isRead).length;
    const totalUnreadCount = userUnreadCount + broadcastUnreadCount;
    const total = userTotalCount + broadcastNotifications.length;

    const response = {
      success: true,
      notifications: allNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore: page < Math.ceil(total / limit)
      },
      unreadCount: totalUnreadCount,
      counts: {
        total: allNotifications.length,
        unread: totalUnreadCount,
        adminResponses: allNotifications.filter(n => n.type === 'admin_response').length,
        statusUpdates: allNotifications.filter(n => n.type === 'status_update').length,
        announcements: allNotifications.filter(n => n.type === 'announcement').length
      }
    };

    // ⚡ Cache the result for 15 seconds
    if (isDefaultRequest) {
      cache.set(cacheKey, response, 15);
    }

    res.json({ ...response, fromCache: false });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching notifications'
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private (User)
router.get('/unread-count', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `notifs:${userId}:unread-count`;
    
    // ⚡ Check cache first (10s TTL)
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);
    
    // Count user-specific unread notifications
    const [userUnreadCount, broadcasts] = await Promise.all([
      Notification.countDocuments({ userId: userId, isRead: false }),
      Notification.find({
        isBroadcast: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }).lean()
    ]);

    const broadcastUnreadCount = broadcasts.filter(b => 
      !b.readBy?.some(r => r.userId.toString() === userId.toString())
    ).length;

    const response = {
      success: true,
      unreadCount: userUnreadCount + broadcastUnreadCount
    };

    // ⚡ Cache for 10 seconds
    cache.set(cacheKey, response, 10);

    res.json(response);

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching unread count'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private (User)
router.put('/:id/read', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First check if it's a broadcast notification
    const broadcast = await Notification.findOne({ 
      _id: req.params.id, 
      isBroadcast: true 
    });

    if (broadcast) {
      // Add user to readBy array if not already there
      const alreadyRead = broadcast.readBy.some(r => r.userId.toString() === userId.toString());
      
      if (!alreadyRead) {
        broadcast.readBy.push({ userId, readAt: new Date() });
        await broadcast.save();
        // ⚡ Invalidate cache
        cache.invalidatePrefix(`notifs:${userId}`);
      }

      return res.json({
        success: true,
        message: 'Broadcast notification marked as read',
        notification: {
          ...broadcast.toObject(),
          isRead: true,
          readAt: new Date()
        }
      });
    }

    // Handle user-specific notification
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: userId },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // ⚡ Invalidate cache
    cache.invalidatePrefix(`notifs:${userId}`);

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notification'
    });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all user notifications as read
// @access  Private (User)
router.put('/read-all', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Mark user-specific notifications as read
    const result = await Notification.updateMany(
      { userId: userId, isRead: false },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    // Mark all broadcasts as read for this user
    const broadcasts = await Notification.find({
      isBroadcast: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    let broadcastsMarked = 0;
    for (const broadcast of broadcasts) {
      const alreadyRead = broadcast.readBy.some(r => r.userId.toString() === userId.toString());
      if (!alreadyRead) {
        broadcast.readBy.push({ userId, readAt: new Date() });
        await broadcast.save();
        broadcastsMarked++;
      }
    }

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount + broadcastsMarked} notifications as read`,
      modifiedCount: result.modifiedCount + broadcastsMarked
    });

    // ⚡ Invalidate cache
    cache.invalidatePrefix(`notifs:${userId}`);

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notifications'
    });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all user notifications as read (alternative endpoint)
// @access  Private (User)
router.post('/mark-all-read', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Mark user-specific notifications as read
    const result = await Notification.updateMany(
      { userId: userId, isRead: false },
      { 
        isRead: true,
        readAt: new Date()
      }
    );

    // Mark all broadcasts as read for this user
    const broadcasts = await Notification.find({
      isBroadcast: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    let broadcastsMarked = 0;
    for (const broadcast of broadcasts) {
      const alreadyRead = broadcast.readBy.some(r => r.userId.toString() === userId.toString());
      if (!alreadyRead) {
        broadcast.readBy.push({ userId, readAt: new Date() });
        await broadcast.save();
        broadcastsMarked++;
      }
    }

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount + broadcastsMarked} notifications as read`,
      modifiedCount: result.modifiedCount + broadcastsMarked
    });

    // ⚡ Invalidate cache
    cache.invalidatePrefix(`notifs:${userId}`);

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating notifications'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private (User)
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // ⚡ Invalidate cache
    cache.invalidatePrefix(`notifs:${req.user.id}`);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting notification'
    });
  }
});

// @route   GET /api/notifications/announcements
// @desc    Get only announcements
// @access  Private (User)
router.get('/announcements', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const announcements = await Notification.find({
      isBroadcast: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));

    const processedAnnouncements = announcements.map(announcement => {
      const readEntry = announcement.readBy.find(r => r.userId.toString() === userId.toString());
      return {
        ...announcement.toObject(),
        isRead: !!readEntry,
        readAt: readEntry?.readAt || null
      };
    });

    res.json({
      success: true,
      announcements: processedAnnouncements
    });

  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching announcements'
    });
  }
});

module.exports = router;