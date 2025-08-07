const express = require('express');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

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

// @route   GET /api/admin/reports/pending
// @desc    Get pending reports for admin review
// @access  Private
router.get('/reports/pending', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, severity, type } = req.query;

    // Build filter for pending reports
    const filter = { status: 'pending' };
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    // Get pending reports with pagination
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('submittedBy', 'username email')
      .exec();

    // Get total count for pagination
    const totalReports = await Report.countDocuments(filter);

    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        hasNextPage: page < Math.ceil(totalReports / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get pending reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching pending reports'
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

// @route   GET /api/admin/verifications
// @desc    Get all user verification requests
// @access  Private (Admin only)
router.get('/verifications', adminAuth, async (req, res) => {
  try {
    const { status = 'submitted' } = req.query;
    
    const users = await User.find({
      'verification.status': status
    }).select('username email verification createdAt')
      .sort({ 'verification.submittedAt': -1 });

    res.json({
      success: true,
      verifications: users
    });

  } catch (error) {
    console.error('Get verifications error:', error);
    res.status(500).json({
      error: 'Server error while fetching verifications'
    });
  }
});

// @route   GET /api/admin/verifications/:userId
// @desc    Get specific user verification details
// @access  Private (Admin only)
router.get('/verifications/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email verification createdAt');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({
      error: 'Server error while fetching verification details'
    });
  }
});

// @route   PUT /api/admin/verifications/:userId
// @desc    Approve or reject user verification
// @access  Private (Admin only)
router.put('/verifications/:userId', adminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be approved or rejected'
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update verification status
    user.verification.status = status;
    user.verification.reviewedAt = new Date();
    user.verification.reviewedBy = req.admin.id;
    if (notes) {
      user.verification.notes = notes;
    }

    // Update isVerified field based on status
    if (status === 'approved') {
      user.isVerified = true;
    } else if (status === 'rejected') {
      user.isVerified = false;
    }

    await user.save();

    // Create notification for user about verification status change
    const Notification = require('../models/Notification');
    const Admin = require('../models/Admin');
    
    // Get admin name for personalized notification
    const admin = await Admin.findById(req.admin.id);
    const adminName = admin ? admin.username : 'Admin';
    
    await Notification.notifyVerificationStatus(user._id, status, adminName);

    res.json({
      success: true,
      message: `User verification ${status} successfully`,
      verification: user.verification
    });

  } catch (error) {
    console.error('Update verification error:', error);
    res.status(500).json({
      error: 'Server error while updating verification'
    });
  }
});

// @route   GET /api/admin/verification-stats
// @desc    Get verification statistics
// @access  Private (Admin only)
router.get('/verification-stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      pending: await User.countDocuments({ 'verification.status': 'pending' }),
      submitted: await User.countDocuments({ 'verification.status': 'submitted' }),
      approved: await User.countDocuments({ 'verification.status': 'approved' }),
      rejected: await User.countDocuments({ 'verification.status': 'rejected' })
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get verification stats error:', error);
    res.status(500).json({
      error: 'Server error while fetching verification stats'
    });
  }
});

module.exports = router;
