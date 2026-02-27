const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Report = require('../models/Report');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const { auth, canManageReports, canDeleteReports, createAuditLog } = require('../middleware/roleAuth');
const NotificationService = require('../services/NotificationService');
const {
  checkDailyReportLimit,
  validateReportRequirements,
  getSetting
} = require('../middleware/settingsEnforcement');

const router = express.Router();

// Configure multer to store files in memory as Buffer (for Base64 conversion)
const storage = multer.memoryStorage();

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
  body('description').optional().isLength({ max: 500 }),
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
    if (status) {
      // Support multiple statuses separated by comma
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }
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

    // Execute query with pagination and timeout protection
    // Removed populate to fix timeout issues - data is already in the report
    const reports = await Report.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .maxTimeMS(30000) // 30 second query timeout
      .exec();

    // Get total count for pagination with timeout
    const totalReports = await Report.countDocuments(filter).maxTimeMS(5000);

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

    // Provide specific error messages based on error type
    if (error.name === 'MongoNetworkTimeoutError' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'Database connection timeout. Please try again.',
        retryable: true
      });
    }

    if (error.name === 'MongoTimeoutError') {
      return res.status(504).json({
        error: 'Query took too long to complete. Please try again.',
        retryable: true
      });
    }

    res.status(500).json({
      error: 'Server error while fetching reports',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    ]); res.json({
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

// @route   GET /api/reports/daily-limit
// @desc    Get user's daily report limit status
// @access  Private
router.get('/daily-limit', require('../middleware/userAuth'), async (req, res) => {
  try {
    // Get max reports per day from system settings
    const maxReportsPerDay = await SystemSettings.getSetting('max_reports_per_day', 10);

    // Count user's reports today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayReportsCount = await Report.countDocuments({
      'reportedBy.id': req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const remainingReports = Math.max(0, maxReportsPerDay - todayReportsCount);
    const canSubmit = todayReportsCount < maxReportsPerDay;

    res.json({
      success: true,
      dailyLimit: {
        maxReports: maxReportsPerDay,
        usedToday: todayReportsCount,
        remaining: remainingReports,
        canSubmit: canSubmit,
        resetsAt: endOfDay.toISOString()
      }
    });
  } catch (error) {
    console.error('Get daily limit error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching daily limit'
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

    // Process uploaded images - Convert to Base64 for MongoDB storage
    const images = req.files ? req.files.map(file => ({
      data: file.buffer.toString('base64'), // Store image as Base64 string
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

    // Send notification to user about report submission
    if (report.reportedBy && report.reportedBy.id) {
      try {
        await NotificationService.createReportSubmittedNotification({
          userId: report.reportedBy.id,
          reportId: report._id,
          reportType: report.type
        });
      } catch (notifError) {
        console.error('Failed to send submission notification:', notifError);
        // Don't fail the request if notification fails
      }
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

// @route   GET /api/reports/acceptance-logs
// @desc    Get admin acceptance activity logs (for Super Admin Dashboard)
// @access  Private (Admin only)
router.get('/acceptance-logs', auth, async (req, res) => {
  try {
    const { limit = 10, page = 1, adminId, startDate, endDate, action } = req.query;

    // Build query filter
    const filter = {
      verifiedBy: { $exists: true },
      verifiedAt: { $exists: true }
    };

    // Filter by specific admin
    if (adminId) {
      filter.verifiedBy = adminId;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.verifiedAt = {};
      if (startDate) {
        filter.verifiedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.verifiedAt.$lte = new Date(endDate);
      }
    }

    // Filter by action (verified/rejected)
    if (action) {
      filter.status = action; // 'verified' or 'rejected'
    }

    // Fetch acceptance logs with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const acceptanceLogs = await Report.find(filter)
      .select('type description province city barangay status verifiedBy verifiedAt adminNotes _id')
      .populate('verifiedBy', 'username email profile role')
      .sort({ verifiedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const totalCount = await Report.countDocuments(filter);

    // Format the response
    const formattedLogs = acceptanceLogs.map(report => ({
      _id: report._id,
      reportType: report.type,
      location: `${report.barangay}, ${report.city}, ${report.province}`,
      description: report.description,
      action: report.status, // 'verified', 'rejected', or 'resolved'
      admin: {
        id: report.verifiedBy?._id,
        username: report.verifiedBy?.username,
        email: report.verifiedBy?.email,
        name: report.verifiedBy?.profile?.firstName && report.verifiedBy?.profile?.lastName
          ? `${report.verifiedBy.profile.firstName} ${report.verifiedBy.profile.lastName}`
          : report.verifiedBy?.username,
        role: report.verifiedBy?.role,
        department: report.verifiedBy?.profile?.department
      },
      timestamp: report.verifiedAt,
      adminNotes: report.adminNotes
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get acceptance logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching acceptance logs'
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

// @route   PUT /api/reports/:id
// @desc    Update report details (admin only)
// @access  Private (requires authentication)
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('📝 Report update request received:');
    console.log('  - Report ID:', req.params.id);
    console.log('  - Update data:', JSON.stringify(req.body));

    const { type, description, province, city, barangay, status, severity, priority } = req.body;

    // Find the report
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update fields if provided
    if (type) report.type = type;
    if (description !== undefined) report.description = description; // Allow empty description
    if (province) report.province = province;
    if (city) report.city = city;
    if (barangay) report.barangay = barangay;
    if (status) report.status = status;
    if (severity) report.severity = severity;
    if (priority) report.priority = priority;

    // Save the updated report
    await report.save();

    console.log('✅ Report updated successfully:', report._id);

    // Send notification if status changed to verified
    if (status === 'verified' && report.reportedBy && report.reportedBy.id) {
      try {
        await NotificationService.sendNotification(
          report.reportedBy.id,
          'report_verified',
          `Your report "${report.description.substring(0, 30)}..." has been verified`,
          { reportId: report._id }
        );
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({
      error: 'Failed to update report',
      details: error.message
    });
  }
});

// @route   PATCH /api/reports/:id/status
// @desc    Update report status
// @access  Public (for admin dashboard)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    console.log('📝 Status update request received:');
    console.log('  - Report ID:', req.params.id);
    console.log('  - Full request body:', JSON.stringify(req.body));
    console.log('  - Content-Type:', req.headers['content-type']);

    const { status, adminNotes } = req.body;

    console.log('  - Extracted status:', status);
    console.log('  - Status type:', typeof status);
    console.log('  - Status is undefined?', status === undefined);
    console.log('  - Status is null?', status === null);

    // Validate status exists and is a string
    if (!status || typeof status !== 'string') {
      console.error('❌ Status is missing or invalid:', status);
      return res.status(400).json({
        error: 'Status is required and must be a string',
        received: status,
        type: typeof status
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'verified', 'rejected', 'resolved'];
    if (!validStatuses.includes(status)) {
      console.error('❌ Invalid status value:', status);
      return res.status(400).json({
        error: 'Invalid status value',
        received: status,
        validValues: validStatuses
      });
    }

    console.log('✅ Status validation passed:', status);

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

    // Save admin ID who verified/rejected the report
    if ((status === 'verified' || status === 'rejected') && req.admin) {
      updateData.verifiedBy = req.admin.id;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      if (req.admin) {
        updateData.resolvedBy = req.admin.id;
      }
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

// @route   POST /api/reports/:id/resolve
// @desc    Mark report as resolved with admin feedback and evidence photo
// @access  Private (Admin only)
router.post('/:id/resolve', auth, upload.single('evidencePhoto'), async (req, res) => {
  try {
    console.log('📝 Resolve request received for report:', req.params.id);
    const { adminFeedback } = req.body;

    // Validate feedback
    if (!adminFeedback || adminFeedback.trim().length < 10) {
      console.log('❌ Validation failed: Feedback too short or missing');
      return res.status(400).json({
        error: 'Admin feedback is required (minimum 10 characters)'
      });
    }

    // Find the report
    console.log('🔍 Finding report...');
    const report = await Report.findById(req.params.id);
    if (!report) {
      console.log('❌ Report not found:', req.params.id);
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    console.log('✅ Report found:', report._id);
    const oldStatus = report.status;

    // Process evidence photo if uploaded
    let evidencePhoto = null;
    if (req.file) {
      console.log('📸 Processing evidence photo:', req.file.originalname);
      evidencePhoto = {
        data: req.file.buffer.toString('base64'),
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadDate: new Date()
      };
    }

    // Update report with resolution details
    console.log('💾 Updating report status to resolved...');
    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.adminFeedback = adminFeedback;
    if (evidencePhoto) {
      report.evidencePhoto = evidencePhoto;
    }
    report.resolvedBy = req.admin ? req.admin.id : req.user?.id;

    await report.save();
    console.log('✅ Report saved successfully');

    // Populate for response
    console.log('📊 Populating report fields...');
    await report.populate('verifiedBy', 'username');
    await report.populate('reportedBy', 'username email profile');
    await report.populate('resolvedBy', 'username');

    // Send notification to user
    console.log('📧 Attempting to send notification...');
    try {
      if (report.reportedBy && (report.reportedBy.username || report.reportedBy.id)) {
        let user = null;

        // Try to find user by username first
        if (report.reportedBy.username) {
          user = await User.findOne({ username: report.reportedBy.username });
        }

        // If not found, try by ID
        if (!user && report.reportedBy.id) {
          user = await User.findById(report.reportedBy.id);
        }

        if (user) {
          console.log('✅ User found, creating notification...');
          await NotificationService.createReportResolvedNotification({
            userId: user._id,
            reportId: report._id,
            reportType: report.type,
            adminFeedback,
            hasEvidence: !!evidencePhoto
          });
          console.log('✅ Notification created successfully');
        } else {
          console.log('⚠️ User not found for notification, but report resolved');
        }
      } else {
        console.log('⚠️ No reporter info available for notification');
      }
    } catch (notifError) {
      console.error('⚠️ Notification error (non-critical):', notifError.message);
      // Don't fail the whole request if notification fails
    }

    console.log('✅ Resolve complete, sending response');
    res.json({
      success: true,
      message: 'Report marked as resolved successfully',
      data: report
    });

  } catch (error) {
    console.error('❌ Resolve report error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error while resolving report',
      details: error.message
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report (Super Admin only)
// @access  Private - Super Admin
router.delete('/:id', auth, canDeleteReports, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Store report data for audit log before deletion
    const reportData = {
      title: report.title,
      description: report.description,
      status: report.status,
      location: report.location,
      hazardType: report.hazardType,
      reporter: report.reporter
    };

    // Delete the report
    await Report.findByIdAndDelete(req.params.id);

    // Delete associated images
    if (report.images && report.images.length > 0) {
      report.images.forEach(image => {
        const imagePath = path.join(__dirname, '../uploads', image.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    // Create audit log
    await createAuditLog(req, 'DELETE_REPORT', 'reports', `Deleted report: ${reportData.title}`, {
      targetType: 'Report',
      targetId: req.params.id,
      previousValues: reportData
    });

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

    // Check daily report limit from system settings
    const maxReportsPerDay = await SystemSettings.getSetting('max_reports_per_day', 10);

    // Count user's reports today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayReportsCount = await Report.countDocuments({
      'reportedBy.id': req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (todayReportsCount >= maxReportsPerDay) {
      return res.status(429).json({
        success: false,
        error: `Daily report limit reached. You can only submit ${maxReportsPerDay} reports per day.`,
        limitReached: true,
        maxReports: maxReportsPerDay,
        currentCount: todayReportsCount
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

    // Process uploaded images - Convert to Base64 for MongoDB storage
    const images = req.files ? req.files.map(file => ({
      data: file.buffer.toString('base64'), // Store image as Base64 string
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Create report data
    const reportData = {
      type: req.body.type,
      description: req.body.description || '',
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

    // Note: With Cloudinary, uploaded files are already stored in the cloud
    // No need to clean up local files

    res.status(500).json({
      success: false,
      error: 'Failed to submit report. Please try again.'
    });
  }
});

module.exports = router;
