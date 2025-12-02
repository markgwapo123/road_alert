const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { canManageReports } = require('../middleware/roleAuth');
const NotificationService = require('../services/NotificationService');

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
  body('type').isIn(['pothole', 'debris', 'flooding', 'construction', 'accident', 'other', 'emergency', 'caution', 'info', 'safe']),
  body('description').isLength({ min: 10, max: 500 }),
  body('location[address]').isLength({ min: 3, max: 200 }).withMessage('Address must be between 3 and 200 characters'),
  body('location[coordinates][latitude]').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('location[coordinates][longitude]').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('province').notEmpty().withMessage('Province is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('barangay').notEmpty().withMessage('Barangay is required')
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
      .populate('reportedBy', 'username email profile')
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

// @route   GET /api/reports/my-reports
// @desc    Get current user's reports
// @access  Private
router.get('/my-reports', require('../middleware/userAuth'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      severity,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object for user's reports
    const filter = { 'reportedBy.id': req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const reports = await Report.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('verifiedBy', 'username')
      .populate('reportedBy', 'username email profile')
      .exec();

    // Get total count for pagination
    const totalReports = await Report.countDocuments(filter);

    res.json({
      success: true,
      reports: reports,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReports / limit),
        totalReports,
        hasNextPage: page < Math.ceil(totalReports / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching report'
    });
  }
});

// @route   DELETE /api/reports/my-reports/:id
// @desc    Delete user's own report
// @access  Private
router.delete('/my-reports/:id', require('../middleware/userAuth'), async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    // Find the report and verify ownership
    const report = await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check if the user owns this report
    if (report.reportedBy.id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own reports'
      });
    }

    // Delete any associated images
    if (report.images && Array.isArray(report.images) && report.images.length > 0) {
      for (const image of report.images) {
        try {
          const imagePath = path.join(__dirname, '../uploads', image.filename || image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (imageError) {
          console.warn('Error deleting image file:', imageError.message);
          // Continue with report deletion even if image deletion fails
        }
      }
    }

    // Delete the report
    await Report.findByIdAndDelete(reportId);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting report'
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

// @route   GET /api/reports/map
// @desc    Get reports for map display
// @access  Public
router.get('/map', async (req, res) => {
  try {
    const { status, type, severity } = req.query;
    console.log('🗺️ Map reports request with filters:', { status, type, severity });

    // Build filter - allow all statuses by default, but apply filters if specified
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (severity && severity !== 'all') {
      filter.severity = severity;
    }

    console.log('🔍 Final filter object:', filter);

    const reports = await Report.find(filter)
      .select('type location province city barangay severity status createdAt description reportedBy images')
      .populate('reportedBy', 'name email username profile')
      .limit(1000) // Limit for performance
      .exec();

    console.log(`📍 Found ${reports.length} reports for map display`);

    res.json({
      success: true,
      data: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('❌ Get map reports error:', error);
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
    })) : [];    // Create report
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

// @route   GET /api/reports/:id
// @desc    Get single report
// @access  Public (for admin dashboard)
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('verifiedBy', 'username')
      .populate('reportedBy', 'username email profile');

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
router.patch('/:id/status', auth, canManageReports, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!['pending', 'verified', 'rejected', 'resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value'
      });
    }

    // First, get the current report to access old status and user info
    const currentReport = await Report.findById(req.params.id);
    if (!currentReport) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const oldStatus = currentReport.status;

    const updateData = { 
      status, 
      verifiedAt: new Date()
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
    ).populate('verifiedBy', 'username')
    .populate('reportedBy', 'username email profile');

    // Create notification for status change
    if (currentReport.reportedBy && currentReport.reportedBy.username) {
      // Find user by username to get their ID
      const user = await User.findOne({ username: currentReport.reportedBy.username });
      if (user) {
        await NotificationService.createReportStatusNotification({
          userId: user._id,
          reportId: report._id,
          oldStatus,
          newStatus: status,
          reportType: report.type,
          adminNotes
        });
      }
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

// @route   POST /api/reports/user
// @desc    Create new report (for authenticated users)
// @access  Private
router.post('/user', require('../middleware/userAuth'), upload.array('images', 5), reportValidation, async (req, res) => {
  try {
    // Check if user account is frozen
    if (req.user.isFrozen === true) {
      return res.status(403).json({
        success: false,
        error: 'Account is frozen. You cannot submit reports while your account is frozen.',
        frozen: true
      });
    }

    // Check if user can submit reports (additional validation)
    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        error: 'Account is not active. Please contact support.',
        frozen: req.user.isFrozen || false
      });
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadPath: `/uploads/${file.filename}`
    })) : [];

    // Create report data
    const reportData = {
      type: req.body.type,
      description: req.body.description,
      province: req.body.province,
      city: req.body.city,
      barangay: req.body.barangay,
      status: 'pending',
      location: {
        address: req.body['location[address]'] || req.body.location?.address,
        coordinates: {
          latitude: parseFloat(req.body['location[coordinates][latitude]'] || req.body.location?.coordinates?.latitude),
          longitude: parseFloat(req.body['location[coordinates][longitude]'] || req.body.location?.coordinates?.longitude)
        }
      },
      images: images,
      reportedBy: {
        id: req.user.id,
        name: req.user.profile?.firstName && req.user.profile?.lastName 
          ? `${req.user.profile.firstName} ${req.user.profile.lastName}`
          : req.user.username,
        username: req.user.username,
        email: req.user.email
      },
      submittedAt: new Date(),
      isAnonymous: false
    };

    console.log('Creating report for user:', req.user.username);
    console.log('Report data:', reportData);

    // Create the report
    const report = new Report(reportData);
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        id: report._id,
        type: report.type,
        description: report.description,
        severity: report.severity,
        status: report.status,
        submittedAt: report.submittedAt
      }
    });

  } catch (error) {
    console.error('User report submission error:', error);
    
    // Clean up uploaded files if report creation fails
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit report. Please try again.'
    });
  }
});

module.exports = router;
