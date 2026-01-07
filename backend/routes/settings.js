const express = require('express');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const { auth, requireSuperAdmin, canAccessSettings, canViewAuditLogs, createAuditLog } = require('../middleware/roleAuth');

const router = express.Router();

// =============== MAINTENANCE MODE ROUTES ===============

// @route   GET /api/settings/maintenance/status
// @desc    Get maintenance mode status (public endpoint)
// @access  Public
router.get('/maintenance/status', async (req, res) => {
  try {
    const maintenanceMode = await SystemSettings.getSetting('maintenance_mode', false);
    const maintenanceMessage = await SystemSettings.getSetting('maintenance_message', 'We are currently performing scheduled maintenance. Please check back soon.');
    const scheduledStart = await SystemSettings.getSetting('maintenance_scheduled_start', '');
    const scheduledEnd = await SystemSettings.getSetting('maintenance_scheduled_end', '');
    
    res.json({
      success: true,
      maintenance: {
        enabled: maintenanceMode,
        message: maintenanceMessage,
        scheduledStart: scheduledStart,
        scheduledEnd: scheduledEnd
      }
    });
  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      error: 'Server error while fetching maintenance status'
    });
  }
});

// @route   PUT /api/settings/maintenance/toggle
// @desc    Toggle maintenance mode on/off
// @access  Private (Super Admin only)
router.put('/maintenance/toggle', auth, canAccessSettings, async (req, res) => {
  try {
    const { enabled, message, scheduledStart, scheduledEnd } = req.body;
    
    // Update maintenance mode
    await SystemSettings.setSetting('maintenance_mode', enabled, {
      category: 'general',
      description: 'Enable maintenance mode',
      dataType: 'boolean',
      isPublic: true,
      adminId: req.admin.id
    });
    
    // Update message if provided
    if (message !== undefined) {
      await SystemSettings.setSetting('maintenance_message', message, {
        category: 'general',
        description: 'Message displayed during maintenance',
        dataType: 'string',
        isPublic: true,
        adminId: req.admin.id
      });
    }
    
    // Update scheduled times if provided
    if (scheduledStart !== undefined) {
      await SystemSettings.setSetting('maintenance_scheduled_start', scheduledStart, {
        category: 'general',
        description: 'Scheduled maintenance start time (ISO format)',
        dataType: 'string',
        isPublic: true,
        adminId: req.admin.id
      });
    }
    
    if (scheduledEnd !== undefined) {
      await SystemSettings.setSetting('maintenance_scheduled_end', scheduledEnd, {
        category: 'general',
        description: 'Scheduled maintenance end time (ISO format)',
        dataType: 'string',
        isPublic: true,
        adminId: req.admin.id
      });
    }
    
    // Log the action
    await createAuditLog(req, 'settings_update', 'settings', 
      `${enabled ? 'Enabled' : 'Disabled'} maintenance mode`, {
        targetType: 'setting',
        targetName: 'maintenance_mode',
        previousValues: { enabled: !enabled },
        newValues: { enabled, message, scheduledStart, scheduledEnd }
      }
    );
    
    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenance: {
        enabled,
        message: message || await SystemSettings.getSetting('maintenance_message'),
        scheduledStart: scheduledStart || await SystemSettings.getSetting('maintenance_scheduled_start'),
        scheduledEnd: scheduledEnd || await SystemSettings.getSetting('maintenance_scheduled_end')
      }
    });
  } catch (error) {
    console.error('Toggle maintenance mode error:', error);
    res.status(500).json({
      error: 'Server error while toggling maintenance mode'
    });
  }
});

// =============== SYSTEM SETTINGS ROUTES (Super Admin Only) ===============

// @route   GET /api/settings
// @desc    Get all system settings
// @access  Private (Super Admin only)
router.get('/', auth, canAccessSettings, async (req, res) => {
  try {
    const settings = await SystemSettings.find()
      .populate('lastModifiedBy', 'username')
      .sort({ category: 1, key: 1 });
    
    // Group by category
    const groupedSettings = {};
    settings.forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push(setting);
    });
    
    // Log the view action
    await createAuditLog(req, 'settings_view', 'settings', 'Viewed system settings');
    
    res.json({
      success: true,
      settings: groupedSettings,
      raw: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Server error while fetching settings'
    });
  }
});

// @route   GET /api/settings/public
// @desc    Get public settings (for frontend config)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const settings = await SystemSettings.getPublicSettings();
    
    // Convert to key-value object
    const settingsObject = {};
    settings.forEach(s => {
      settingsObject[s.key] = s.value;
    });
    
    res.json({
      success: true,
      settings: settingsObject
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({
      error: 'Server error while fetching public settings'
    });
  }
});

// @route   GET /api/settings/category/:category
// @desc    Get settings by category
// @access  Private (Super Admin only)
router.get('/category/:category', auth, canAccessSettings, async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['general', 'map', 'notifications', 'reports', 'users', 'security'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category'
      });
    }
    
    const settings = await SystemSettings.getByCategory(category);
    
    res.json({
      success: true,
      category,
      settings
    });
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({
      error: 'Server error while fetching settings'
    });
  }
});

// @route   PUT /api/settings/:key
// @desc    Update a single setting
// @access  Private (Super Admin only)
router.put('/:key', auth, canAccessSettings, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Find existing setting
    const existingSetting = await SystemSettings.findOne({ key });
    if (!existingSetting) {
      return res.status(404).json({
        error: 'Setting not found'
      });
    }
    
    const previousValue = existingSetting.value;
    
    // Update the setting
    existingSetting.value = value;
    existingSetting.lastModifiedBy = req.admin.id;
    await existingSetting.save();
    
    // Log the update
    await createAuditLog(req, 'settings_update', 'settings', 
      `Updated setting: ${key}`, {
        targetType: 'setting',
        targetName: key,
        previousValues: { value: previousValue },
        newValues: { value }
      }
    );
    
    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting: existingSetting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      error: 'Server error while updating setting'
    });
  }
});

// @route   PUT /api/settings/bulk
// @desc    Update multiple settings at once
// @access  Private (Super Admin only)
router.put('/bulk/update', auth, canAccessSettings, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings)) {
      return res.status(400).json({
        error: 'Settings must be an array'
      });
    }
    
    const results = [];
    const changes = [];
    
    for (const { key, value } of settings) {
      const existingSetting = await SystemSettings.findOne({ key });
      if (existingSetting) {
        const previousValue = existingSetting.value;
        existingSetting.value = value;
        existingSetting.lastModifiedBy = req.admin.id;
        await existingSetting.save();
        
        results.push({ key, success: true });
        changes.push({ key, previousValue, newValue: value });
      } else {
        results.push({ key, success: false, error: 'Setting not found' });
      }
    }
    
    // Log the bulk update
    await createAuditLog(req, 'settings_update', 'settings', 
      `Bulk updated ${changes.length} settings`, {
        details: { changes }
      }
    );
    
    res.json({
      success: true,
      message: 'Settings updated',
      results
    });
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({
      error: 'Server error while updating settings'
    });
  }
});

// @route   POST /api/settings/initialize
// @desc    Initialize default settings
// @access  Private (Super Admin only)
router.post('/initialize', auth, requireSuperAdmin, async (req, res) => {
  try {
    await SystemSettings.initializeDefaults();
    
    await createAuditLog(req, 'settings_update', 'settings', 
      'Initialized default system settings');
    
    res.json({
      success: true,
      message: 'Default settings initialized'
    });
  } catch (error) {
    console.error('Initialize settings error:', error);
    res.status(500).json({
      error: 'Server error while initializing settings'
    });
  }
});

// =============== AUDIT LOGS ROUTES (Super Admin Only) ===============

// @route   GET /api/settings/audit-logs
// @desc    Get all audit logs with filtering
// @access  Private (Super Admin only)
router.get('/audit-logs', auth, canViewAuditLogs, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      action, 
      adminId,
      startDate, 
      endDate,
      search 
    } = req.query;
    
    const result = await AuditLog.getAllLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      action,
      adminId,
      startDate,
      endDate,
      search
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Server error while fetching audit logs'
    });
  }
});

// @route   GET /api/settings/audit-logs/admin/:adminId
// @desc    Get audit logs for a specific admin
// @access  Private (Super Admin only)
router.get('/audit-logs/admin/:adminId', auth, canViewAuditLogs, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 50, category, action, startDate, endDate } = req.query;
    
    const result = await AuditLog.getByAdmin(adminId, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      action,
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get admin audit logs error:', error);
    res.status(500).json({
      error: 'Server error while fetching audit logs'
    });
  }
});

// @route   GET /api/settings/audit-logs/stats
// @desc    Get audit log statistics
// @access  Private (Super Admin only)
router.get('/audit-logs/stats', auth, canViewAuditLogs, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Get action counts
    const actionStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get category counts
    const categoryStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get admin activity counts
    const adminStats = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: { adminId: '$adminId', username: '$adminUsername' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get recent blocked actions
    const blockedActions = await AuditLog.find({ 
      ...dateFilter,
      status: 'blocked' 
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      stats: {
        byAction: actionStats,
        byCategory: categoryStats,
        byAdmin: adminStats,
        recentBlocked: blockedActions
      }
    });
  } catch (error) {
    console.error('Get audit log stats error:', error);
    res.status(500).json({
      error: 'Server error while fetching audit log statistics'
    });
  }
});

module.exports = router;
