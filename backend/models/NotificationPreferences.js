const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  preferences: {
    verifiedReports: {
      type: Boolean,
      default: true
    },
    barangayAnnouncements: {
      type: Boolean,
      default: true
    },
    emergencyAlerts: {
      type: Boolean,
      default: true
    },
    systemNotifications: {
      type: Boolean,
      default: true
    },
    adminResponses: {
      type: Boolean,
      default: true
    },
    statusUpdates: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt before saving
notificationPreferencesSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get or create preferences for a user
notificationPreferencesSchema.statics.getOrCreate = async function(userId) {
  let preferences = await this.findOne({ userId });
  
  if (!preferences) {
    preferences = await this.create({ userId });
  }
  
  return preferences;
};

// Static method to update preferences
notificationPreferencesSchema.statics.updatePreferences = async function(userId, newPreferences) {
  return this.findOneAndUpdate(
    { userId },
    { 
      preferences: newPreferences,
      updatedAt: Date.now()
    },
    { 
      new: true, 
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
};

// Static method to check if user should receive notification type
notificationPreferencesSchema.statics.shouldReceive = async function(userId, notificationType) {
  const preferences = await this.findOne({ userId });
  
  if (!preferences) return true; // Default to true if no preferences set
  
  const prefs = preferences.preferences;
  
  switch (notificationType) {
    case 'report_verified':
    case 'verified_report':
      return prefs.verifiedReports;
    case 'announcement':
    case 'barangay_announcement':
      return prefs.barangayAnnouncements;
    case 'emergency':
    case 'emergency_alert':
      return prefs.emergencyAlerts;
    case 'system':
    case 'system_alert':
      return prefs.systemNotifications;
    case 'admin_response':
      return prefs.adminResponses;
    case 'status_update':
    case 'report_status_update':
      return prefs.statusUpdates;
    default:
      return true; // Default to true for unknown types
  }
};

module.exports = mongoose.model('NotificationPreferences', notificationPreferencesSchema);
