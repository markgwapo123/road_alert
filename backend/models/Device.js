const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'web'],
    required: true
  },
  model: {
    type: String,
    default: null
  },
  osVersion: {
    type: String,
    default: null
  },
  appVersion: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
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

// Compound index for efficient lookups
deviceSchema.index({ userId: 1, token: 1 });
deviceSchema.index({ userId: 1, isActive: 1, lastActive: -1 });

// Update updatedAt before saving
deviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to register or update device
deviceSchema.statics.registerOrUpdate = async function(deviceData) {
  const { userId, token, platform, model, osVersion, appVersion } = deviceData;
  
  // Check if device already exists for this user
  let device = await this.findOne({ userId, token });
  
  if (device) {
    // Update existing device
    device.platform = platform;
    device.model = model;
    device.osVersion = osVersion;
    device.appVersion = appVersion;
    device.lastActive = new Date();
    device.isActive = true;
    await device.save();
    return { device, isNew: false };
  }
  
  // Create new device
  device = await this.create({
    userId,
    token,
    platform,
    model,
    osVersion,
    appVersion,
    lastActive: new Date(),
    isActive: true
  });
  
  return { device, isNew: true };
};

// Static method to get active devices for a user
deviceSchema.statics.getActiveDevicesByUser = async function(userId) {
  return this.find({ 
    userId, 
    isActive: true 
  }).sort({ lastActive: -1 });
};

// Static method to get all active devices (for broadcast)
deviceSchema.statics.getAllActiveDevices = async function() {
  return this.find({ 
    isActive: true 
  }).sort({ lastActive: -1 });
};

// Static method to remove device
deviceSchema.statics.removeDevice = async function(userId, token) {
  return this.findOneAndDelete({ userId, token });
};

// Static method to update token
deviceSchema.statics.updateToken = async function(userId, oldToken, newToken) {
  const device = await this.findOne({ userId, token: oldToken });
  if (!device) return null;
  
  device.token = newToken;
  device.lastActive = new Date();
  await device.save();
  return device;
};

// Static method to mark device as inactive
deviceSchema.statics.markInactive = async function(token) {
  return this.findOneAndUpdate(
    { token },
    { isActive: false, updatedAt: Date.now() }
  );
};

// Static method to remove invalid token
deviceSchema.statics.removeInvalidToken = async function(token) {
  return this.findOneAndDelete({ token });
};

// Static method to update last active
deviceSchema.statics.updateLastActive = async function(userId, token) {
  return this.findOneAndUpdate(
    { userId, token },
    { lastActive: new Date(), updatedAt: Date.now() }
  );
};

module.exports = mongoose.model('Device', deviceSchema);
