import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import InteractiveMap from '../components/InteractiveMap'
import { reportsAPI } from '../services/api'

const MapView = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: 'verified', // Default to verified reports for public map
    type: 'all',
    severity: 'all'
  })
  const [selectedReport, setSelectedReport] = useState(null)
  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching map reports with filters:', filters)
        const response = await reportsAPI.getMapReports(filters)
        console.log('Map reports response:', response.data)
        setReports(response.data.data || [])
      } catch (err) {
        console.error('Failed to fetch map reports:', err)
        setError('Failed to load reports')
        setReports([])
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
    
    // Remove auto-refresh - now using manual refresh button
    // const interval = setInterval(fetchReports, 10000) // Poll every 10 seconds
    // return () => clearInterval(interval)
  }, [filters])

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Manually refreshing map reports with filters:', filters)
      const response = await reportsAPI.getMapReports(filters)
      console.log('Map reports response:', response.data)
      setReports(response.data.data || [])
    } catch (err) {
      console.error('Failed to refresh map reports:', err)
      setError('Failed to refresh reports')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const handleReportClick = (report) => {
    setSelectedReport(report)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'verified': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'resolved': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading map...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interactive Map</h1>
        <p className="text-gray-600">View all road hazard reports on the map</p>
      </div>      {/* Map Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Map Filters</h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Map'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="all" className="text-gray-900">All Reports</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="verified" className="text-gray-900">Verified</option>
              <option value="rejected" className="text-gray-900">Rejected</option>
              <option value="resolved" className="text-gray-900">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="all" className="text-gray-900">All Types</option>
              <option value="pothole" className="text-gray-900">Pothole</option>
              <option value="debris" className="text-gray-900">Debris</option>
              <option value="flooding" className="text-gray-900">Flooding</option>
              <option value="construction" className="text-gray-900">Construction</option>
              <option value="accident" className="text-gray-900">Accident</option>
              <option value="other" className="text-gray-900">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Severity
            </label>            <select 
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="all" className="text-gray-900">All Severities</option>
              <option value="high" className="text-gray-900">High</option>
              <option value="medium" className="text-gray-900">Medium</option>
              <option value="low" className="text-gray-900">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Count and Location Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-blue-900">
              Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-blue-700">
              Map centered on Kabankalan City, Negros Occidental
            </p>
          </div>
          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Map</h2>
        <InteractiveMap 
          reports={reports}
          filters={filters}
          onReportClick={handleReportClick}
        />
      </div>

      {/* Selected Report Details */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-xl font-medium text-gray-900 capitalize">
                  {selectedReport.type}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                  {selectedReport.status}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <strong>Location:</strong> {selectedReport.location.address}
                </p>
                <p className="text-gray-600">
                  <strong>Coordinates:</strong> {selectedReport.location.coordinates.latitude.toFixed(6)}, {selectedReport.location.coordinates.longitude.toFixed(6)}
                </p>
                <p className="text-gray-600">
                  <strong>Severity:</strong> 
                  <span className={`font-medium ml-1 ${getSeverityColor(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </span>
                </p>
                <p className="text-gray-600">
                  <strong>Reported:</strong> {new Date(selectedReport.createdAt).toLocaleDateString()}
                </p>
                {selectedReport.reportedBy?.name && (
                  <p className="text-gray-600">
                    <strong>Reported by:</strong> {selectedReport.reportedBy.name}
                  </p>
                )}
                {selectedReport.description && (
                  <p className="text-gray-600 mt-2">
                    <strong>Description:</strong> {selectedReport.description}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const coords = `${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`
                    window.open(`https://www.google.com/maps?q=${coords}`, '_blank')
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open in Google Maps
                </button>
                <button
                  onClick={() => {
                    const coords = `${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`
                    window.open(`https://www.openstreetmap.org/?mlat=${selectedReport.location.coordinates.latitude}&mlon=${selectedReport.location.coordinates.longitude}#map=15/${selectedReport.location.coordinates.latitude}/${selectedReport.location.coordinates.longitude}`, '_blank')
                  }}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Open in OpenStreetMap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">High Severity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Medium Severity / Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Low Severity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Resolved</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>P</strong> = Pothole, <strong>D</strong> = Debris, <strong>F</strong> = Flooding, <strong>C</strong> = Construction, <strong>A</strong> = Accident, <strong>O</strong> = Other</p>
        </div>
      </div>
    </div>
  )
}

export default MapView
