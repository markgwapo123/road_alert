const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Base authentication middleware
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

    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.id).select('-password');
    
    console.log('🔐 Admin authentication check:', {
      adminId: decoded.id,
      adminFound: !!admin,
      adminActive: admin?.isActive,
      adminRole: admin?.role,
      permissionsLength: admin?.permissions?.length
    });
    
    if (!admin) {
      return res.status(401).json({
        error: 'Token is no longer valid'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated'
      });
    }

    // Add admin to request object with full details
    req.admin = {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions || [], // Ensure permissions is always an array
      profile: admin.profile
    };

    console.log('🔐 Admin attached to request:', {
      id: req.admin.id,
      username: req.admin.username,
      role: req.admin.role,
      permissionsCount: req.admin.permissions.length
    });

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

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Server error during authentication'
    });
  }
};

// Check if admin has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        error: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

// Check if admin has super admin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Access denied. Super admin privileges required.'
    });
  }

  next();
};

// Check if admin can manage reports (both roles can)
const canManageReports = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  // Debug logging
  console.log('🔐 canManageReports check:', {
    adminId: req.admin.id,
    username: req.admin.username,
    role: req.admin.role,
    permissions: req.admin.permissions
  });

  // Ensure permissions is an array
  const permissions = req.admin.permissions || [];
  
  const canReview = permissions.includes('review_reports');
  const canAccept = permissions.includes('accept_reports');
  const canReject = permissions.includes('reject_reports');

  console.log('🔐 Permission checks:', {
    canReview,
    canAccept,
    canReject,
    hasAllPermissions: canReview && canAccept && canReject
  });

  if (!canReview || !canAccept || !canReject) {
    return res.status(403).json({
      error: 'Access denied. Report management privileges required.',
      missingPermissions: {
        review: !canReview,
        accept: !canAccept,
        reject: !canReject
      }
    });
  }

  next();
};

// Check if admin can create news posts (both roles can)
const canCreateNews = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.permissions.includes('create_news_posts')) {
    return res.status(403).json({
      error: 'Access denied. News creation privileges required.'
    });
  }

  next();
};

module.exports = {
  auth,
  requirePermission,
  requireSuperAdmin,
  canManageReports,
  canCreateNews
};