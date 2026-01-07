const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/roleAuth');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

        // Send welcome notification to new user
        try {
            await NotificationService.createWelcomeNotification(user._id, user.username);
        } catch (notifError) {
            console.error('Failed to send welcome notification:', notifError);
            // Don't fail registration if notification fails
        }

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
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
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
// @desc    Change user password
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

    // Check if it's an admin request (has req.admin.id) or user request (has req.user.id)
    let user;
    if (req.admin && req.admin.id) {
      // Admin user
      user = await Admin.findById(req.admin.id);
      if (!user) {
        return res.status(404).json({
          error: 'Admin not found'
        });
      }
    } else if (req.user && req.user.id) {
      // Regular user
      const User = require('../models/User');
      user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
    } else {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

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

// @route   GET /api/auth/verification-status
// @desc    Get user verification status
// @access  Private
router.get('/verification-status', require('../middleware/userAuth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // For now, return a basic verification status
    // You can extend this based on your verification logic
    const verification = {
      isVerified: user.isActive, // Using isActive as verification status for now
      verificationDate: user.createdAt,
      status: user.isActive ? 'verified' : 'pending'
    };

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching verification status'
    });
  }
});

// @route   POST /api/auth/social-login
// @desc    Social login with Google
// @access  Public
router.post('/social-login', async (req, res) => {
  try {
    const { provider, token, userData } = req.body;

    let userInfo = null;

    if (provider === 'google') {
      // Verify Google token
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        userInfo = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          provider: 'google'
        };
      } catch (error) {
        return res.status(400).json({ error: 'Invalid Google token' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    if (!userInfo || !userInfo.email) {
      return res.status(400).json({ error: 'Unable to get user information' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      // Create new user from social login
      const username = userInfo.email.split('@')[0] + '_' + userInfo.provider;
      
      user = new User({
        username: username,
        email: userInfo.email,
        password: 'social_login_' + Date.now(), // Dummy password for social users
        socialLogin: {
          provider: userInfo.provider,
          providerId: userInfo.id,
          picture: userInfo.picture
        },
        isActive: true // Auto-activate social login users
      });

      await user.save();
    } else {
      // Update existing user with social login info if not already set
      if (!user.socialLogin || user.socialLogin.provider !== userInfo.provider) {
        user.socialLogin = {
          provider: userInfo.provider,
          providerId: userInfo.id,
          picture: userInfo.picture
        };
        await user.save();
      }
    }

    // Generate JWT token
    const jwtPayload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: 'user'
    };

    const jwtToken = jwt.sign(
      jwtPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        socialLogin: user.socialLogin
      }
    });

  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ error: 'Server error during social login' });
  }
});

// @route   POST /api/auth/google-login
// @desc    Google OAuth login
// @access  Public
router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify Google token
    let userInfo = null;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      userInfo = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: 'google'
      };
    } catch (error) {
      console.error('Google token verification error:', error);
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    if (!userInfo || !userInfo.email) {
      return res.status(400).json({ error: 'Unable to get user information from Google' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      // Create new user from Google login
      const username = userInfo.email.split('@')[0] + '_google';
      
      user = new User({
        username: username,
        email: userInfo.email,
        password: 'google_login_' + Date.now(), // Dummy password for Google users
        socialLogin: {
          provider: 'google',
          providerId: userInfo.id,
          picture: userInfo.picture
        },
        profile: {
          firstName: userInfo.name?.split(' ')[0] || '',
          lastName: userInfo.name?.split(' ').slice(1).join(' ') || '',
          profileImage: userInfo.picture
        }
      });

      await user.save();

      // Send welcome notification to new Google user
      try {
        await NotificationService.createWelcomeNotification(user._id, user.username);
      } catch (notifError) {
        console.error('Failed to send welcome notification:', notifError);
        // Don't fail login if notification fails
      }
    } else if (!user.socialLogin || user.socialLogin.provider !== 'google') {
      // Update existing user with Google login info
      user.socialLogin = {
        provider: 'google',
        providerId: userInfo.id,
        picture: userInfo.picture
      };
      if (!user.profile.profileImage && userInfo.picture) {
        user.profile.profileImage = userInfo.picture;
      }
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        verified: user.profile.verified,
        profile: user.profile,
        socialLogin: user.socialLogin
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Server error during Google login' });
  }
});



module.exports = router;
