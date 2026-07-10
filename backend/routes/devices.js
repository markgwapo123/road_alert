const express = require('express');
const Device = require('../models/Device');
const userAuth = require('../middleware/userAuth');

const router = express.Router();

// @route   POST /api/devices/register
// @desc    Register a device for push notifications
// @access  Private (User)
router.post('/register', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, platform, model, osVersion, appVersion } = req.body;

    // Validate required fields
    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Token and platform are required'
      });
    }

    // Validate platform
    if (!['android', 'ios', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be android, ios, or web'
      });
    }

    // Register or update device
    const { device, isNew } = await Device.registerOrUpdate({
      userId,
      token,
      platform,
      model,
      osVersion,
      appVersion
    });

    res.json({
      success: true,
      message: isNew ? 'Device registered successfully' : 'Device updated successfully',
      deviceId: device._id,
      isNew
    });

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while registering device'
    });
  }
});

// @route   PUT /api/devices/:deviceId/token
// @desc    Update device token
// @access  Private (User)
router.put('/:deviceId/token', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldToken, newToken } = req.body;

    if (!oldToken || !newToken) {
      return res.status(400).json({
        success: false,
        error: 'Old token and new token are required'
      });
    }

    // Verify device belongs to user
    const device = await Device.findOne({ _id: req.params.deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Update token
    const updatedDevice = await Device.updateToken(userId, oldToken, newToken);

    if (!updatedDevice) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update token'
      });
    }

    res.json({
      success: true,
      message: 'Token updated successfully',
      device: updatedDevice
    });

  } catch (error) {
    console.error('Token update error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating token'
    });
  }
});

// @route   DELETE /api/devices/:deviceId
// @desc    Remove device (logout)
// @access  Private (User)
router.delete('/:deviceId', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: req.params.deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Remove device
    await Device.removeDevice(userId, device.token);

    res.json({
      success: true,
      message: 'Device removed successfully'
    });

  } catch (error) {
    console.error('Device removal error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while removing device'
    });
  }
});

// @route   PUT /api/devices/:deviceId/active
// @desc    Update last active timestamp
// @access  Private (User)
router.put('/:deviceId/active', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: req.params.deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Update last active
    await Device.updateLastActive(userId, device.token);

    res.json({
      success: true,
      message: 'Last active updated successfully'
    });

  } catch (error) {
    console.error('Update last active error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating last active'
    });
  }
});

// @route   GET /api/devices
// @desc    Get user's devices
// @access  Private (User)
router.get('/', userAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await Device.getActiveDevicesByUser(userId);

    res.json({
      success: true,
      devices
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching devices'
    });
  }
});

module.exports = router;
