const express = require('express');
const NewsPost = require('../models/NewsPost');
const { auth, canCreateNews, requirePermission } = require('../middleware/roleAuth');
const { handleNewsUpload, getFileType } = require('../middleware/newsUpload');
const path = require('path');

const router = express.Router();

// =============== ADMIN ROUTES FOR NEWS MANAGEMENT ===============

// @route   POST /api/news/create
// @desc    Create a new news post (admin users and super admin)
// @access  Private (admin with create_news_posts permission)
router.post('/create', auth, canCreateNews, handleNewsUpload, async (req, res) => {
  try {
    const { title, content, type, priority, expiryDate, targetAudience, tags } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: 'Title and content are required'
      });
    }

    // Process uploaded files
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `/uploads/news/${file.filename}`,
        type: getFileType(file.filename),
        size: file.size
      }));
    }

    // Create new news post
    const newsPost = new NewsPost({
      title,
      content,
      type: type || 'general',
      priority: priority || 'normal',
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      author: req.admin.id,
      authorName: req.admin.username,
      targetAudience: targetAudience || 'all',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
      attachments: attachments.map(att => ({
        type: att.type,
        url: att.url,
        filename: att.filename,
        originalName: att.originalName,
        size: att.size
      }))
    });

    await newsPost.save();
    
    // Populate author details for response
    await newsPost.populate('author', 'username role');

    res.status(201).json({
      message: 'News post created successfully',
      newsPost,
      uploadedFiles: attachments.length
    });

  } catch (error) {
    console.error('Create news post error:', error);
    
    // Clean up uploaded files if post creation fails
    if (req.files && req.files.length > 0) {
      const fs = require('fs');
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    }
    
    res.status(500).json({
      error: 'Server error while creating news post'
    });
  }
});

// @route   GET /api/news/admin/posts
// @desc    Get all news posts for admin management
// @access  Private (admin with create_news_posts permission)
router.get('/admin/posts', auth, canCreateNews, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, isActive } = req.query;
    const skip = (page - 1) * limit;

    // Build filter query
    let filter = {};
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // If admin_user, only show their own posts
    if (req.admin.role === 'admin_user') {
      filter.author = req.admin.id;
    }

    const posts = await NewsPost.find(filter)
      .populate('author', 'username role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalPosts = await NewsPost.countDocuments(filter);

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: skip + posts.length < totalPosts,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get admin posts error:', error);
    res.status(500).json({
      error: 'Server error while fetching news posts'
    });
  }
});

// @route   PUT /api/news/admin/post/:id
// @desc    Update news post (admin who created it or super admin)
// @access  Private (admin with create_news_posts permission)
router.put('/admin/post/:id', auth, canCreateNews, async (req, res) => {
  try {
    const { title, content, type, priority, isActive, expiryDate, targetAudience, tags } = req.body;

    const newsPost = await NewsPost.findById(req.params.id);
    
    if (!newsPost) {
      return res.status(404).json({
        error: 'News post not found'
      });
    }

    // Check if admin can edit this post
    const canEdit = req.admin.role === 'super_admin' || 
                   newsPost.author.toString() === req.admin.id;
    
    if (!canEdit) {
      return res.status(403).json({
        error: 'You can only edit your own posts'
      });
    }

    // Update fields
    if (title !== undefined) newsPost.title = title;
    if (content !== undefined) newsPost.content = content;
    if (type !== undefined) newsPost.type = type;
    if (priority !== undefined) newsPost.priority = priority;
    if (isActive !== undefined) newsPost.isActive = isActive;
    if (expiryDate !== undefined) newsPost.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (targetAudience !== undefined) newsPost.targetAudience = targetAudience;
    if (tags !== undefined) newsPost.tags = tags;

    await newsPost.save();
    await newsPost.populate('author', 'username role');

    res.json({
      message: 'News post updated successfully',
      newsPost
    });

  } catch (error) {
    console.error('Update news post error:', error);
    res.status(500).json({
      error: 'Server error while updating news post'
    });
  }
});

// @route   DELETE /api/news/admin/post/:id
// @desc    Delete news post (admin who created it or super admin)
// @access  Private (admin with create_news_posts permission)
router.delete('/admin/post/:id', auth, canCreateNews, async (req, res) => {
  try {
    const newsPost = await NewsPost.findById(req.params.id);
    
    if (!newsPost) {
      return res.status(404).json({
        error: 'News post not found'
      });
    }

    // Check if admin can delete this post
    const canDelete = req.admin.role === 'super_admin' || 
                     newsPost.author.toString() === req.admin.id;
    
    if (!canDelete) {
      return res.status(403).json({
        error: 'You can only delete your own posts'
      });
    }

    await NewsPost.findByIdAndDelete(req.params.id);

    res.json({
      message: 'News post deleted successfully'
    });

  } catch (error) {
    console.error('Delete news post error:', error);
    res.status(500).json({
      error: 'Server error while deleting news post'
    });
  }
});

// @route   GET /api/news/admin/post/:id/details
// @desc    Get detailed news post with viewers list (admin only)
// @access  Private (admin with create_news_posts permission)
router.get('/admin/post/:id/details', auth, canCreateNews, async (req, res) => {
  try {
    const newsPost = await NewsPost.findById(req.params.id)
      .populate('author', 'username role')
      .populate('viewedBy.user', 'username email name createdAt');

    if (!newsPost) {
      return res.status(404).json({
        error: 'News post not found'
      });
    }

    res.json({
      success: true,
      newsPost
    });

  } catch (error) {
    console.error('Get detailed news post error:', error);
    res.status(500).json({
      error: 'Server error while fetching news post details'
    });
  }
});

// =============== PUBLIC ROUTES FOR USER APP ===============

// @route   GET /api/news/public/posts
// @desc    Get active news posts for user app
// @access  Public
router.get('/public/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (page - 1) * limit;

    // Build filter for active, non-expired posts
    let filter = {
      isActive: true,
      $or: [
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ]
    };

    if (type) filter.type = type;

    const posts = await NewsPost.find(filter)
      .populate('author', 'username')
      .select('-viewedBy') // Don't send view tracking data to public
      .sort({ priority: -1, publishDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const totalPosts = await NewsPost.countDocuments(filter);

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: skip + posts.length < totalPosts,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get public posts error:', error);
    res.status(500).json({
      error: 'Server error while fetching news posts'
    });
  }
});

// @route   POST /api/news/public/post/:id/view
// @desc    Track post view (optional user ID)
// @access  Public
router.post('/public/post/:id/view', async (req, res) => {
  try {
    const { userId } = req.body; // Optional user ID
    
    const newsPost = await NewsPost.findById(req.params.id);
    
    if (!newsPost) {
      return res.status(404).json({
        error: 'News post not found'
      });
    }

    const previousViews = newsPost.views;
    const wasAlreadyViewed = userId ? 
      newsPost.viewedBy.some(view => view.user && view.user.toString() === userId.toString()) : 
      false;

    await newsPost.addView(userId);

    const viewIncremented = newsPost.views > previousViews;

    res.json({
      message: 'View recorded',
      views: newsPost.views,
      viewIncremented,
      wasAlreadyViewed,
      userId: userId || null
    });

  } catch (error) {
    console.error('Record view error:', error);
    res.status(500).json({
      error: 'Server error while recording view'
    });
  }
});

// @route   GET /api/news/public/post/:id
// @desc    Get single news post details
// @access  Public
router.get('/public/post/:id', async (req, res) => {
  try {
    const newsPost = await NewsPost.findById(req.params.id)
      .populate('author', 'username role');

    if (!newsPost) {
      return res.status(404).json({
        error: 'News post not found'
      });
    }

    // Check if post is active and not expired
    if (!newsPost.isActive || (newsPost.expiryDate && newsPost.expiryDate < new Date())) {
      return res.status(404).json({
        error: 'News post is not available'
      });
    }

    res.json(newsPost);

  } catch (error) {
    console.error('Get single post error:', error);
    res.status(500).json({
      error: 'Server error while fetching news post'
    });
  }
});

// @route   GET /api/news/uploads/:filename
// @desc    Serve uploaded news media files
// @access  Public
router.get('/uploads/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const { uploadDir } = require('../middleware/newsUpload');
    const filePath = path.join(uploadDir, filename);
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({
      error: 'Server error while serving file'
    });
  }
});

module.exports = router;