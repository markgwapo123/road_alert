const express = require('express');
const router = express.Router();

// Mock data for testing
const mockReports = [
  {
    _id: '1',
    type: 'pothole',
    description: 'Large pothole causing traffic disruption',
    location: {
      address: 'EDSA, Quezon City',
      coordinates: {
        latitude: 14.6507,
        longitude: 121.0280
      }
    },
    severity: 'high',
    status: 'pending',
    reportedBy: {
      name: 'John Doe',
      email: 'john@example.com'
    },
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    type: 'debris',
    description: 'Construction debris blocking lane',
    location: {
      address: 'C5 Road, Makati',
      coordinates: {
        latitude: 14.5547,
        longitude: 121.0244
      }
    },
    severity: 'medium',
    status: 'verified',
    reportedBy: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    },
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: '3',
    type: 'flooding',
    description: 'Road flooding after heavy rain',
    location: {
      address: 'Roxas Boulevard, Manila',
      coordinates: {
        latitude: 14.5764,
        longitude: 120.9822
      }
    },
    severity: 'high',
    status: 'verified',
    reportedBy: {
      name: 'Mike Johnson',
      email: 'mike@example.com'
    },
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

// @route   GET /api/reports/mock
// @desc    Get mock reports for testing
// @access  Public
router.get('/mock', (req, res) => {
  try {
    const { status, type, severity } = req.query;
    
    let filteredReports = [...mockReports];

    if (status && status !== 'all') {
      filteredReports = filteredReports.filter(report => report.status === status);
    }
    
    if (type && type !== 'all') {
      filteredReports = filteredReports.filter(report => report.type === type);
    }
    
    if (severity && severity !== 'all') {
      filteredReports = filteredReports.filter(report => report.severity === severity);
    }

    res.json({
      success: true,
      data: filteredReports,
      total: filteredReports.length
    });

  } catch (error) {
    console.error('Mock reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching mock reports'
    });
  }
});

// @route   GET /api/reports/mock/stats
// @desc    Get mock statistics
// @access  Public
router.get('/mock/stats', (req, res) => {
  try {
    const stats = {
      totalReports: mockReports.length,
      pendingReports: mockReports.filter(r => r.status === 'pending').length,
      verifiedReports: mockReports.filter(r => r.status === 'verified').length,
      rejectedReports: mockReports.filter(r => r.status === 'rejected').length,
      resolvedReports: mockReports.filter(r => r.status === 'resolved').length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Mock stats error:', error);
    res.status(500).json({
      error: 'Server error while fetching mock statistics'
    });
  }
});

// @route   GET /api/reports/mock/map
// @desc    Get mock reports for map
// @access  Public
router.get('/mock/map', (req, res) => {
  try {
    const { status = 'all', type, severity } = req.query;
    
    let filteredReports = [...mockReports];

    if (status !== 'all') {
      filteredReports = filteredReports.filter(report => report.status === status);
    }
    
    if (type && type !== 'all') {
      filteredReports = filteredReports.filter(report => report.type === type);
    }
    
    if (severity && severity !== 'all') {
      filteredReports = filteredReports.filter(report => report.severity === severity);
    }

    res.json({
      success: true,
      data: filteredReports
    });

  } catch (error) {
    console.error('Mock map reports error:', error);
    res.status(500).json({
      error: 'Server error while fetching mock map reports'
    });
  }
});

module.exports = router;
