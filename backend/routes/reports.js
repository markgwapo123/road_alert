const express = require('express');
const Report = require('../models/Report');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports
// @desc    Get all reports
// @access  Public
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// @route   POST /api/reports
// @desc    Create a new report
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { type, description, location, province, city, barangay } = req.body;

    const report = new Report({
      type,
      description,
      location,
      province,
      city,
      barangay,
      reporter: req.user.id,
      status: 'pending'
    });

    await report.save();
    await report.populate('reporter', 'username email');

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Server error creating report' });
  }
});

module.exports = router;