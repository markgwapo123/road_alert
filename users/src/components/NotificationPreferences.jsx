import React, { useState, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import * as notificationPreferencesService from '../services/notificationPreferencesService';

/**
 * NotificationPreferences Component
 * 
 * Allows users to manage their notification preferences
 */
const NotificationPreferences = ({ onClose }) => {
  const { notificationPreferences, updatePreferences, pushEnabled } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState(notificationPreferences);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setLocalPreferences(notificationPreferences);
  }, [notificationPreferences]);

  const handleToggle = async (key) => {
    const newPreferences = {
      ...localPreferences,
      [key]: !localPreferences[key]
    };
    setLocalPreferences(newPreferences);
    
    setSaving(true);
    try {
      await updatePreferences(newPreferences);
      setSaveMessage('Preferences saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage('Failed to save preferences');
      setTimeout(() => setSaveMessage(''), 2000);
      // Revert on error
      setLocalPreferences(notificationPreferences);
    } finally {
      setSaving(false);
    }
  };

  const preferences = [
    { key: 'verifiedReports', label: 'Verified Reports', description: 'Get notified when reports are verified', icon: '✅' },
    { key: 'barangayAnnouncements', label: 'Barangay Announcements', description: 'Receive local announcements', icon: '📢' },
    { key: 'emergencyAlerts', label: 'Emergency Alerts', description: 'Critical emergency notifications', icon: '🚨' },
    { key: 'systemNotifications', label: 'System Notifications', description: 'App updates and system messages', icon: '⚙️' },
    { key: 'adminResponses', label: 'Admin Responses', description: 'Replies to your reports', icon: '📩' },
    { key: 'statusUpdates', label: 'Status Updates', description: 'Report status changes', icon: '🔄' }
  ];

  return (
    <div className="notification-preferences-overlay" onClick={onClose}>
      <div className="notification-preferences-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preferences-header">
          <h2>Notification Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="preferences-content">
          {/* Push Notification Status */}
          <div className="preference-item push-status">
            <div className="preference-info">
              <span className="preference-icon">📱</span>
              <div>
                <h3>Push Notifications</h3>
                <p>{pushEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            <div className={`status-badge ${pushEnabled ? 'enabled' : 'disabled'}`}>
              {pushEnabled ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="preferences-list">
            {preferences.map((pref) => (
              <div key={pref.key} className="preference-item">
                <div className="preference-info">
                  <span className="preference-icon">{pref.icon}</span>
                  <div>
                    <h3>{pref.label}</h3>
                    <p>{pref.description}</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={localPreferences[pref.key]}
                    onChange={() => handleToggle(pref.key)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
