const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // First try to find admin
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (admin) {
      if (!admin.isActive) {
        return res.status(401).json({
          error: 'Admin account is deactivated'
        });
      }
      
      // Add admin to request object
      req.admin = {
        id: admin._id,
        username: admin.username,
        role: admin.role
      };
      return next();
    }

    // If not admin, try to find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (user) {
      // Add user to request object
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email
      };
      return next();
    }

    // If neither admin nor user found
    return res.status(401).json({
      error: 'Token is no longer valid'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server error in authentication'
    });
  }
};

module.exports = auth;
