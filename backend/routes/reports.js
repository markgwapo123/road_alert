const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation rules
const reportValidation = [
  body('type').isIn(['emergency', 'caution', 'construction', 'info', 'safe', 'pothole', 'debris', 'flooding', 'accident', 'other']),
  body('description').isLength({ min: 10, max: 500 }),
  body('severity').isIn(['low', 'medium', 'high'])
];

// @route   GET /api/reports
// @desc    Get all reports with filtering and pagination
// @access  Public (for admin dashboard)
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      severity,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'reportedBy.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const reports = await Report.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('verifiedBy', 'username')
      .exec();

    // Get total count for pagination
    const totalReports = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        hasNextPage: page < Math.ceil(totalReports / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching reports'
    });
  }
});

// @route   GET /api/reports/stats
// @desc    Get reports statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const verifiedReports = await Report.countDocuments({ status: 'verified' });
    const rejectedReports = await Report.countDocuments({ status: 'rejected' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });

    // Get reports by type
    const reportsByType = await Report.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get reports by severity
    const reportsBySeverity = await Report.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentActivity = await Report.aggregate([
      {
        $match: { createdAt: { $gte: weekAgo } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);    res.json({
      success: true,
      totalReports,
      pending: pendingReports,
      verified: verifiedReports,
      rejected: rejectedReports,
      resolved: resolvedReports,
      reportsByType,
      reportsBySeverity,
      recentActivity
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server error while fetching statistics'
    });
  }
});

// @route   GET /api/reports/my-reports
// @desc    Get reports submitted by the authenticated user
// @access  Private
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    // Build filter for user's reports
    const filter = { 
      submittedBy: req.user.id // Filter by the authenticated user
    };
    
    // Add optional filters
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    // Get user's reports with pagination
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('verifiedBy', 'username')
      .exec();
      
    // Get total count for pagination
    const totalReports = await Report.countDocuments(filter);
    
    res.json({
      success: true,
      reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        hasNextPage: page < Math.ceil(totalReports / limit),
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching your reports'
    });
  }
});

// @route   GET /api/reports/map
// @desc    Get reports for map display
// @access  Public
router.get('/map', async (req, res) => {
  try {
    const { status = 'verified', type, severity } = req.query;

    // Build filter - only show verified reports by default for public map
    const filter = { status };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const reports = await Report.find(filter)
      .select('type location severity status createdAt description')
      .limit(1000) // Limit for performance
      .exec();

    res.json({
      success: true,
      data: reports
    });

  } catch (error) {
    console.error('Get map reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching map reports'
    });
  }
});

// @route   POST /api/reports
// @desc    Create new report (for mobile app)
// @access  Public
router.post('/', upload.array('images', 5), reportValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Create report
    const reportData = {
      ...req.body,
      // Always set status to 'pending' for user-submitted reports
      // Admin can verify/reject later through the admin dashboard
      status: 'pending',
      images,
      location: {
        address: req.body.location.address,
        coordinates: {
          latitude: parseFloat(req.body.location.coordinates.latitude),
          longitude: parseFloat(req.body.location.coordinates.longitude)
        }
      }
    };

    const report = new Report(reportData);
    await report.save();

    // Create notifications for all users about the new report
    try {
      await Notification.notifyNewReport(report);
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // Don't fail the report creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      error: 'Server error while creating report'
    });
  }
});

// @route   POST /api/reports/user
// @desc    Create new report (for authenticated users)
// @access  Private
router.post('/user', auth, upload.array('images', 5), reportValidation, async (req, res) => {
  try {
    console.log('📝 New report submission attempt');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    console.log('Files:', req.files?.map(f => ({ filename: f.filename, size: f.size, mimetype: f.mimetype })));
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if user exists
    if (!req.user || !req.user.id) {
      console.error('❌ User not found in request');
      return res.status(401).json({
        error: 'User authentication failed'
      });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    console.log('📷 Processed images:', images.length);

    // Validate location data
    if (!req.body.location || !req.body.location.coordinates) {
      console.error('❌ Missing location data');
      return res.status(400).json({
        error: 'Location data is required'
      });
    }

    // Create report
    const reportData = {
      ...req.body,
      // Always set status to 'pending' for user-submitted reports
      // Admin can verify/reject later through the admin dashboard
      status: 'pending',
      images,
      submittedBy: req.user.id, // Associate with authenticated user
      location: {
        address: req.body.location.address,
        coordinates: {
          latitude: parseFloat(req.body.location.coordinates.latitude),
          longitude: parseFloat(req.body.location.coordinates.longitude)
        }
      }
    };

    console.log('💾 Creating report with data:', {
      type: reportData.type,
      severity: reportData.severity,
      description: reportData.description?.substring(0, 50),
      imageCount: reportData.images.length,
      submittedBy: reportData.submittedBy,
      location: reportData.location
    });

    const report = new Report(reportData);
    await report.save();

    console.log('✅ Report created successfully:', report._id);

    // Create notifications for all users about the new report
    try {
      await Notification.notifyNewReport(report);
      console.log('📢 Notifications sent');
    } catch (notifError) {
      console.error('⚠️ Error creating notifications:', notifError);
      // Don't fail the report creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });

  } catch (error) {
    console.error('❌ Create report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error while creating report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get single report
// @access  Public (for admin dashboard)
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('verifiedBy', 'username');

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      error: 'Server error while fetching report'
    });
  }
});

// @route   PATCH /api/reports/:id/status
// @desc    Update report status
// @access  Public (for admin dashboard)
router.patch('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['pending', 'verified', 'rejected', 'resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value'
      });
    }

    const updateData = { 
      status, 
      verifiedAt: new Date(),
      verifiedBy: req.admin.id
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('verifiedBy', 'username').populate('submittedBy', 'username email');

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Create notification for the user who submitted the report
    if (report.submittedBy) {
      try {
        await Notification.notifyReportStatusChange(report, status, req.admin?.username || 'Admin');
      } catch (notifError) {
        console.error('Error creating status change notification:', notifError);
        // Don't fail the status update if notification fails
      }
    }

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: `Report ${status} successfully`,
      data: report
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Server error while updating report status'
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Delete associated images
    if (report.images && report.images.length > 0) {
      report.images.forEach(image => {
        const imagePath = path.join(__dirname, '../uploads', image.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      error: 'Server error while deleting report'
    });
  }
});

module.exports = router;
