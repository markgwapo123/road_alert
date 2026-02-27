const mongoose = require('mongoose');

const newsPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  content: {
    type: String,
    required: true,
    maxLength: 2000
  },
  type: {
    type: String,
    enum: ['announcement', 'safety_tip', 'road_update', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null // null means no expiry
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'active_users', 'new_users'],
    default: 'all'
  },
  views: {
    type: Number,
    default: 0
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Add index for efficient queries
newsPostSchema.index({ publishDate: -1 });
newsPostSchema.index({ isActive: 1, publishDate: -1 });
newsPostSchema.index({ type: 1, isActive: 1 });
newsPostSchema.index({ priority: 1, isActive: 1 });

// Virtual to check if post is expired
newsPostSchema.virtual('isExpired').get(function() {
  return this.expiryDate && this.expiryDate < new Date();
});

// Method to increment view count
newsPostSchema.methods.addView = function(userId = null) {
  let shouldIncrementView = false;
  
  if (userId) {
    // Check if user already viewed this post
    const existingView = this.viewedBy.find(view => 
      view.user && view.user.toString() === userId.toString()
    );
    
    if (!existingView) {
      this.viewedBy.push({
        user: userId,
        viewedAt: new Date()
      });
      shouldIncrementView = true; // Only increment for new user views
    }
  } else {
    // If no userId provided, still increment (for anonymous views)
    shouldIncrementView = true;
  }
  
  if (shouldIncrementView) {
    this.views += 1;
  }
  
  return this.save();
};

// Static method to get active posts
newsPostSchema.statics.getActivePosts = function(limit = 20, offset = 0) {
  return this.find({
    isActive: true,
    $or: [
      { expiryDate: null },
      { expiryDate: { $gt: new Date() } }
    ]
  })
  .populate('author', 'username role')
  .sort({ priority: -1, publishDate: -1 })
  .limit(limit)
  .skip(offset);
};

module.exports = mongoose.model('NewsPost', newsPostSchema);