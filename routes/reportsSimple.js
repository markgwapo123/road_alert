const express = require('express');
const { db, updateStats } = require('../config/jsondb');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// @route   GET /api/reports
// @desc    Get all reports with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    db.read();
    const { status, type, severity, search } = req.query;
    
    let reports = db.data.reports || [];

    // Apply filters
    if (status && status !== 'all') {
      reports = reports.filter(report => report.status === status);
    }
    
    if (type && type !== 'all') {
      reports = reports.filter(report => report.type === type);
    }
    
    if (severity && severity !== 'all') {
      reports = reports.filter(report => report.severity === severity);
    }

    if (search) {
      reports = reports.filter(report => 
        report.description.toLowerCase().includes(search.toLowerCase()) ||
        report.location.address.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by creation date (newest first)
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: reports,
      total: reports.length
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
    db.read();
    updateStats();
    
    const stats = db.data.stats;

    // Get reports by type
    const reports = db.data.reports || [];
    const reportsByType = reports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {});

    // Get reports by severity
    const reportsBySeverity = reports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        ...stats,
        reportsByType: Object.entries(reportsByType).map(([type, count]) => ({ _id: type, count })),
        reportsBySeverity: Object.entries(reportsBySeverity).map(([severity, count]) => ({ _id: severity, count }))
      }
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
    db.read();
    const { status = 'verified', type, severity } = req.query;

    let reports = db.data.reports || [];

    // Apply filters
    if (status !== 'all') {
      reports = reports.filter(report => report.status === status);
    }
    
    if (type && type !== 'all') {
      reports = reports.filter(report => report.type === type);
    }
    
    if (severity && severity !== 'all') {
      reports = reports.filter(report => report.severity === severity);
    }

    // Return only necessary fields for map
    const mapReports = reports.map(report => ({
      _id: report.id,
      type: report.type,
      location: report.location,
      severity: report.severity,
      status: report.status,
      createdAt: report.createdAt,
      description: report.description,
      reportedBy: report.reportedBy
    }));

    res.json({
      success: true,
      data: mapReports
    });

  } catch (error) {
    console.error('Get map reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching map reports'
    });
  }
});

// @route   POST /api/reports
// @desc    Create new report
// @access  Public
router.post('/', async (req, res) => {
  try {
    db.read();
    
    const newReport = {
      id: uuidv4(),
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.data.reports = db.data.reports || [];
    db.data.reports.push(newReport);
    
    updateStats();
    db.write();

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: newReport
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      error: 'Server error while creating report'
    });
  }
});

// @route   PATCH /api/reports/:id/status
// @desc    Update report status
// @access  Public (would be private in production)
router.patch('/:id/status', async (req, res) => {
  try {
    db.read();
    const { status, adminNotes } = req.body;

    const reportIndex = db.data.reports.findIndex(r => r.id === req.params.id);
    
    if (reportIndex === -1) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Update report
    db.data.reports[reportIndex] = {
      ...db.data.reports[reportIndex],
      status,
      adminNotes,
      updatedAt: new Date().toISOString(),
      verifiedAt: status === 'verified' ? new Date().toISOString() : db.data.reports[reportIndex].verifiedAt,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : db.data.reports[reportIndex].resolvedAt
    };

    updateStats();
    db.write();

    res.json({
      success: true,
      message: `Report ${status} successfully`,
      data: db.data.reports[reportIndex]
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      error: 'Server error while updating report status'
    });
  }
});

module.exports = router;
