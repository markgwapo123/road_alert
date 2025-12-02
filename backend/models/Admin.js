const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 50
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin_user'],
    default: 'admin_user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  permissions: [{
    type: String,
    enum: [
      'manage_admins',        // Only super_admin
      'review_reports',       // Both roles
      'accept_reports',       // Both roles  
      'reject_reports',       // Both roles
      'create_news_posts',    // Both roles
      'manage_users',         // Only super_admin
      'view_analytics',       // Only super_admin
      'system_settings'       // Only super_admin
    ]
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null // null for super admin (self-created)
  },
  profile: {
    firstName: String,
    lastName: String,
    department: String,
    phone: String
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Set default permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    if (this.role === 'super_admin') {
      this.permissions = [
        'manage_admins',
        'review_reports', 
        'accept_reports',
        'reject_reports',
        'create_news_posts',
        'manage_users',
        'view_analytics',
        'system_settings'
      ];
    } else if (this.role === 'admin_user') {
      this.permissions = [
        'review_reports',
        'accept_reports', 
        'reject_reports',
        'create_news_posts'
      ];
    }
  }
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
adminSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

module.exports = mongoose.model('Admin', adminSchema);
