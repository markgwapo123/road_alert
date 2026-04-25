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
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  PhoneIcon,
  ShieldExclamationIcon,
  TrashIcon,
  PlusIcon,
  PencilSquareIcon,
  CheckIcon
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
  const [activeCategory, setActiveCategory] = useState('maintenance')
  const [changedSettings, setChangedSettings] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingCity, setEditingCity] = useState(null)
  
  // Maintenance mode state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)

  const categories = [
    { id: 'maintenance', name: 'Maintenance', icon: WrenchScrewdriverIcon, description: 'System maintenance mode and scheduled downtime' },
    { id: 'general', name: 'General', icon: Cog6ToothIcon, description: 'Site name, tagline, and general configuration' },
    { id: 'map', name: 'Map Settings', icon: MapPinIcon, description: 'Default map center, zoom level, and clustering' },
    { id: 'reports', name: 'Reports', icon: DocumentTextIcon, description: 'Report submission and expiration settings' },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon, description: 'Session timeout and login security' },
    { id: 'emergency', name: 'Emergency', icon: ShieldExclamationIcon, description: 'Manage city-specific emergency hotlines' }
  ]

  useEffect(() => {
    fetchSettings()
    fetchMaintenanceStatus()
    
    // Check maintenance status every 3 seconds for auto-expiration
    const maintenanceCheckInterval = setInterval(() => {
      fetchMaintenanceStatus()
    }, 3000) // Check every 3 seconds
    
    return () => clearInterval(maintenanceCheckInterval)
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

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/settings/maintenance/status`)
      if (response.ok) {
        const data = await response.json()
        setMaintenanceEnabled(data.maintenance.enabled)
        setMaintenanceMessage(data.maintenance.message || '')
        setScheduledStart(data.maintenance.scheduledStart || '')
        setScheduledEnd(data.maintenance.scheduledEnd || '')
      }
    } catch (err) {
      console.error('Failed to fetch maintenance status:', err)
    }
  }

  const toggleMaintenanceMode = async (enabled) => {
    try {
      setMaintenanceLoading(true)
      setError(null)
      const token = localStorage.getItem('adminToken')

      const response = await fetch(`${config.API_BASE_URL}/settings/maintenance/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled,
          message: maintenanceMessage,
          scheduledStart,
          scheduledEnd
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle maintenance mode')
      }

      const data = await response.json()
      setMaintenanceEnabled(data.maintenance.enabled)
      setSuccess(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setMaintenanceLoading(false)
    }
  }

  const saveMaintenanceSettings = async () => {
    try {
      setMaintenanceLoading(true)
      setError(null)
      const token = localStorage.getItem('adminToken')

      const response = await fetch(`${config.API_BASE_URL}/settings/maintenance/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: maintenanceEnabled,
          message: maintenanceMessage,
          scheduledStart,
          scheduledEnd
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save maintenance settings')
      }

      setSuccess('Maintenance settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setMaintenanceLoading(false)
    }
  }

  const handleSettingChange = (key, value, dataType) => {
    // Convert value based on data type
    let convertedValue = value
    if (dataType === 'number') {
      // Handle empty input as 0, otherwise parse the number
      // Use explicit check to allow 0 as a valid value
      const numValue = parseFloat(value)
      convertedValue = isNaN(numValue) ? 0 : numValue
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

  const renderEmergencyEditor = (setting) => {
    const currentValue = getCurrentValue(setting.key, setting.value) || {}
    const hasChanged = changedSettings.hasOwnProperty(setting.key)

    const updateEmergencyContact = (city, agency, field, value) => {
      const newContacts = JSON.parse(JSON.stringify(currentValue)) // deep clone
      if (!newContacts[city]) newContacts[city] = { police: { number: '', label: '' }, fire: { number: '', label: '' }, medical: { number: '', label: '' } }
      
      if (typeof newContacts[city][agency] === 'string') {
        newContacts[city][agency] = { number: newContacts[city][agency], label: '' }
      }
      
      newContacts[city][agency][field] = value
      handleSettingChange(setting.key, newContacts, 'object')
    }

    const removeCity = (city) => {
      const newContacts = JSON.parse(JSON.stringify(currentValue))
      delete newContacts[city]
      handleSettingChange(setting.key, newContacts, 'object')
    }

    const addCity = () => {
      const cityName = window.prompt('Enter new city/municipality name:')
      if (cityName && !currentValue[cityName]) {
        const newContacts = JSON.parse(JSON.stringify(currentValue))
        newContacts[cityName] = {
          police: { number: '', label: `${cityName} PNP` },
          fire: { number: '', label: `BFP ${cityName}` },
          medical: { number: '', label: `${cityName} DRRMO` }
        }
        handleSettingChange(setting.key, newContacts, 'object')
      }
    }

    return (
      <div className={`space-y-6 w-full ${hasChanged ? 'border-2 border-yellow-400 p-4 rounded-lg bg-yellow-50/30' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-gray-900">City Hotline Directory</h4>
            <p className="text-xs text-gray-500">Configure Police, Fire, and Medical contacts per location.</p>
          </div>
          <button
            onClick={addCity}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-md"
          >
            <PlusIcon className="h-4 w-4" /> Add New City
          </button>
        </div>

          {Object.entries(currentValue).map(([city, contacts]) => (
            <div key={city} className={`bg-white border ${editingCity === city ? 'border-slate-900 ring-1 ring-slate-900' : 'border-gray-200'} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all`}>
              <div className={`px-5 py-3 flex justify-between items-center border-b ${editingCity === city ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-gray-200'}`}>
                <span className={`font-bold flex items-center gap-2 ${editingCity === city ? 'text-white' : 'text-slate-700'}`}>
                  <MapPinIcon className={`h-4 w-4 ${editingCity === city ? 'text-slate-300' : 'text-slate-400'}`} />
                  {city}
                  {editingCity === city && <span className="ml-2 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-widest">Editing Mode</span>}
                </span>
                <div className="flex items-center gap-1">
                  {editingCity === city ? (
                    <button
                      onClick={() => setEditingCity(null)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-all border border-white/20"
                    >
                      <CheckIcon className="h-3.5 w-3.5" /> Done
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingCity(city)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 text-[10px] font-bold rounded-lg transition-all border border-slate-200"
                    >
                      <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                  <button
                    onClick={() => removeCity(city)}
                    className={`p-1.5 rounded-lg transition-all ${editingCity === city ? 'text-white/40 hover:text-red-400 hover:bg-white/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                    title="Remove City"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className={`p-5 grid grid-cols-1 md:grid-cols-3 gap-6 transition-opacity ${editingCity !== city ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                {['police', 'fire', 'medical'].map((agency) => {
                  const data = typeof contacts[agency] === 'string' 
                    ? { number: contacts[agency], label: '' } 
                    : contacts[agency] || { number: '', label: '' }

                  const isEditable = editingCity === city

                  return (
                    <div key={agency} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${agency === 'police' ? 'bg-blue-500' : agency === 'fire' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{agency}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block uppercase">Number</label>
                          <input
                            type="text"
                            placeholder="Phone Number"
                            disabled={!isEditable}
                            value={data.number}
                            onChange={(e) => updateEmergencyContact(city, agency, 'number', e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 transition-all ${isEditable ? 'border-slate-300 focus:ring-slate-900 focus:border-slate-900 text-slate-900 bg-white' : 'border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed'}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block uppercase">Department Label</label>
                          <input
                            type="text"
                            placeholder="e.g. Bacolod PNP"
                            disabled={!isEditable}
                            value={data.label}
                            onChange={(e) => updateEmergencyContact(city, agency, 'label', e.target.value)}
                            className={`w-full px-3 py-2 text-[11px] border rounded-lg focus:ring-2 transition-all ${isEditable ? 'border-slate-200 focus:ring-slate-900 focus:border-slate-900 text-slate-600 bg-white' : 'border-gray-50 text-gray-300 bg-white cursor-not-allowed'}`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    )
  }

  const renderSettingInput = (setting) => {
    const currentValue = getCurrentValue(setting.key, setting.value)
    const hasChanged = changedSettings.hasOwnProperty(setting.key)

    if (setting.key === 'emergency_contacts') {
      return renderEmergencyEditor(setting)
    }

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
          <div>
            <input
              type="number"
              min="0"
              value={currentValue}
              onChange={(e) => handleSettingChange(setting.key, e.target.value, 'number')}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm text-black bg-white ${hasChanged ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-300'}`}
            />
            {setting.key === 'lockout_duration_minutes' && currentValue === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                0 = No lockout (immediate access after failed attempts)
              </p>
            )}
          </div>
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
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Cog6ToothIcon className="h-6 w-6 md:h-8 md:w-8 text-red-600 flex-shrink-0" />
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                  System Settings
                </h1>
                <p className="hidden md:block mt-1 text-sm text-gray-500">
                  Configure system-wide settings for the BantayDalan platform
                </p>
              </div>
            </div>
          </div>
          
          {/* Buttons - stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={initializeDefaults}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reset to Defaults
            </button>
            <button
              onClick={saveSettings}
              disabled={saving || Object.keys(changedSettings).length === 0}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save Changes ${Object.keys(changedSettings).length > 0 ? `(${Object.keys(changedSettings).length})` : ''}`}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 md:p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Mobile Category Selector Button */}
      <div className="md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg shadow-sm border text-left"
        >
          <div className="flex items-center gap-3">
            {(() => {
              const currentCategory = categories.find(c => c.id === activeCategory)
              const Icon = currentCategory?.icon || Cog6ToothIcon
              return (
                <>
                  <Icon className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-gray-900">{currentCategory?.name}</span>
                </>
              )
            })()}
          </div>
          {sidebarOpen ? (
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <Bars3Icon className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {/* Mobile Dropdown Menu */}
        {sidebarOpen && (
          <div className="mt-2 bg-white rounded-lg shadow-sm border overflow-hidden">
            <nav className="divide-y divide-gray-100">
              {categories.map((category) => {
                const Icon = category.icon
                const isActive = activeCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                    {category.name}
                  </button>
                )
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Settings Content */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Category Sidebar - Hidden on mobile */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border sticky top-4">
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
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
            {/* Maintenance Mode Panel */}
            {activeCategory === 'maintenance' && (
              <div>
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <WrenchScrewdriverIcon className="h-5 w-5 md:h-6 md:w-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-gray-900">Maintenance Mode</h2>
                    <p className="text-xs md:text-sm text-gray-500">Control system availability and scheduled downtime</p>
                  </div>
                </div>

                {/* Maintenance Status Card */}
                <div className={`rounded-lg p-4 md:p-6 mb-4 md:mb-6 ${maintenanceEnabled ? 'bg-orange-50 border-2 border-orange-300' : 'bg-green-50 border-2 border-green-300'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      {maintenanceEnabled ? (
                        <ExclamationTriangleIcon className="h-10 w-10 md:h-12 md:w-12 text-orange-500 flex-shrink-0" />
                      ) : (
                        <CheckCircleIcon className="h-10 w-10 md:h-12 md:w-12 text-green-500 flex-shrink-0" />
                      )}
                      <div>
                        <h3 className={`text-lg md:text-xl font-bold ${maintenanceEnabled ? 'text-orange-700' : 'text-green-700'}`}>
                          {maintenanceEnabled ? 'Maintenance Mode Active' : 'System Online'}
                        </h3>
                        <p className={`text-xs md:text-sm ${maintenanceEnabled ? 'text-orange-600' : 'text-green-600'}`}>
                          {maintenanceEnabled 
                            ? 'Users cannot access the system.' 
                            : 'The system is fully operational.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMaintenanceMode(!maintenanceEnabled)}
                      disabled={maintenanceLoading}
                      className={`w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold text-white text-sm md:text-base transition-colors ${
                        maintenanceEnabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-orange-600 hover:bg-orange-700'
                      } disabled:opacity-50`}
                    >
                      {maintenanceLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : maintenanceEnabled ? (
                        'Disable Maintenance'
                      ) : (
                        'Enable Maintenance'
                      )}
                    </button>
                  </div>
                </div>

                {/* Maintenance Settings */}
                <div className="space-y-4 md:space-y-6">
                  {/* Maintenance Message */}
                  <div className="border-b border-gray-100 pb-4 md:pb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Maintenance Message
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      This message will be displayed to users when maintenance mode is enabled.
                    </p>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm text-black bg-white"
                      placeholder="We are currently performing scheduled maintenance. Please check back soon."
                    />
                  </div>

                  {/* Scheduled Maintenance */}
                  <div className="border-b border-gray-100 pb-4 md:pb-6">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <ClockIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-700">Scheduled Maintenance Window</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 md:mb-4">
                      Optionally set a scheduled maintenance window.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Start Time
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledStart}
                          onChange={(e) => setScheduledStart(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm text-black bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          End Time (Estimated)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledEnd}
                          onChange={(e) => setScheduledEnd(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 text-sm text-black bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 md:mb-4">Quick Actions</h4>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={saveMaintenanceSettings}
                        disabled={maintenanceLoading}
                        className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {maintenanceLoading ? 'Saving...' : 'Save Settings'}
                      </button>
                      <button
                        onClick={() => {
                          setMaintenanceMessage('We are currently performing scheduled maintenance. Please check back soon.')
                          setScheduledStart('')
                          setScheduledEnd('')
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Reset to Default
                      </button>
                    </div>
                  </div>

                  {/* Maintenance Mode Info */}
                  <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ About Maintenance Mode</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Users will see a maintenance page</li>
                      <li>• Admins can still access the admin panel</li>
                      <li>• API returns 503 Service Unavailable</li>
                      <li>• Use scheduled windows to inform users</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Other Category Settings */}
            {activeCategory !== 'maintenance' && categories.map((category) => {
              if (category.id !== activeCategory) return null
              const Icon = category.icon
              const categorySettings = settings[category.id] || []

              return (
                <div key={category.id}>
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-base md:text-lg font-semibold text-gray-900">{category.name}</h2>
                      <p className="text-xs md:text-sm text-gray-500">{category.description}</p>
                    </div>
                  </div>

                  {categorySettings.length === 0 ? (
                    <div className="text-center py-6 md:py-8 text-gray-500">
                      <p className="text-sm">No settings found for this category.</p>
                      <button
                        onClick={initializeDefaults}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Initialize default settings
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      {categorySettings.map((setting) => (
                        <div key={setting.key} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-2">
                            {setting.key !== 'emergency_contacts' && (
                              <div className="flex-1 min-w-0">
                                <label className="block text-sm font-medium text-gray-700">
                                  {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  {setting.isPublic && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                      Public
                                    </span>
                                  )}
                                </label>
                                <p className="text-xs md:text-sm text-gray-500 mt-0.5">{setting.description}</p>
                              </div>
                            )}
                            <div className={setting.key === 'emergency_contacts' ? 'w-full' : 'w-full sm:w-auto sm:min-w-[200px]'}>
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
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-3 md:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 z-50">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <span className="text-yellow-700 text-sm">
              {Object.keys(changedSettings).length} unsaved change{Object.keys(changedSettings).length > 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700"
          >
            Save Now
          </button>
        </div>
      )}
    </div>
  )
}

export default SystemSettings
