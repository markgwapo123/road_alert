const express = require('express');
const Admin = require('../models/Admin');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get basic stats
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const verifiedReports = await Report.countDocuments({ status: 'verified' });
    const rejectedReports = await Report.countDocuments({ status: 'rejected' });

    // Get recent reports
    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type location.address status severity createdAt reportedBy.name');

    // Get high priority reports
    const highPriorityReports = await Report.find({
      severity: 'high',
      status: { $in: ['pending', 'verified'] }
    }).countDocuments();

    res.json({
      success: true,
      dashboard: {
        stats: {
          totalReports,
          pendingReports,
          verifiedReports,
          rejectedReports,
          highPriorityReports
        },
        recentReports
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Server error while fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/app-users
// @desc    Get all app users with online status
// @access  Private (admin only)
router.get('/app-users', auth, async (req, res) => {
  try {
    // Get all users with basic info and activity status
    const users = await User.find({}, {
      password: 0 // Exclude password field
    }).sort({ createdAt: -1 });

    // Process users to include online status
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      
      // Calculate online status (active within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isOnline = user.lastActivity && user.lastActivity > fiveMinutesAgo;
      
      return {
        ...userObj,
        isOnline,
        lastActivityTime: user.lastActivity,
        onlineStatus: isOnline ? 'Online' : 'Offline',
        isFrozen: user.isFrozen || false,
        frozenAt: user.frozenAt,
        canSubmitReports: !user.isFrozen && user.isActive
      };
    });

    // Get user statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive).length;
    const onlineUsers = usersWithStatus.filter(user => user.isOnline).length;
    const frozenUsers = users.filter(user => user.isFrozen).length;

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        stats: {
          totalUsers,
          activeUsers,
          onlineUsers,
          offlineUsers: totalUsers - onlineUsers,
          frozenUsers
        }
      }
    });

  } catch (error) {
    console.error('Get app users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/admin/user-reports/:userId
// @desc    Get all reports submitted by a specific user
// @access  Private (admin only)
router.get('/user-reports/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get all reports by this user, sorted by most recent first
    const reports = await Report.find({ 'reportedBy.id': userId })
      .sort({ createdAt: -1 })
      .select('type description location status severity createdAt images updatedAt reportedBy');

    // Get user's report statistics
    const totalReports = reports.length;
    const pendingReports = reports.filter(report => report.status === 'pending').length;
    const verifiedReports = reports.filter(report => report.status === 'verified').length;
    const rejectedReports = reports.filter(report => report.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        reports: reports,
        stats: {
          totalReports,
          pendingReports,
          verifiedReports,
          rejectedReports
        }
      }
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user reports'
    });
  }
});

// @route   PATCH /api/admin/user-freeze/:userId
// @desc    Freeze or unfreeze a user account
// @access  Private (admin only)
router.patch('/user-freeze/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isFrozen } = req.body;

    // Verify the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update the user's freeze status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        isFrozen: isFrozen,
        frozenAt: isFrozen ? new Date() : null,
        frozenBy: isFrozen ? req.admin.id : null
      },
      { new: true }
    ).select('-password');

    // Log the admin action
    console.log(`Admin ${req.admin.email} ${isFrozen ? 'froze' : 'unfroze'} user ${user.email}`);

    res.json({
      success: true,
      message: `User account ${isFrozen ? 'frozen' : 'unfrozen'} successfully`,
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          isFrozen: updatedUser.isFrozen,
          frozenAt: updatedUser.frozenAt
        }
      }
    });

  } catch (error) {
    console.error('Freeze user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating user freeze status'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all admin users
// @access  Private (admin only)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }

    const users = await Admin.find().select('-password');

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Server error while fetching users'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new admin user
// @access  Private (admin only)
router.post('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }

    const { username, password, email, role, profile } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingUser = await Admin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        error: 'Username already exists'
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      username,
      password,
      email,
      role: role || 'moderator',
      profile
    });

    await newAdmin.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = newAdmin.toObject();

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Server error while creating user'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update admin user
// @access  Private (admin only)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }

    const { isActive, role, profile } = req.body;

    const user = await Admin.findByIdAndUpdate(
      req.params.id,
      { isActive, role, profile },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Server error while updating user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete admin user
// @access  Private (admin only)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.admin.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }

    // Prevent self-deletion
    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    const user = await Admin.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Server error while deleting user'
    });  }
});

// @route   PUT /api/admin/profile
// @desc    Update admin profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { email, profile } = req.body;

    const updateData = {};
    if (email) updateData.email = email;
    if (profile) updateData.profile = profile;

    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: admin
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error while updating profile'
    });
  }
});

module.exports = router;
