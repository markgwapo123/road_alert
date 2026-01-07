const SystemSettings = require('../models/SystemSettings');

// Cache settings for performance (refresh every 60 seconds)
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds

const refreshSettingsCache = async () => {
  const now = Date.now();
  if (!settingsCache || now - cacheTimestamp > CACHE_TTL) {
    settingsCache = await SystemSettings.getAllAsObject();
    cacheTimestamp = now;
  }
  return settingsCache;
};

// Get a single setting with default fallback
const getSetting = async (key, defaultValue = null) => {
  const settings = await refreshSettingsCache();
  return settings[key] !== undefined ? settings[key] : defaultValue;
};

// Clear cache (call after settings update)
const clearSettingsCache = () => {
  settingsCache = null;
  cacheTimestamp = 0;
};

// ==================== MIDDLEWARE FUNCTIONS ====================

/**
 * Check maintenance mode - blocks all requests if maintenance is enabled
 * Allows admins if maintenance_allow_admins is true
 */
const checkMaintenanceMode = async (req, res, next) => {
  try {
    const maintenanceMode = await getSetting('maintenance_mode', false);
    
    if (!maintenanceMode) {
      return next();
    }
    
    // Check if admins are allowed during maintenance
    const allowAdmins = await getSetting('maintenance_allow_admins', true);
    
    // Check if current user is an admin (from admin auth middleware)
    if (allowAdmins && req.admin) {
      return next();
    }
    
    // Get maintenance details for response
    const maintenanceMessage = await getSetting('maintenance_message', 'System is under maintenance');
    const scheduledEnd = await getSetting('maintenance_scheduled_end', '');
    
    return res.status(503).json({
      success: false,
      error: 'System is under maintenance',
      maintenance: {
        enabled: true,
        message: maintenanceMessage,
        scheduledEnd: scheduledEnd
      }
    });
  } catch (error) {
    console.error('Maintenance check error:', error);
    next(); // Don't block on error
  }
};

/**
 * Check if user registration is allowed
 */
const checkRegistrationAllowed = async (req, res, next) => {
  try {
    const allowRegistration = await getSetting('allow_user_registration', true);
    
    if (!allowRegistration) {
      return res.status(403).json({
        success: false,
        error: 'New user registration is currently disabled'
      });
    }
    
    next();
  } catch (error) {
    console.error('Registration check error:', error);
    next();
  }
};

/**
 * Validate password against system requirements
 */
const validatePasswordRequirements = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return next();
    }
    
    const minLength = await getSetting('min_password_length', 8);
    const requireStrong = await getSetting('require_strong_passwords', true);
    
    // Check minimum length
    if (password.length < minLength) {
      return res.status(400).json({
        success: false,
        error: `Password must be at least ${minLength} characters long`
      });
    }
    
    // Check strong password requirements
    if (requireStrong) {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      
      if (!hasUppercase || !hasLowercase || !hasNumber) {
        return res.status(400).json({
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Password validation error:', error);
    next();
  }
};

/**
 * Check daily report limit for user
 */
const checkDailyReportLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    const Report = require('../models/Report');
    const maxReportsPerDay = await getSetting('max_reports_per_day', 10);
    
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
    
    // Attach limit info to request for later use
    req.dailyLimit = {
      maxReports: maxReportsPerDay,
      usedToday: todayReportsCount,
      remaining: maxReportsPerDay - todayReportsCount
    };
    
    next();
  } catch (error) {
    console.error('Daily limit check error:', error);
    next();
  }
};

/**
 * Validate report requirements (image, location)
 */
const validateReportRequirements = async (req, res, next) => {
  try {
    const requireImage = await getSetting('require_image', true);
    const requireLocation = await getSetting('require_location', true);
    
    // Check image requirement
    if (requireImage && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'An image is required for this report'
      });
    }
    
    // Check location requirement
    if (requireLocation) {
      const location = req.body['location[coordinates][latitude]'] || req.body.location?.coordinates?.latitude;
      if (!location) {
        return res.status(400).json({
          success: false,
          error: 'GPS location is required for this report'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Report validation error:', error);
    next();
  }
};

/**
 * Rate limiting based on system settings
 */
const settingsBasedRateLimit = async (req, res, next) => {
  try {
    const rateLimitEnabled = await getSetting('rate_limiting', true);
    
    if (!rateLimitEnabled) {
      return next();
    }
    
    const maxRequests = await getSetting('rate_limit_requests', 100);
    const windowMinutes = await getSetting('rate_limit_window_minutes', 15);
    
    // Simple in-memory rate limiting (for production, use Redis)
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }
    
    const clientData = global.rateLimitStore.get(clientIP) || { count: 0, resetTime: now + windowMs };
    
    // Reset if window expired
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }
    
    clientData.count++;
    global.rateLimitStore.set(clientIP, clientData);
    
    // Add headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));
    
    if (clientData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next();
  }
};

/**
 * Check login attempts and handle lockout
 */
const checkLoginAttempts = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    const loginId = email || username;
    
    if (!loginId) {
      return next();
    }
    
    const maxAttempts = await getSetting('max_login_attempts', 5);
    const lockoutMinutes = await getSetting('lockout_duration_minutes', 30);
    
    if (!global.loginAttempts) {
      global.loginAttempts = new Map();
    }
    
    const key = loginId.toLowerCase();
    const attempts = global.loginAttempts.get(key) || { count: 0, lockoutUntil: null };
    
    // Check if currently locked out
    if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
      const remainingMinutes = Math.ceil((attempts.lockoutUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        locked: true,
        lockoutRemaining: remainingMinutes
      });
    }
    
    // Reset if lockout expired
    if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
      attempts.count = 0;
      attempts.lockoutUntil = null;
    }
    
    // Attach to request for later use (to record failed attempts)
    req.loginAttempts = {
      key,
      attempts,
      maxAttempts,
      lockoutMinutes,
      recordFailure: () => {
        attempts.count++;
        if (attempts.count >= maxAttempts) {
          attempts.lockoutUntil = Date.now() + (lockoutMinutes * 60 * 1000);
        }
        global.loginAttempts.set(key, attempts);
      },
      recordSuccess: () => {
        global.loginAttempts.delete(key);
      }
    };
    
    next();
  } catch (error) {
    console.error('Login attempts check error:', error);
    next();
  }
};

module.exports = {
  getSetting,
  clearSettingsCache,
  refreshSettingsCache,
  checkMaintenanceMode,
  checkRegistrationAllowed,
  validatePasswordRequirements,
  checkDailyReportLimit,
  validateReportRequirements,
  settingsBasedRateLimit,
  checkLoginAttempts
};
