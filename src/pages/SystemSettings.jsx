import React, { useState, useEffect } from 'react'
import { 
  Cog6ToothIcon, 
  MapPinIcon, 
  BellIcon, 
  DocumentTextIcon,
  UsersIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAuth, SuperAdminOnly } from '../context/AuthContext'
import config from '../config/index.js'

const SystemSettings = () => {
  const { isSuperAdmin, canAccessSettings } = useAuth()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeCategory, setActiveCategory] = useState('general')
  const [changedSettings, setChangedSettings] = useState({})

  const categories = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon, description: 'Site name, tagline, and general configuration' },
    { id: 'map', name: 'Map Settings', icon: MapPinIcon, description: 'Default map center, zoom level, and clustering' },
    { id: 'notifications', name: 'Notifications', icon: BellIcon, description: 'Push and email notification settings' },
    { id: 'reports', name: 'Reports', icon: DocumentTextIcon, description: 'Report submission and expiration settings' },
    { id: 'users', name: 'Users', icon: UsersIcon, description: 'User registration and limits' },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon, description: 'Session timeout and login security' }
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      
      const response = await fetch(`${config.API_BASE_URL}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data.settings || {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key, value, dataType) => {
    // Convert value based on data type
    let convertedValue = value
    if (dataType === 'number') {
      convertedValue = parseFloat(value) || 0
    } else if (dataType === 'boolean') {
      convertedValue = value === true || value === 'true'
    }

    setChangedSettings(prev => ({
      ...prev,
      [key]: convertedValue
    }))
  }

  const saveSettings = async () => {
    if (Object.keys(changedSettings).length === 0) {
      setSuccess('No changes to save')
      setTimeout(() => setSuccess(null), 3000)
      return
    }

    try {
      setSaving(true)
      setError(null)
      const token = localStorage.getItem('adminToken')

      // Save each changed setting
      const settingsToSave = Object.entries(changedSettings).map(([key, value]) => ({
        key,
        value
      }))

      const response = await fetch(`${config.API_BASE_URL}/settings/bulk/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: settingsToSave })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSuccess('Settings saved successfully')
      setChangedSettings({})
      await fetchSettings()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initializeDefaults = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('adminToken')

      const response = await fetch(`${config.API_BASE_URL}/settings/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to initialize settings')
      }

      setSuccess('Default settings initialized successfully')
      await fetchSettings()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getCurrentValue = (key, originalValue) => {
    return changedSettings.hasOwnProperty(key) ? changedSettings[key] : originalValue
  }

  const renderSettingInput = (setting) => {
    const currentValue = getCurrentValue(setting.key, setting.value)
    const hasChanged = changedSettings.hasOwnProperty(setting.key)

    switch (setting.dataType) {
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked, 'boolean')}
              className="sr-only peer"
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 ${hasChanged ? 'ring-2 ring-yellow-400' : ''}`}></div>
          </label>
        )
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value, 'number')}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-black bg-white ${hasChanged ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-300'}`}
          />
        )
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value, 'string')}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-black bg-white ${hasChanged ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-300'}`}
          />
        )
    }
  }

  // Check access
  if (!isSuperAdmin()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <ShieldCheckIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
        <p className="text-red-600">
          Only Super Admins can access system settings.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="h-8 w-8 text-red-600" />
              System Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure system-wide settings for the BantayDalan platform
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={initializeDefaults}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4 inline mr-1" />
              Reset to Defaults
            </button>
            <button
              onClick={saveSettings}
              disabled={saving || Object.keys(changedSettings).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save Changes ${Object.keys(changedSettings).length > 0 ? `(${Object.keys(changedSettings).length})` : ''}`}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}
      </div>

      {/* Settings Content */}
      <div className="flex gap-6">
        {/* Category Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border">
            <nav className="space-y-1 p-2">
              {categories.map((category) => {
                const Icon = category.icon
                const isActive = activeCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                    {category.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {categories.map((category) => {
              if (category.id !== activeCategory) return null
              const Icon = category.icon
              const categorySettings = settings[category.id] || []

              return (
                <div key={category.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <Icon className="h-6 w-6 text-red-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                      <p className="text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>

                  {categorySettings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No settings found for this category.</p>
                      <button
                        onClick={initializeDefaults}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Initialize default settings
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {categorySettings.map((setting) => (
                        <div key={setting.key} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {setting.isPublic && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                    Public
                                  </span>
                                )}
                              </label>
                              <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>
                            <div className="ml-4 min-w-[200px]">
                              {renderSettingInput(setting)}
                            </div>
                          </div>
                          {setting.lastModifiedBy && (
                            <p className="text-xs text-gray-400">
                              Last modified by: {setting.lastModifiedBy.username || 'Unknown'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Indicator */}
      {Object.keys(changedSettings).length > 0 && (
        <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
          <span className="text-yellow-700 text-sm">
            You have {Object.keys(changedSettings).length} unsaved change{Object.keys(changedSettings).length > 1 ? 's' : ''}
          </span>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700"
          >
            Save Now
          </button>
        </div>
      )}
    </div>
  )
}

export default SystemSettings
