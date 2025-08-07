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

// @route   GET /api/auth/me
// @desc    Get current user/admin profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Check if it's an admin first
    if (req.admin && req.admin.id) {
      const admin = await Admin.findById(req.admin.id).select('-password');
      if (admin) {
        return res.json({
          success: true,
          type: 'admin',
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          permissions: admin.permissions,
          profile: admin.profile,
          createdAt: admin.createdAt
        });
      }
    }
    
    // Check if it's a regular user
    if (req.user && req.user.id) {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        const response = {
          success: true,
          type: 'user',
          id: user._id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          isVerified: user.isVerified || false,
          verification: {
            status: user.verification?.status || 'pending'
          }
        };

        // Include verification details if user is verified
        if (user.isVerified && user.verification?.status === 'approved' && user.verification?.documents) {
          response.verificationData = {
            firstName: user.verification.documents.firstName,
            lastName: user.verification.documents.lastName,
            phone: user.verification.documents.phone,
            address: user.verification.documents.address,
            idType: user.verification.documents.idType,
            verifiedAt: user.verification.reviewedAt,
            submittedAt: user.verification.submittedAt
          };
        }

        return res.json(response);
      }
    }
    
    return res.status(404).json({
      error: 'User not found'
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error while fetching profile'
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

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    // Generate a password reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, type: 'password-reset' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    // In a real application, you would send an email here
    // For now, we'll just log the reset token and return a success message
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    console.log(`🔗 Reset link: http://localhost:5176/reset-password?token=${resetToken}`);

    // TODO: Implement email sending service (nodemailer, SendGrid, etc.)
    // await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Server error during password reset request'
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the password (it will be hashed automatically by the pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Server error during password reset'
    });
  }
});

// @route   POST /api/auth/submit-verification
// @desc    Submit user verification documents
// @access  Private (User)
router.post('/submit-verification', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, idNumber, idType } = req.body;
    
    // Find user (not admin)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update user verification information
    user.verification = {
      status: 'submitted',
      submittedAt: new Date(),
      documents: {
        firstName,
        lastName,
        phone,
        address,
        idNumber,
        idType
      }
    };

    await user.save();

    res.json({
      success: true,
      message: 'Verification documents submitted successfully',
      verification: {
        status: user.verification.status,
        submittedAt: user.verification.submittedAt
      }
    });

  } catch (error) {
    console.error('Verification submission error:', error);
    res.status(500).json({
      error: 'Server error during verification submission'
    });
  }
});

// @route   GET /api/auth/verification-status
// @desc    Get user verification status
// @access  Private (User)
router.get('/verification-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      verification: user.verification || { status: 'pending' }
    });

  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({
      error: 'Server error getting verification status'
    });
  }
});

module.exports = router;
