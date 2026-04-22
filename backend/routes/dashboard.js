const express = require('express');
const userAuth = require('../middleware/userAuth');
const User = require('../models/User');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const cache = require('../services/cache');

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Get consolidated data for user dashboard (profile, stats, notifications, reports)
 * @access  Private (User)
 */
router.get('/', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `dashboard:${userId}`;
    
    // ⚡ Check cache first (15s TTL)
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`⚡ Cache HIT: dashboard for user ${userId}`);
      return res.json({ ...cached, fromCache: true });
    }

    console.log(`🚀 Fetching consolidated dashboard data for user ${userId}...`);

    // ⚡ Run all dashboard queries in parallel
    const [user, reports, notifications, userUnreadCount, broadcasts, stats] = await Promise.all([
      // 1) User Profile
      User.findById(userId).select('-password').lean(),

      // 2) Recent Reports (limit 5)
      Report.find({ 'reportedBy.id': userId })
        .select('-images.data -evidencePhoto.data')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 3) Recent Notifications (limit 5)
      Notification.find({ userId: userId })
        .populate('reportId', 'type description status')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // 4) User Unread Count
      Notification.countDocuments({ userId: userId, isRead: false }),

      // 5) Active Broadcasts
      Notification.find({
        isBroadcast: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }).sort({ createdAt: -1 }).limit(3).lean(),

      // 6) Report Statistics
      Promise.all([
        Report.countDocuments({ 'reportedBy.id': userId }),
        Report.countDocuments({ 'reportedBy.id': userId, status: 'pending' }),
        Report.countDocuments({ 'reportedBy.id': userId, status: 'verified' }),
        Report.countDocuments({ 'reportedBy.id': userId, status: 'resolved' })
      ])
    ]);

    // Process broadcasts to include isRead for this user
    const processedBroadcasts = broadcasts.map(b => ({
      ...b,
      isRead: !!b.readBy?.some(r => r.userId.toString() === userId.toString())
    }));

    const broadcastUnreadCount = processedBroadcasts.filter(b => !b.isRead).length;

    const response = {
      success: true,
      data: {
        profile: {
          id: user?._id,
          username: user?.username,
          email: user?.email,
          profile: user?.profile,
          lastLogin: user?.lastLogin
        },
        stats: {
          totalReports: stats[0],
          pendingReports: stats[1],
          verifiedReports: stats[2],
          resolvedReports: stats[3]
        },
        notifications: {
          items: [...notifications, ...processedBroadcasts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
          unreadCount: userUnreadCount + broadcastUnreadCount
        },
        reports: {
          items: reports
        }
      },
      timestamp: new Date().toISOString()
    };

    // ⚡ Cache result for 15 seconds
    cache.set(cacheKey, response, 15);

    res.json({ ...response, fromCache: false });

  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while aggregating dashboard data'
    });
  }
});

module.exports = router;
