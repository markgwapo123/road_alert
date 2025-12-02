const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'create', 'update', 'delete', 'view', 'approve', 'reject', 'other']
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Can store any object/data
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  resourceType: {
    type: String, // e.g., 'report', 'user', 'admin', 'news'
    default: null
  },
  resourceId: {
    type: String, // ID of the resource that was acted upon
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ActivityLogSchema.index({ adminId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);