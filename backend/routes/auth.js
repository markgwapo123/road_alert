const express = require('express');const express = require('express');

const bcrypt = require('bcryptjs');const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');const jwt = require('jsonwebtoken');

const User = require('../models/User');const User = require('../models/User');

const Admin = require('../models/Admin');const Admin = require('../models/Admin');

const auth = require('../middleware/auth');const auth = require('../middleware/auth');



const router = express.Router();const router = express.Router();



// @route   POST /api/auth/register// @route   POST /api/auth/register

// @desc    Register a new user// @desc    Register a new user

// @access  Public// @access  Public

router.post('/register', async (req, res) => {router.post('/register', async (req, res) => {

    try {    try {

        const { username, email, password } = req.body;        const { username, email, password } = req.body;



        // Validate input        // Validate input

        if (!username || !email || !password) {        if (!username || !email || !password) {

            return res.status(400).json({ error: 'Please enter all fields' });            return res.status(400).json({ error: 'Please enter all fields' });

        }        }



        // Check for existing user by email or username        // Check for existing user by email or username

        let user = await User.findOne({ $or: [{ email }, { username }] });        let user = await User.findOne({ $or: [{ email }, { username }] });

        if (user) {        if (user) {

            return res.status(400).json({ error: 'Username or email already exists' });            return res.status(400).json({ error: 'Username or email already exists' });

        }        }



        // Create new user        // Create new user

        user = new User({        user = new User({

            username,            username,

            email,            email,

            password,            password,

        });        });



        // Password will be hashed automatically by the User model pre-save hook        // Password will be hashed automatically by the User model pre-save hook

        await user.save();        await user.save();



        res.status(201).json({ success: true, message: 'User registered successfully' });        res.status(201).json({ success: true, message: 'User registered successfully' });



    } catch (error) {    } catch (error) {

        console.error('Register error:', error);        console.error('Register error:', error);

        if (error.code === 11000) {        if (error.code === 11000) {

            // Duplicate key error            // Duplicate key error

            return res.status(400).json({ error: 'Username or email already exists' });            return res.status(400).json({ error: 'Username or email already exists' });

        }        }

        res.status(500).json({ error: error.message || 'Server error during registration' });        // Log the error details for debugging

    }        if (error.errors) {

});            Object.keys(error.errors).forEach(key => {

                console.error(`Validation error for ${key}:`, error.errors[key].message);

// @route   POST /api/auth/login            });

// @desc    User or Admin login        }

// @access  Public        res.status(500).json({ error: error.message || 'Server error during registration' });

router.post('/login', async (req, res) => {    }

  try {});

    const { email, username, password } = req.body;

// @route   POST /api/auth/login

    // Validate input// @desc    User or Admin login

    if ((!email && !username) || !password) {// @access  Public

      return res.status(400).json({router.post('/login', async (req, res) => {

        error: 'Email/Username and password are required'  try {

      });    const { email, username, password } = req.body;

    }

    // Validate input

    // Try user login (by email or username)    if ((!email && !username) || !password) {

    let user = null;      return res.status(400).json({

    if (email) {        error: 'Email/Username and password are required'

      user = await User.findOne({ email });      });

    } else if (username) {    }

      user = await User.findOne({ username });

    }    // Try user login (by email or username)

        let user = null;

    if (user) {    if (email) {

      const isMatch = await user.comparePassword(password);      user = await User.findOne({ email });

      if (!isMatch) {    } else if (username) {

        return res.status(401).json({ error: 'Invalid credentials' });      user = await User.findOne({ username });

      }    }    if (user) {

            const isMatch = await user.comparePassword(password);

      // Update last login for user tracking      if (!isMatch) {

      await user.updateLastLogin();        return res.status(401).json({ error: 'Invalid credentials' });

            }

      // Create a JWT for the user      // Update last login for user tracking

      const token = jwt.sign(      await user.updateLastLogin();

        { id: user._id, username: user.username, email: user.email },      // Create a JWT for the user

        process.env.JWT_SECRET || 'your_jwt_secret',      const token = jwt.sign(

        { expiresIn: '7d' }        { id: user._id, username: user.username, email: user.email },

      );        process.env.JWT_SECRET || 'your_jwt_secret',

              { expiresIn: '7d' }

      return res.json({      );

        success: true,      return res.json({

        token,        success: true,

        user: {        token,

          id: user._id,        user: {

          username: user.username,          id: user._id,

          email: user.email,          username: user.username,

          lastLogin: user.lastLogin          email: user.email,

        }          lastLogin: user.lastLogin

      });        }

    }      });

    }

    // Try admin login if user not found

    const admin = await Admin.findOne({     // Check if the user is an admin

      $or: email ? [{ email }] : [{ username }]     let admin = await Admin.findOne({ username });

    });    if (admin) {

          // Check if admin is active

    if (admin) {      if (!admin.isActive) {

      const isMatch = await admin.comparePassword(password);        return res.status(401).json({

      if (!isMatch) {          error: 'Account is deactivated'

        return res.status(401).json({ error: 'Invalid credentials' });        });

      }      }

      

      // Create a JWT for the admin      // Check password

      const token = jwt.sign(      const isMatch = await admin.comparePassword(password);

        {       if (!isMatch) {

          id: admin._id,         return res.status(401).json({

          username: admin.username,           error: 'Invalid credentials'

          email: admin.email,        });

          role: 'admin'      }

        },

        process.env.JWT_SECRET || 'your_jwt_secret',      // Update last login

        { expiresIn: '7d' }      await admin.updateLastLogin();

      );

            // Create JWT token

      return res.json({      const token = jwt.sign(

        success: true,        { 

        token,          id: admin._id, 

        admin: {          username: admin.username,

          id: admin._id,          role: admin.role 

          username: admin.username,        },

          email: admin.email,        process.env.JWT_SECRET,

          role: 'admin'        { expiresIn: process.env.JWT_EXPIRE }

        }      );

      });

    }      return res.json({

        success: true,

    // No user or admin found        token,

    return res.status(401).json({ error: 'Invalid credentials' });        admin: {

          id: admin._id,

  } catch (error) {          username: admin.username,

    console.error('Login error:', error);          role: admin.role,

    res.status(500).json({ error: 'Server error during login' });          email: admin.email,

  }          lastLogin: admin.lastLogin

});        }

      });

// @route   GET /api/auth/verify    }

// @desc    Verify JWT token

// @access  Private    return res.status(401).json({

router.get('/verify', auth, async (req, res) => {      error: 'Invalid credentials'

  try {    });

    // req.user is populated by auth middleware

    res.json({  } catch (error) {

      success: true,    console.error('Login error:', error);

      user: req.user    res.status(500).json({

    });      error: 'Server error during login'

  } catch (error) {    });

    console.error('Verify error:', error);  }

    res.status(500).json({ error: 'Server error during verification' });});

  }

});// @route   GET /api/auth/verify

// @desc    Verify token and get admin info

module.exports = router;// @access  Private
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

module.exports = router;
