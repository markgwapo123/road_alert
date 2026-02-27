const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

// =============== ROLE-BASED ACCESS CONTROL (RBAC) DEFINITIONS ===============

// Define all permissions
const PERMISSIONS = {
  // Report permissions
  REPORT_VIEW: 'report_view',
  REPORT_EDIT: 'report_edit',
  REPORT_VERIFY: 'report_verify',
  REPORT_REJECT: 'report_reject',
  REPORT_DELETE: 'report_delete',
  REPORT_RESOLVE: 'report_resolve',
  
  // User permissions
  USER_VIEW: 'user_view',
  USER_FREEZE: 'user_freeze',
  USER_DELETE: 'user_delete',
  
  // Admin permissions
  ADMIN_VIEW: 'admin_view',
  ADMIN_CREATE: 'admin_create',
  ADMIN_EDIT: 'admin_edit',
  ADMIN_DELETE: 'admin_delete',
  ADMIN_ROLE_CHANGE: 'admin_role_change',
  
  // System permissions
  SETTINGS_VIEW: 'settings_view',
  SETTINGS_UPDATE: 'settings_update',
  ANALYTICS_VIEW: 'analytics_view',
  AUDIT_LOGS_VIEW: 'audit_logs_view',
  
  // News permissions
  NEWS_CREATE: 'news_create',
  NEWS_EDIT: 'news_edit',
  NEWS_DELETE: 'news_delete',
  
  // Override permission (Super Admin only)
  OVERRIDE: 'override'
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  super_admin: [
    // All report permissions
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EDIT,
    PERMISSIONS.REPORT_VERIFY,
    PERMISSIONS.REPORT_REJECT,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.REPORT_RESOLVE,
    // All user permissions
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_FREEZE,
    PERMISSIONS.USER_DELETE,
    // All admin permissions
    PERMISSIONS.ADMIN_VIEW,
    PERMISSIONS.ADMIN_CREATE,
    PERMISSIONS.ADMIN_EDIT,
    PERMISSIONS.ADMIN_DELETE,
    PERMISSIONS.ADMIN_ROLE_CHANGE,
    // All system permissions
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.AUDIT_LOGS_VIEW,
    // All news permissions
    PERMISSIONS.NEWS_CREATE,
    PERMISSIONS.NEWS_EDIT,
    PERMISSIONS.NEWS_DELETE,
    // Override permission
    PERMISSIONS.OVERRIDE
  ],
  admin_user: [
    // Limited report permissions (no delete)
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EDIT,
    PERMISSIONS.REPORT_VERIFY,
    PERMISSIONS.REPORT_REJECT,
    PERMISSIONS.REPORT_RESOLVE,
    // Limited user permissions (view and freeze only, no delete)
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_FREEZE,
    // No admin management permissions
    // No system settings permissions
    // Analytics view only
    PERMISSIONS.ANALYTICS_VIEW,
    // News permissions
    PERMISSIONS.NEWS_CREATE,
    PERMISSIONS.NEWS_EDIT,
    PERMISSIONS.NEWS_DELETE
  ]
};

// Helper function to check if a role has a permission
const roleHasPermission = (role, permission) => {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
};

// Helper function to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
};

// Helper function to create audit log
const createAuditLog = async (req, action, category, description, options = {}) => {
  if (!req.admin) return null;
  
  try {
    return await AuditLog.log({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      adminRole: req.admin.role,
      action,
      category,
      description,
      targetType: options.targetType || null,
      targetId: options.targetId || null,
      targetName: options.targetName || null,
      details: options.details || {},
      previousValues: options.previousValues || null,
      newValues: options.newValues || null,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || null,
      status: options.status || 'success',
      errorMessage: options.errorMessage || null,
      isOverride: options.isOverride || false
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

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
    const admin = await Admin.findById(decoded.id).select('-password').maxTimeMS(5000);
    
    // Temporarily disabled verbose logging to reduce console noise
    // console.log('🔐 Admin authentication check:', {
    //   adminId: decoded.id,
    //   adminFound: !!admin,
    //   adminActive: admin?.isActive,
    //   adminRole: admin?.role,
    //   permissionsLength: admin?.permissions?.length
    // });
    
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

    // Get role-based permissions
    const rolePermissions = ROLE_PERMISSIONS[admin.role] || [];

    // Add admin to request object with full details
    req.admin = {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions || [], // Legacy permissions from DB
      rolePermissions: rolePermissions, // Role-based permissions
      allPermissions: [...new Set([...(admin.permissions || []), ...rolePermissions])],
      profile: admin.profile,
      isSuperAdmin: admin.role === 'super_admin'
    };

    // Temporarily disabled verbose logging
    // console.log('🔐 Admin attached to request:', {
    //   id: req.admin.id,
    //   username: req.admin.username,
    //   role: req.admin.role,
    //   isSuperAdmin: req.admin.isSuperAdmin,
    //   permissionsCount: req.admin.allPermissions.length
    // });

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

// Check if admin has specific permission (RBAC-based)
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Super admin always has all permissions
    if (req.admin.isSuperAdmin) {
      return next();
    }

    // Check role-based permission
    if (!roleHasPermission(req.admin.role, permission)) {
      // Log the blocked action
      createAuditLog(req, 'blocked_action', 'auth', 
        `Attempted action requiring permission: ${permission}`, {
          status: 'blocked',
          details: { requiredPermission: permission }
        }
      );
      
      return res.status(403).json({
        error: `Access denied. Required permission: ${permission}`,
        requiredPermission: permission
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
    // Log the blocked action
    createAuditLog(req, 'blocked_action', 'auth', 
      'Attempted action requiring Super Admin privileges', {
        status: 'blocked',
        details: { requiredRole: 'super_admin', actualRole: req.admin.role }
      }
    );
    
    return res.status(403).json({
      error: 'Access denied. Super admin privileges required.'
    });
  }

  next();
};

// Check if admin can manage reports (both roles can, but with different permissions)
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
    isSuperAdmin: req.admin.isSuperAdmin
  });

  // Super admin always has access
  if (req.admin.isSuperAdmin) {
    return next();
  }

  // Check role-based permissions for report management
  const canView = roleHasPermission(req.admin.role, PERMISSIONS.REPORT_VIEW);
  const canEdit = roleHasPermission(req.admin.role, PERMISSIONS.REPORT_EDIT);
  const canVerify = roleHasPermission(req.admin.role, PERMISSIONS.REPORT_VERIFY);
  const canReject = roleHasPermission(req.admin.role, PERMISSIONS.REPORT_REJECT);

  console.log('🔐 Report permission checks:', {
    canView,
    canEdit,
    canVerify,
    canReject
  });

  if (!canView) {
    return res.status(403).json({
      error: 'Access denied. Report viewing privileges required.'
    });
  }

  next();
};

// Check if admin can delete reports (Super Admin only)
const canDeleteReports = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.isSuperAdmin && !roleHasPermission(req.admin.role, PERMISSIONS.REPORT_DELETE)) {
    createAuditLog(req, 'blocked_action', 'reports', 
      'Attempted to delete report without permission', {
        status: 'blocked',
        targetType: 'report',
        targetId: req.params.id
      }
    );
    
    return res.status(403).json({
      error: 'Access denied. Only Super Admins can delete reports.'
    });
  }

  next();
};

// Check if admin can delete users (Super Admin only)
const canDeleteUsers = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.isSuperAdmin) {
    createAuditLog(req, 'blocked_action', 'users', 
      'Attempted to delete user without permission', {
        status: 'blocked',
        targetType: 'user',
        targetId: req.params.id || req.params.userId
      }
    );
    
    return res.status(403).json({
      error: 'Access denied. Only Super Admins can delete users.'
    });
  }

  next();
};

// Check if admin can manage other admins (Super Admin only)
const canManageAdmins = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.isSuperAdmin) {
    createAuditLog(req, 'blocked_action', 'admins', 
      'Attempted admin management action without permission', {
        status: 'blocked',
        details: { attemptedAction: req.method + ' ' + req.path }
      }
    );
    
    return res.status(403).json({
      error: 'Access denied. Only Super Admins can manage other admin accounts.'
    });
  }

  next();
};

// Check if admin can access system settings (Super Admin only)
const canAccessSettings = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.isSuperAdmin) {
    createAuditLog(req, 'blocked_action', 'settings', 
      'Attempted to access system settings without permission', {
        status: 'blocked'
      }
    );
    
    return res.status(403).json({
      error: 'Access denied. Only Super Admins can access system settings.'
    });
  }

  next();
};

// Check if admin can view audit logs (Super Admin only)
const canViewAuditLogs = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.admin.isSuperAdmin) {
    return res.status(403).json({
      error: 'Access denied. Only Super Admins can view audit logs.'
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

  if (!roleHasPermission(req.admin.role, PERMISSIONS.NEWS_CREATE)) {
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
  canDeleteReports,
  canDeleteUsers,
  canManageAdmins,
  canAccessSettings,
  canViewAuditLogs,
  canCreateNews,
  createAuditLog,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  roleHasPermission
};