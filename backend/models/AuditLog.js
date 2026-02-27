const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminUsername: {
    type: String,
    required: true
  },
  adminRole: {
    type: String,
    enum: ['super_admin', 'admin_user'],
    required: true
  },
  
  // What action was performed
  action: {
    type: String,
    enum: [
      // Authentication
      'login', 'logout', 'password_change',
      // Report actions
      'report_view', 'report_edit', 'report_verify', 'report_reject', 'report_delete', 'report_resolve',
      // User actions
      'user_view', 'user_freeze', 'user_unfreeze', 'user_delete', 'user_enable', 'user_disable',
      // Admin management
      'admin_create', 'admin_edit', 'admin_delete', 'admin_activate', 'admin_deactivate', 'admin_role_change',
      // System settings
      'settings_view', 'settings_update',
      // News management
      'news_create', 'news_edit', 'news_delete',
      // Override actions (Super Admin only)
      'override_action'
    ],
    required: true
  },
  
  // Category of the action
  category: {
    type: String,
    enum: ['auth', 'reports', 'users', 'admins', 'settings', 'news', 'override'],
    required: true
  },
  
  // Description of what happened
  description: {
    type: String,
    required: true
  },
  
  // Target of the action (if applicable)
  targetType: {
    type: String,
    enum: ['report', 'user', 'admin', 'setting', 'news', 'system', null],
    default: null
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  targetName: {
    type: String,
    default: null
  },
  
  // Additional details
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Previous values (for edits)
  previousValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // New values (for edits)
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Request metadata
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  
  // Status of the action
  status: {
    type: String,
    enum: ['success', 'failed', 'blocked'],
    default: 'success'
  },
  
  // Error message if action failed
  errorMessage: {
    type: String,
    default: null
  },
  
  // Was this an override action by super admin?
  isOverride: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to create audit log entry
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
    return null;
  }
};

// Static method to get logs by admin
auditLogSchema.statics.getByAdmin = async function(adminId, options = {}) {
  const { page = 1, limit = 50, category, action, startDate, endDate } = options;
  
  const filter = { adminId };
  if (category) filter.category = category;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  const logs = await this.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
    
  const total = await this.countDocuments(filter);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

// Static method to get all logs (for super admin)
auditLogSchema.statics.getAllLogs = async function(options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    category, 
    action, 
    adminId,
    startDate, 
    endDate,
    search 
  } = options;
  
  const filter = {};
  if (category) filter.category = category;
  if (action) filter.action = action;
  if (adminId) filter.adminId = adminId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: 'i' } },
      { adminUsername: { $regex: search, $options: 'i' } },
      { targetName: { $regex: search, $options: 'i' } }
    ];
  }
  
  const logs = await this.find(filter)
    .populate('adminId', 'username email role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
    
  const total = await this.countDocuments(filter);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
