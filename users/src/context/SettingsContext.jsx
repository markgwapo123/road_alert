import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import config from '../config/index.js';

const SettingsContext = createContext(null);

// Default settings (fallback values)
const DEFAULT_SETTINGS = {
  // General
  site_name: 'BantayDalan',
  site_description: 'Community Road Alert System',
  site_tagline: 'Report. Alert. Protect.',
  contact_email: 'support@bantaydalan.com',
  contact_phone: '',
  timezone: 'Asia/Manila',
  date_format: 'MMM DD, YYYY',
  language: 'en',
  
  // Maintenance
  maintenance_mode: false,
  maintenance_message: '',
  maintenance_scheduled_start: '',
  maintenance_scheduled_end: '',
  
  // Map
  map_default_center_lat: 10.1617,
  map_default_center_lng: 122.9747,
  map_default_zoom: 10,
  map_style: 'streets',
  map_cluster_radius: 50,
  
  // Reports
  max_reports_per_day: 10,
  require_image: true,
  require_location: true,
  max_images_per_report: 5,
  allow_anonymous_reports: false,
  report_expiry_days: 30,
  
  // Users
  allow_user_registration: true,
  require_email_verification: false,
  min_password_length: 8,
  session_timeout_minutes: 1440,
  
  // Security
  require_strong_passwords: true,
  two_factor_auth: false,
  
  // Notifications
  notifications_enabled: true,
  email_notifications: true,
  push_notifications: true,
  notification_frequency: 'immediate'
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/settings/public`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.settings) {
        // Merge with defaults to ensure all settings exist
        setSettings(prev => ({
          ...DEFAULT_SETTINGS,
          ...data.settings
        }));
        setError(null);
      }
      
      setLastFetched(Date.now());
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err.message);
      // Keep using default settings on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Refresh settings periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(fetchSettings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  // Get a single setting with fallback
  const getSetting = useCallback((key, defaultValue = null) => {
    if (settings[key] !== undefined) {
      return settings[key];
    }
    if (DEFAULT_SETTINGS[key] !== undefined) {
      return DEFAULT_SETTINGS[key];
    }
    return defaultValue;
  }, [settings]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback((featureKey) => {
    return getSetting(featureKey, false) === true;
  }, [getSetting]);

  // Format date according to system settings
  const formatDate = useCallback((dateString, includeTime = false) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const timezone = getSetting('timezone', 'Asia/Manila');
      const format = getSetting('date_format', 'MMM DD, YYYY');
      
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      
      return date.toLocaleDateString('en-US', options);
    } catch {
      return dateString;
    }
  }, [getSetting]);

  // Get map configuration
  const getMapConfig = useCallback(() => {
    return {
      center: {
        lat: getSetting('map_default_center_lat', 10.1617),
        lng: getSetting('map_default_center_lng', 122.9747)
      },
      zoom: getSetting('map_default_zoom', 10),
      style: getSetting('map_style', 'streets'),
      clusterRadius: getSetting('map_cluster_radius', 50)
    };
  }, [getSetting]);

  // Get report configuration
  const getReportConfig = useCallback(() => {
    return {
      requireImage: getSetting('require_image', true),
      requireLocation: getSetting('require_location', true),
      maxImages: getSetting('max_images_per_report', 5),
      maxReportsPerDay: getSetting('max_reports_per_day', 10),
      allowAnonymous: getSetting('allow_anonymous_reports', false)
    };
  }, [getSetting]);

  // Get auth configuration  
  const getAuthConfig = useCallback(() => {
    return {
      allowRegistration: getSetting('allow_user_registration', true),
      requireEmailVerification: getSetting('require_email_verification', false),
      minPasswordLength: getSetting('min_password_length', 8),
      requireStrongPassword: getSetting('require_strong_passwords', true),
      twoFactorEnabled: getSetting('two_factor_auth', false),
      sessionTimeout: getSetting('session_timeout_minutes', 1440)
    };
  }, [getSetting]);

  // Check maintenance mode
  const isMaintenanceMode = useCallback(() => {
    return getSetting('maintenance_mode', false) === true;
  }, [getSetting]);

  // Get maintenance info
  const getMaintenanceInfo = useCallback(() => {
    return {
      enabled: getSetting('maintenance_mode', false),
      message: getSetting('maintenance_message', 'System is under maintenance'),
      scheduledStart: getSetting('maintenance_scheduled_start', ''),
      scheduledEnd: getSetting('maintenance_scheduled_end', '')
    };
  }, [getSetting]);

  // Validate password against system requirements
  const validatePassword = useCallback((password) => {
    const errors = [];
    const minLength = getSetting('min_password_length', 8);
    const requireStrong = getSetting('require_strong_passwords', true);
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (requireStrong) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [getSetting]);

  const value = {
    settings,
    loading,
    error,
    lastFetched,
    getSetting,
    isFeatureEnabled,
    formatDate,
    getMapConfig,
    getReportConfig,
    getAuthConfig,
    isMaintenanceMode,
    getMaintenanceInfo,
    validatePassword,
    refreshSettings: fetchSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// HOC for components that need settings
export const withSettings = (Component) => {
  return function WrappedComponent(props) {
    const settings = useSettings();
    return <Component {...props} settings={settings} />;
  };
};

export default SettingsContext;
