const express = require('express');
const Admin = require('../models/Admin');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireSuperAdmin, requirePermission, canManageReports } = require('../middleware/roleAuth');

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

// =============== ADMIN MANAGEMENT ROUTES (Super Admin Only) ===============

// @route   POST /api/admin/create-admin-user
// @desc    Create a new admin user (super admin only)
// @access  Private (super admin only)
router.post('/create-admin-user', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, email, profile } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({
        error: 'Username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Admin.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          error: 'Email already exists'
        });
      }
    }

    // Create new admin user
    const newAdmin = new Admin({
      username,
      password,
      email,
      role: 'admin_user',
      createdBy: req.admin.id,
      profile: profile || {}
    });

    await newAdmin.save();

    // Return admin without password
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      message: 'Admin user created successfully',
      admin: adminResponse
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({
      error: 'Server error while creating admin user'
    });
  }
});

// @route   GET /api/admin/admin-users
// @desc    Get all admin users (super admin only)
// @access  Private (super admin only)
router.get('/admin-users', auth, requireSuperAdmin, async (req, res) => {
  try {
    // Get all admin users except super admins
    const adminUsers = await Admin.find({ role: 'admin_user' })
      .populate('createdBy', 'username')
      .select('-password')
      .sort({ createdAt: -1 });

    // Get statistics
    const totalAdminUsers = adminUsers.length;
    const activeAdminUsers = adminUsers.filter(admin => admin.isActive).length;

    res.json({
      adminUsers,
      statistics: {
        total: totalAdminUsers,
        active: activeAdminUsers,
        inactive: totalAdminUsers - activeAdminUsers
      }
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      error: 'Server error while fetching admin users'
    });
  }
});

// @route   PUT /api/admin/admin-user/:id/toggle-status
// @desc    Activate/deactivate admin user (super admin only)
// @access  Private (super admin only)
router.put('/admin-user/:id/toggle-status', auth, requireSuperAdmin, async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.params.id);
    
    if (!adminUser) {
      return res.status(404).json({
        error: 'Admin user not found'
      });
    }

    if (adminUser.role !== 'admin_user') {
      return res.status(400).json({
        error: 'Can only toggle status of admin users'
      });
    }

    // Toggle status
    adminUser.isActive = !adminUser.isActive;
    await adminUser.save();

    const adminResponse = adminUser.toObject();
    delete adminResponse.password;

    res.json({
      message: `Admin user ${adminUser.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: adminResponse
    });

  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({
      error: 'Server error while toggling admin status'
    });
  }
});

// @route   DELETE /api/admin/admin-user/:id
// @desc    Delete admin user (super admin only)
// @access  Private (super admin only)
router.delete('/admin-user/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const adminUser = await Admin.findById(req.params.id);
    
    if (!adminUser) {
      return res.status(404).json({
        error: 'Admin user not found'
      });
    }

    if (adminUser.role !== 'admin_user') {
      return res.status(400).json({
        error: 'Can only delete admin users, not super admins'
      });
    }

    await Admin.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Admin user deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({
      error: 'Server error while deleting admin user'
    });
  }
});

// =============== END ADMIN MANAGEMENT ROUTES ===============

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

// @route   GET /api/admin/activity-logs/:adminId
// @desc    Get activity logs for a specific admin user
// @access  Private (Super Admin only)
router.get('/activity-logs/:adminId', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Find the admin user
    const adminUser = await Admin.findById(adminId);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }

    // Generate mock activity data (replace this with actual activity logging system)
    const mockActivities = [
      {
        action: 'create',
        description: 'Created new news post',
        timestamp: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Road Construction Alert on Highway 95', 
          category: 'Infrastructure', 
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'update',
        description: 'Updated news post content',
        timestamp: new Date(Date.now() - Math.random() * 18 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Traffic Update: Main Street Closure',
          changes: 'Updated closure duration and alternate routes',
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'delete',
        description: 'Deleted outdated news post',
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Emergency Road Closure - Now Resolved',
          reason: 'Event completed, no longer relevant',
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'login',
        description: 'Admin logged into system',
        timestamp: new Date(Date.now() - Math.random() * 36 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: 'Successful login from web dashboard'
      },
      {
        action: 'create',
        description: 'Published urgent traffic alert',
        timestamp: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'URGENT: Bridge Collapse on Route 42',
          category: 'Emergency Alert', 
          priority: 'high',
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'update',
        description: 'Modified news post attachments',
        timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Weekly Road Maintenance Schedule',
          changes: 'Added new photos and updated PDF schedule',
          attachmentsAdded: 3,
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'update',
        description: 'Updated report status',
        timestamp: new Date(Date.now() - Math.random() * 72 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { reportId: 'REP123456', oldStatus: 'pending', newStatus: 'verified' }
      },
      {
        action: 'create',
        description: 'Posted community announcement',
        timestamp: new Date(Date.now() - Math.random() * 84 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'New Mobile App Features Available',
          category: 'Community Update', 
          targetAudience: 'All Users',
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'delete',
        description: 'Removed inappropriate news comment',
        timestamp: new Date(Date.now() - Math.random() * 96 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Traffic Safety Tips',
          reason: 'Spam content',
          commentId: 'CMT_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'create',
        description: 'Published weekly traffic report',
        timestamp: new Date(Date.now() - Math.random() * 108 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: { 
          postTitle: 'Weekly Traffic Analysis - November 2025',
          category: 'Reports', 
          dataPoints: 15,
          postId: 'NEWS_' + Math.floor(Math.random() * 10000)
        }
      },
      {
        action: 'logout',
        description: 'Admin logged out of system',
        timestamp: new Date(Date.now() - Math.random() * 120 * 60 * 60 * 1000),
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        details: 'Session ended normally'
      }
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // In a real implementation, you would fetch from an ActivityLog model:
    // const activities = await ActivityLog.find({ adminId })
    //   .sort({ timestamp: -1 })
    //   .limit(50)
    //   .lean();

    res.json({
      success: true,
      activities: mockActivities,
      admin: {
        username: adminUser.username,
        email: adminUser.email,
        profile: adminUser.profile
      }
    });

  } catch (error) {
    console.error('Activity logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching activity logs'
    });
  }
});

module.exports = router;
