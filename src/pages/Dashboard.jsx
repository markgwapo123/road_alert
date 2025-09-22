import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import SystemStatus from '../components/SystemStatus'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    verifiedReports: 0,
    rejectedReports: 0
  })
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Try to fetch real stats
        const statsResponse = await reportsAPI.getReportsStats()
        console.log('Admin Dashboard Stats Response:', statsResponse.data)
        
        setStats({
          totalReports: statsResponse.data.totalReports,
          pendingReports: statsResponse.data.pending,
          verifiedReports: statsResponse.data.verified,
          rejectedReports: statsResponse.data.rejected
        })

        // Fetch recent reports
        const reportsResponse = await reportsAPI.getAllReports({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
        setRecentReports(reportsResponse.data.data)
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // Use mock data if API is not available
        console.log('API not available, using mock data')
        setStats({
          totalReports: 142,
          pendingReports: 23,
          verifiedReports: 98,
          rejectedReports: 21
        })

        setRecentReports([
          {
            id: 1,
            type: 'pothole',
            location: { address: 'EDSA, Quezon City' },
            status: 'pending',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            severity: 'high',
            reportedBy: { name: 'John Doe' }
          },
          {
            id: 2,
            type: 'debris',
            location: { address: 'C5 Road, Makati' },
            status: 'verified',
            createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
            severity: 'medium',
            reportedBy: { name: 'Jane Smith' }
          },
          {
            id: 3,
            type: 'flooding',
            location: { address: 'Roxas Boulevard, Manila' },
            status: 'pending',
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
            severity: 'high',
            reportedBy: { name: 'Mike Johnson' }
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <div 
      className="bg-white rounded-lg shadow p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick()
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{loading ? '...' : value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Click to view details
      </div>
    </div>
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'verified': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-500'
    }
  }
  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMs = now - date
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    }
  }

  const handleViewDetails = async (reportId) => {
    try {
      const response = await reportsAPI.getReportById(reportId)
      setSelectedReport(response.data.data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch report details:', error)
      // Fallback: use the report from the list
      const report = recentReports.find(r => (r.id || r._id) === reportId)
      if (report) {
        setSelectedReport(report)
        setIsModalOpen(true)
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReport(null)
  }

  // Click handlers for statistics cards
  const handleTotalReportsClick = () => {
    navigate('/reports?filter=all')
  }

  const handlePendingReportsClick = () => {
    navigate('/reports?filter=pending')
  }

  const handleVerifiedReportsClick = () => {
    navigate('/reports?filter=verified')
  }

  const handleRejectedReportsClick = () => {
    navigate('/reports?filter=rejected')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">RoadAlert Dashboard</h1>
        <p className="text-gray-600">Overview of road hazard reports and system status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Reports"
          value={stats.totalReports}
          icon={ExclamationTriangleIcon}
          color="text-blue-600"
          onClick={handleTotalReportsClick}
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReports}
          icon={ClockIcon}
          color="text-yellow-600"
          onClick={handlePendingReportsClick}
        />
        <StatCard
          title="Verified"
          value={stats.verifiedReports}
          icon={CheckCircleIcon}
          color="text-green-600"
          onClick={handleVerifiedReportsClick}
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedReports}
          icon={XMarkIcon}
          color="text-red-600"
          onClick={handleRejectedReportsClick}
        />
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading recent reports...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentReports.map((report) => (
              <div key={report.id || report._id} className={`p-6 border-l-4 ${getSeverityColor(report.severity)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 capitalize">{report.type}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {report.location?.address || report.location}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {report.reportedBy?.name && `Reported by ${report.reportedBy.name} • `}
                      {formatTimeAgo(report.createdAt)}
                    </p>
                  </div>                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleViewDetails(report.id || report._id)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.href = '/reports'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Review Pending Reports
          </button>
          <button 
            onClick={() => window.location.href = '/map'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            View Live Map
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Generate Report
          </button>
        </div>
      </div>      {/* System Status */}
      <SystemStatus />{/* Report Details Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-lg bg-white">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Report Details</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Report Information */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Report Type</h4>
                      <p className="text-lg font-semibold text-gray-900 capitalize">{selectedReport.type}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Severity</h4>
                      <p className={`text-sm font-semibold ${selectedReport.severity === 'high' ? 'text-red-600' : selectedReport.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {selectedReport.severity} Priority
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Reported By</h4>
                      <p className="text-sm text-gray-900">{selectedReport.reportedBy?.name || 'Anonymous'}</p>
                    </div>
                  </div>
                    <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
                    <p className="text-sm text-gray-900 mb-1">{selectedReport.location?.address || 'No address provided'}</p>
                    {selectedReport.location?.coordinates && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Latitude: {selectedReport.location.coordinates.latitude}</p>
                        <p>Longitude: {selectedReport.location.coordinates.longitude}</p>
                        <p className="text-blue-600">
                          <a 
                            href={`https://www.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Verify location on Google Maps
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReport.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Date & Time</h4>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedReport.createdAt).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })} at {new Date(selectedReport.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Images */}
                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Uploaded Images ({selectedReport.images.length})</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedReport.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={`http://localhost:3001/uploads/${image.filename}`}
                              alt={`Report image ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg shadow-sm border border-gray-200"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200/e5e7eb/6b7280?text=Image+Not+Found' }}
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              {image.originalName || `Image ${index + 1}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Map and Actions */}
                <div className="space-y-6">                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Location on Map</h4>
                    {selectedReport.location?.coordinates ? (
                      <div className="space-y-3">
                        {/* Primary Map - Google Maps */}
                        <div className="w-full h-96 bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          <iframe
                            src={`https://maps.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}&z=15&output=embed`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            title="Report Location Map"
                            loading="lazy"
                            allowFullScreen
                            onError={(e) => {
                              console.log('Google Maps failed to load, trying alternative...');
                              // Fallback to OpenStreetMap
                              e.target.src = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedReport.location.coordinates.longitude - 0.01},${selectedReport.location.coordinates.latitude - 0.01},${selectedReport.location.coordinates.longitude + 0.01},${selectedReport.location.coordinates.latitude + 0.01}&layer=mapnik&marker=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`;
                            }}
                          ></iframe>
                        </div>
                        
                        {/* Coordinate Information */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-blue-900 mb-1">Coordinates</h5>
                          <p className="text-sm text-blue-800">
                            Latitude: {selectedReport.location.coordinates.latitude}<br/>
                            Longitude: {selectedReport.location.coordinates.longitude}
                          </p>
                        </div>
                        
                        {/* Alternative Map Links */}
                        <div className="flex gap-2 text-sm">
                          <a
                            href={`https://www.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Open in Google Maps
                          </a>
                          <span className="text-gray-300">|</span>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${selectedReport.location.coordinates.latitude}&mlon=${selectedReport.location.coordinates.longitude}#map=15/${selectedReport.location.coordinates.latitude}/${selectedReport.location.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Open in OpenStreetMap
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <div className="text-center">
                          <div className="text-gray-400 mb-2">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm">No location coordinates available</p>
                        </div>
                      </div>
                    )}
                  </div>
                      {/* Quick Info Card */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">Quick Info</h5>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Report ID: {selectedReport._id || selectedReport.id}</p>
                      <p>Priority: {selectedReport.severity} severity</p>
                      <p>Time since report: {formatTimeAgo(selectedReport.createdAt)}</p>
                      {selectedReport.verifiedAt && (
                        <p>Verified: {formatTimeAgo(selectedReport.verifiedAt)}</p>
                      )}
                      {selectedReport.location?.coordinates && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="font-medium">Location Debug:</p>
                          <p>Lat: {selectedReport.location.coordinates.latitude}</p>
                          <p>Lng: {selectedReport.location.coordinates.longitude}</p>
                          <p className="text-xs">
                            Map URL: https://maps.google.com/maps?q={selectedReport.location.coordinates.latitude},{selectedReport.location.coordinates.longitude}&z=15&output=embed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {selectedReport.status === 'pending' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Actions Required</h5>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            closeModal()
                            window.location.href = '/reports'
                          }}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          ✓ Accept Report
                        </button>
                        <button
                          onClick={() => {
                            closeModal()
                            window.location.href = '/reports'
                          }}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          ✗ Reject Report
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {selectedReport.status !== 'pending' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Report Status</h5>
                      <p className="text-sm text-gray-600">
                        This report has been {selectedReport.status}. 
                        {selectedReport.status === 'verified' && ' It is now visible to the public.'}
                        {selectedReport.status === 'rejected' && ' It has been rejected and is not visible to the public.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
