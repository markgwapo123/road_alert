import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import SystemStatus from '../components/SystemStatus'
import config from '../config/index.js'

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
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
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
    
    // Debug: Check current admin token
    const token = localStorage.getItem('adminToken')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('🔐 Current admin token payload:', payload)
      } catch (e) {
        console.error('❌ Failed to decode token:', e)
      }
    } else {
      console.log('❌ No admin token found')
    }
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

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl)
    setIsImageModalOpen(true)
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImage(null)
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
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl rounded-xl bg-white">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Report Details</h3>
                  <p className="text-sm text-gray-600">ID: #{selectedReport._id?.slice(-8) || selectedReport.id}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Header Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <h4 className="text-xs font-medium text-blue-600 mb-1">TYPE</h4>
                  <p className="text-lg font-bold text-blue-800 capitalize">{selectedReport.type}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <h4 className="text-xs font-medium text-gray-600 mb-1">STATUS</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <h4 className="text-xs font-medium text-yellow-600 mb-1">PRIORITY</h4>
                  <p className={`text-sm font-bold ${selectedReport.severity === 'high' ? 'text-red-600' : selectedReport.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {selectedReport.severity?.toUpperCase()}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <h4 className="text-xs font-medium text-green-600 mb-1">REPORTER</h4>
                  <p className="text-sm font-bold text-green-800 truncate">{selectedReport.reportedBy?.name || 'Anonymous'}</p>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Details */}
                <div className="space-y-4">
                  {/* Location */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-1.5 bg-red-100 rounded-lg">
                        <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Location</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{selectedReport.location?.address || 'No address provided'}</p>
                    {selectedReport.location?.coordinates && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📍 {selectedReport.location.coordinates.latitude}, {selectedReport.location.coordinates.longitude}</p>
                        <a 
                          href={`https://www.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Description</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.description}</p>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <ClockIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Date & Time</h4>
                    </div>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedReport.createdAt).toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} at {new Date(selectedReport.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Quick Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-800 mb-3">Quick Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Report ID:</span>
                        <span className="font-medium text-blue-800">#{selectedReport._id?.slice(-8) || selectedReport.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Time ago:</span>
                        <span className="font-medium text-blue-800">{formatTimeAgo(selectedReport.createdAt)}</span>
                      </div>
                      {selectedReport.verifiedAt && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">Verified:</span>
                          <span className="font-medium text-blue-800">{formatTimeAgo(selectedReport.verifiedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Visual Content */}
                <div className="space-y-4">
                  {/* Report Images */}
                  {selectedReport.images && selectedReport.images.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">Report Image</h4>
                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 min-h-[200px] flex items-center justify-center">
                        <img
                          src={(() => {
                            const imageData = selectedReport.images[0];
                            const filename = imageData?.filename || imageData;
                            // Remove any /api/reports prefix if present
                            const cleanFilename = typeof filename === 'string' 
                              ? filename.replace(/^.*\/uploads\//, '') 
                              : filename;
                            const imageUrl = `${config.BACKEND_URL}/uploads/${cleanFilename}`;
                            console.log('🖼️ Constructed image URL:', imageUrl);
                            console.log('📦 Raw image data:', imageData);
                            return imageUrl;
                          })()}
                          alt="Report evidence"
                          className="w-full h-auto object-contain max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            window.open(e.target.src, '_blank');
                          }}
                          onLoad={(e) => {
                            console.log('✅ Image loaded successfully:', e.target.src);
                            e.target.style.backgroundColor = 'transparent';
                          }}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', e.target.src);
                            console.log('Backend URL:', config.BACKEND_URL);
                            console.log('Image data:', selectedReport.images[0]);
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="flex flex-col items-center justify-center p-8 text-center">
                                <svg class="h-16 w-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-sm text-gray-600 font-medium">Image not available</p>
                                <p class="text-xs text-gray-400 mt-1">Check browser console for details</p>
                              </div>
                            `;
                          }}
                        />
                      </div>
                      {selectedReport.images.length > 1 && (
                        <p className="text-xs text-gray-500 mt-2">+ {selectedReport.images.length - 1} more image(s)</p>
                      )}
                    </div>
                  )}

                  {/* Map */}
                  {selectedReport.location?.coordinates && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">Location Map</h4>
                      <div className="h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <iframe
                          src={`https://maps.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}&z=15&output=embed`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          title="Report Location"
                          loading="lazy"
                        ></iframe>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Action Buttons */}
              {selectedReport.status === 'pending' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="text-sm font-bold text-gray-800 mb-3">Actions Required</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={async () => {
                        try {
                          console.log('Attempting to verify report:', selectedReport._id || selectedReport.id)
                          const reportId = selectedReport._id || selectedReport.id
                          if (!reportId) {
                            throw new Error('Report ID is missing')
                          }
                          
                          const response = await reportsAPI.verifyReport(reportId)
                          console.log('Verification response:', response.data)
                          
                          // Update the report status in local state
                          setSelectedReport({ ...selectedReport, status: 'verified' })
                          // Refresh the stats
                          fetchStats()
                          closeModal()
                        } catch (error) {
                          console.error('Failed to verify report:', error)
                          console.error('Error response:', error.response?.data)
                          alert(`Failed to verify report: ${error.response?.data?.error || error.message}`)
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      ✓ Verified Report
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          console.log('Attempting to reject report:', selectedReport._id || selectedReport.id)
                          const reportId = selectedReport._id || selectedReport.id
                          if (!reportId) {
                            throw new Error('Report ID is missing')
                          }
                          
                          const response = await reportsAPI.rejectReport(reportId)
                          console.log('Rejection response:', response.data)
                          
                          // Update the report status in local state
                          setSelectedReport({ ...selectedReport, status: 'rejected' })
                          // Refresh the stats
                          fetchStats()
                          closeModal()
                        } catch (error) {
                          console.error('Failed to reject report:', error)
                          console.error('Error response:', error.response?.data)
                          alert(`Failed to reject report: ${error.response?.data?.error || error.message}`)
                        }
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      ✗ Reject Report
                    </button>
                  </div>
                </div>
              )}
              
              {selectedReport.status !== 'pending' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full ${
                    selectedReport.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      selectedReport.status === 'verified' ? 'bg-green-600' : 'bg-red-600'
                    }`}></div>
                    <span className="text-sm font-medium">
                      {selectedReport.status === 'verified' ? 'Report Verified & Published' : 'Report Rejected'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            {/* Image */}
            <img
              src={selectedImage}
              alt="Enlarged report image"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.target.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
                  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
                    <rect width='400' height='300' fill='%23f3f4f6'/>
                    <text x='200' y='150' text-anchor='middle' dy='0.3em' fill='%236b7280' font-size='16'>Image Not Available</text>
                  </svg>
                `)}`;
              }}
            />
            
            {/* Download Button */}
            <a
              href={selectedImage}
              download
              className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Download</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
