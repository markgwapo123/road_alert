const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // Find admin only
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({
        error: 'Access denied. Admin privileges required.'
      });
    }

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
    
    next();

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

    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      error: 'Server error in authentication'
    });
  }
};

module.exports = adminAuth;
