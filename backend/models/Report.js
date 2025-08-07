const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['emergency', 'caution', 'construction', 'info', 'safe', 'pothole', 'debris', 'flooding', 'accident', 'other']
  },
  description: {
    type: String,
    required: true,
    maxLength: 500
  },
  location: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    }
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'resolved'],
    default: 'pending'
  },
  images: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],  reportedBy: {
    name: String,
    username: String,  // Add username field for better identification
    email: String,
    phone: String
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: {
    type: String,
    maxLength: 1000
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedAt: Date,
  resolvedAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  affectedLanes: {
    type: Number,
    min: 0,
    max: 10
  },
  estimatedRepairTime: {
    type: String,
    enum: ['1-2 hours', '2-4 hours', '4-8 hours', '1-2 days', '2-7 days', '1-2 weeks', 'unknown']
  }
}, {
  timestamps: true
});

// Index for geospatial queries
reportSchema.index({ 'location.coordinates': '2d' });

// Index for common queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ type: 1, severity: 1 });

module.exports = mongoose.model('Report', reportSchema);
