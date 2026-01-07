const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Unique key for the setting
  key: {
    type: String,
    required: true,
    unique: true
  },
  
  // Setting value (flexible type)
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Setting category
  category: {
    type: String,
    enum: ['general', 'map', 'notifications', 'reports', 'users', 'security'],
    default: 'general'
  },
  
  // Description of the setting
  description: {
    type: String,
    default: ''
  },
  
  // Data type for validation
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object'],
    default: 'string'
  },
  
  // Is this setting visible in UI?
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Last modified by
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for fast lookups
systemSettingsSchema.index({ key: 1 });
systemSettingsSchema.index({ category: 1 });

// Static method to get a setting by key
systemSettingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
systemSettingsSchema.statics.setSetting = async function(key, value, options = {}) {
  const { category = 'general', description = '', dataType = 'string', isPublic = false, adminId = null } = options;
  
  const setting = await this.findOneAndUpdate(
    { key },
    { 
      value, 
      category, 
      description, 
      dataType, 
      isPublic,
      lastModifiedBy: adminId
    },
    { upsert: true, new: true }
  );
  
  return setting;
};

// Static method to get all settings by category
systemSettingsSchema.statics.getByCategory = async function(category) {
  return this.find({ category }).sort({ key: 1 });
};

// Static method to get all public settings
systemSettingsSchema.statics.getPublicSettings = async function() {
  return this.find({ isPublic: true }).select('key value category');
};

// Static method to get multiple settings at once (optimized)
systemSettingsSchema.statics.getMultipleSettings = async function(keys) {
  const settings = await this.find({ key: { $in: keys } });
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
};

// Static method to get all settings as key-value object
systemSettingsSchema.statics.getAllAsObject = async function() {
  const settings = await this.find({});
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
};

// Initialize default settings
systemSettingsSchema.statics.initializeDefaults = async function() {
  const defaults = [
    // ==================== GENERAL SETTINGS ====================
    { key: 'site_name', value: 'BantayDalan', category: 'general', description: 'Site name displayed in the app', dataType: 'string', isPublic: true },
    { key: 'site_description', value: 'Community Road Alert System for Negros Occidental', category: 'general', description: 'Site description for metadata', dataType: 'string', isPublic: true },
    { key: 'site_tagline', value: 'Report. Alert. Protect.', category: 'general', description: 'Site tagline', dataType: 'string', isPublic: true },
    { key: 'contact_email', value: 'support@bantaydalan.com', category: 'general', description: 'Contact email address', dataType: 'string', isPublic: true },
    { key: 'contact_phone', value: '+63 912 345 6789', category: 'general', description: 'Contact phone number', dataType: 'string', isPublic: true },
    { key: 'timezone', value: 'Asia/Manila', category: 'general', description: 'System timezone', dataType: 'string', isPublic: true },
    { key: 'date_format', value: 'MMM DD, YYYY', category: 'general', description: 'Date format for display', dataType: 'string', isPublic: true },
    { key: 'language', value: 'en', category: 'general', description: 'Default language', dataType: 'string', isPublic: true },
    
    // ==================== MAINTENANCE MODE SETTINGS ====================
    { key: 'maintenance_mode', value: false, category: 'general', description: 'Enable maintenance mode', dataType: 'boolean', isPublic: true },
    { key: 'maintenance_message', value: 'We are currently performing scheduled maintenance. Please check back soon.', category: 'general', description: 'Message displayed during maintenance', dataType: 'string', isPublic: true },
    { key: 'maintenance_scheduled_start', value: '', category: 'general', description: 'Scheduled maintenance start time (ISO format)', dataType: 'string', isPublic: true },
    { key: 'maintenance_scheduled_end', value: '', category: 'general', description: 'Scheduled maintenance end time (ISO format)', dataType: 'string', isPublic: true },
    { key: 'maintenance_allow_admins', value: true, category: 'general', description: 'Allow admins to access during maintenance', dataType: 'boolean', isPublic: false },
    
    // ==================== MAP SETTINGS ====================
    { key: 'map_default_center_lat', value: 10.1617, category: 'map', description: 'Default map center latitude', dataType: 'number', isPublic: true },
    { key: 'map_default_center_lng', value: 122.9747, category: 'map', description: 'Default map center longitude', dataType: 'number', isPublic: true },
    { key: 'map_default_zoom', value: 10, category: 'map', description: 'Default map zoom level', dataType: 'number', isPublic: true },
    { key: 'map_style', value: 'streets', category: 'map', description: 'Map style (streets/satellite/dark)', dataType: 'string', isPublic: true },
    { key: 'map_cluster_radius', value: 50, category: 'map', description: 'Marker cluster radius in pixels', dataType: 'number', isPublic: true },
    
    // ==================== REPORT SETTINGS ====================
    { key: 'max_reports_per_day', value: 10, category: 'reports', description: 'Maximum reports a user can submit per day', dataType: 'number', isPublic: true },
    { key: 'require_image', value: true, category: 'reports', description: 'Require at least one image for reports', dataType: 'boolean', isPublic: true },
    { key: 'require_location', value: true, category: 'reports', description: 'Require GPS location for reports', dataType: 'boolean', isPublic: true },
    
    // ==================== USER SETTINGS ====================
    { key: 'allow_user_registration', value: true, category: 'users', description: 'Allow new user registrations', dataType: 'boolean', isPublic: true },
    { key: 'require_email_verification', value: false, category: 'users', description: 'Require email verification for new users', dataType: 'boolean', isPublic: true },
    { key: 'min_password_length', value: 8, category: 'users', description: 'Minimum password length', dataType: 'number', isPublic: true },
    { key: 'session_timeout_minutes', value: 1440, category: 'users', description: 'User session timeout in minutes (0 = never)', dataType: 'number', isPublic: true },
    { key: 'max_login_attempts', value: 5, category: 'users', description: 'Max failed login attempts before lockout', dataType: 'number', isPublic: true },
    { key: 'lockout_duration_minutes', value: 30, category: 'users', description: 'Account lockout duration in minutes', dataType: 'number', isPublic: false },
    
    // ==================== SECURITY SETTINGS ====================
    { key: 'require_strong_passwords', value: true, category: 'security', description: 'Require strong passwords', dataType: 'boolean', isPublic: true },
    { key: 'rate_limiting', value: true, category: 'security', description: 'Enable rate limiting for API requests', dataType: 'boolean', isPublic: false },
    { key: 'rate_limit_requests', value: 100, category: 'security', description: 'Max requests per rate limit window', dataType: 'number', isPublic: false },
    { key: 'rate_limit_window_minutes', value: 15, category: 'security', description: 'Rate limit window in minutes', dataType: 'number', isPublic: false }
  ];
  
  // Remove old/duplicate settings that are no longer needed
  const settingsToRemove = [
    'report_auto_expire_days',
    'report_expiry_days', 
    'enable_anonymous_reports',
    'allow_anonymous_reports',
    'max_images_per_report',
    'auto_verify_threshold',
    'notifications_enabled',
    'email_notifications',
    'sms_notifications',
    'push_notifications',
    'notification_frequency',
    'notification_radius_km',
    'two_factor_auth',
    'ip_whitelist',
    'data_retention_days'
  ];
  
  await this.deleteMany({ key: { $in: settingsToRemove } });
  
  for (const setting of defaults) {
    await this.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  
  console.log('System settings initialized');
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
