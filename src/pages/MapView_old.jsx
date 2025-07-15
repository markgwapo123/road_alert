import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import InteractiveMap from '../components/InteractiveMap'
import { reportsAPI } from '../services/api'

const MapView = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    severity: 'all'
  })
  const [selectedReport, setSelectedReport] = useState(null)

  // Mock data for when API is not availablecm
  const mockReports = [
    {
      id: 1,
      type: 'pothole',
      location: {
        address: 'EDSA, Quezon City',
        coordinates: { latitude: 14.6507, longitude: 121.0280 }
      },
      status: 'pending',
      severity: 'high',
      description: 'Large pothole causing traffic disruption',
      createdAt: '2024-01-15T08:30:00Z',
      reportedBy: { name: 'John Doe' }
    },
    {
      id: 2,
      type: 'debris',
      location: {
        address: 'C5 Road, Makati',
        coordinates: { latitude: 14.5547, longitude: 121.0244 }
      },
      status: 'verified',
      severity: 'medium',
      description: 'Construction debris blocking lane',
      createdAt: '2024-01-15T06:15:00Z',
      reportedBy: { name: 'Jane Smith' }
    },
    {
      id: 3,
      type: 'flooding',
      location: {
        address: 'Roxas Boulevard, Manila',
        coordinates: { latitude: 14.5764, longitude: 120.9822 }
      },
      status: 'verified',
      severity: 'high',
      description: 'Road flooding after heavy rain',
      createdAt: '2024-01-15T05:45:00Z',
      reportedBy: { name: 'Mike Johnson' }
    },
    {
      id: 4,
      type: 'construction',
      location: {
        address: 'Ortigas Avenue, Pasig',
        coordinates: { latitude: 14.5832, longitude: 121.0633 }
      },
      status: 'resolved',
      severity: 'low',
      description: 'Road construction completed',
      createdAt: '2024-01-14T10:20:00Z',
      reportedBy: { name: 'DPWH Team' }
    },
    {
      id: 5,
      type: 'accident',
      location: {
        address: 'Commonwealth Avenue, QC',
        coordinates: { latitude: 14.6760, longitude: 121.0437 }
      },
      status: 'pending',
      severity: 'high',
      description: 'Vehicle accident blocking traffic',
      createdAt: '2024-01-15T09:15:00Z',
      reportedBy: { name: 'Traffic Enforcer' }
    }
  ]
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
        setReports([]) // Show empty map instead of mock data
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchReports, 10000) // Poll every 10 seconds
    
    return () => clearInterval(interval)
  }, [filters])

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
      </div>

      {/* Map Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Reports</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>
            <select 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="pothole">Pothole</option>
              <option value="debris">Debris</option>
              <option value="flooding">Flooding</option>
              <option value="construction">Construction</option>
              <option value="accident">Accident</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Severity
            </label>
            <select 
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
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
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  View Full Report
                </button>
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  Update Status
                </button>
                <button
                  onClick={() => {
                    const coords = `${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`
                    window.open(`https://www.google.com/maps?q=${coords}`, '_blank')
                  }}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Open in Google Maps
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
