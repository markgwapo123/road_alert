const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please enter all fields' });
        }

        // Check for existing user by email or username
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password,
        });

        // Password will be hashed automatically by the User model pre-save hook
        await user.save();

        res.status(201).json({ success: true, message: 'User registered successfully' });

    } catch (error) {
        console.error('Register error:', error);
        if (error.code === 11000) {
            // Duplicate key error
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        // Log the error details for debugging
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`Validation error for ${key}:`, error.errors[key].message);
            });
        }
        res.status(500).json({ error: error.message || 'Server error during registration' });
    }
});

// @route   POST /api/auth/login
// @desc    User or Admin login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate input
    if ((!email && !username) || !password) {
      return res.status(400).json({
        error: 'Email/Username and password are required'
      });
    }

    // Try user login (by email or username)
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }    if (user) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      // Update last login for user tracking
      await user.updateLastLogin();
      // Create a JWT for the user
      const token = jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin
        }
      });
    }

    // Check if the user is an admin
    let admin = await Admin.findOne({ username });
    if (admin) {
      // Check if admin is active
      if (!admin.isActive) {
        return res.status(401).json({
          error: 'Account is deactivated'
        });
      }

      // Check password
      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Update last login
      await admin.updateLastLogin();

      // Create JWT token
      const token = jwt.sign(
        { 
          id: admin._id, 
          username: admin.username,
          role: admin.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      return res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          email: admin.email,
          lastLogin: admin.lastLogin
        }
      });
    }

    return res.status(401).json({
      error: 'Invalid credentials'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/verify
// @desc    Verify token and get admin info
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found'
      });
    }    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        email: admin.email,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        permissions: admin.permissions,
        profile: admin.profile,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Server error during verification'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout admin (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   PUT /api/auth/change-password
// @desc    Change admin password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    const admin = await Admin.findById(req.admin.id);
    
    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server error during password change'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update admin profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { email, profile } = req.body;

    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found'
      });
    }

    // Update fields if provided
    if (email !== undefined) admin.email = email;
    if (profile) {
      admin.profile = {
        ...admin.profile,
        ...profile
      };
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        profile: admin.profile,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error during profile update'
    });
  }
});

module.exports = router;
