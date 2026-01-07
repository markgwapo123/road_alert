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

// Initialize default settings
systemSettingsSchema.statics.initializeDefaults = async function() {
  const defaults = [
    // General settings
    { key: 'site_name', value: 'BantayDalan', category: 'general', description: 'Site name displayed in the app', dataType: 'string', isPublic: true },
    { key: 'site_tagline', value: 'Community Road Alert System', category: 'general', description: 'Site tagline', dataType: 'string', isPublic: true },
    { key: 'contact_email', value: 'admin@bantaydalan.com', category: 'general', description: 'Contact email address', dataType: 'string', isPublic: true },
    { key: 'maintenance_mode', value: false, category: 'general', description: 'Enable maintenance mode', dataType: 'boolean', isPublic: true },
    
    // Map settings
    { key: 'map_default_center_lat', value: 9.8500, category: 'map', description: 'Default map center latitude', dataType: 'number', isPublic: true },
    { key: 'map_default_center_lng', value: 122.4000, category: 'map', description: 'Default map center longitude', dataType: 'number', isPublic: true },
    { key: 'map_default_zoom', value: 12, category: 'map', description: 'Default map zoom level', dataType: 'number', isPublic: true },
    { key: 'map_cluster_radius', value: 50, category: 'map', description: 'Marker cluster radius in pixels', dataType: 'number', isPublic: true },
    
    // Notification settings
    { key: 'notifications_enabled', value: true, category: 'notifications', description: 'Enable push notifications', dataType: 'boolean', isPublic: false },
    { key: 'email_notifications', value: true, category: 'notifications', description: 'Enable email notifications', dataType: 'boolean', isPublic: false },
    { key: 'notification_radius_km', value: 5, category: 'notifications', description: 'Radius for nearby report notifications (km)', dataType: 'number', isPublic: false },
    
    // Report settings
    { key: 'report_auto_expire_days', value: 30, category: 'reports', description: 'Days until reports auto-expire', dataType: 'number', isPublic: false },
    { key: 'max_images_per_report', value: 5, category: 'reports', description: 'Maximum images per report', dataType: 'number', isPublic: true },
    { key: 'require_image_for_report', value: false, category: 'reports', description: 'Require at least one image for reports', dataType: 'boolean', isPublic: true },
    { key: 'enable_anonymous_reports', value: false, category: 'reports', description: 'Allow anonymous report submissions', dataType: 'boolean', isPublic: true },
    
    // User settings
    { key: 'allow_user_registration', value: true, category: 'users', description: 'Allow new user registrations', dataType: 'boolean', isPublic: true },
    { key: 'require_email_verification', value: false, category: 'users', description: 'Require email verification for new users', dataType: 'boolean', isPublic: false },
    { key: 'max_reports_per_day', value: 10, category: 'users', description: 'Maximum reports a user can submit per day', dataType: 'number', isPublic: false },
    
    // Security settings
    { key: 'session_timeout_minutes', value: 1440, category: 'security', description: 'Admin session timeout in minutes', dataType: 'number', isPublic: false },
    { key: 'max_login_attempts', value: 5, category: 'security', description: 'Max failed login attempts before lockout', dataType: 'number', isPublic: false },
    { key: 'lockout_duration_minutes', value: 30, category: 'security', description: 'Account lockout duration in minutes', dataType: 'number', isPublic: false },
    { key: 'require_strong_passwords', value: true, category: 'security', description: 'Require strong passwords', dataType: 'boolean', isPublic: false }
  ];
  
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
