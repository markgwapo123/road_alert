const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET /api/users/profile/:userId
// @desc    Get user profile by ID (public info only)
// @access  Public
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user by ID, excluding sensitive information
    const user = await User.findById(userId).select('-password -email -verification.documents -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return safe user information
    const safeUserInfo = {
      _id: user._id,
      username: user.username,
      fullName: user.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : user.username,
      isVerified: user.isVerified,
      profile: {
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName
      },
      joinedAt: user.createdAt
    };

    res.json({
      success: true,
      data: safeUserInfo
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user profile'
    });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching user profile'
    });
  }
});

module.exports = router;
