import { useState, useEffect } from 'react'
import { CheckBadgeIcon, XCircleIcon, ClockIcon, FunnelIcon, ArrowPathIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import config from '../config/index.js'

const AcceptanceActivity = () => {
  const { isSuperAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  })
  const [selectedReport, setSelectedReport] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Filter states
  const [filters, setFilters] = useState({
    adminId: '',
    startDate: '',
    endDate: '',
    action: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    // Check if user is super admin
    if (!isSuperAdmin()) {
      setError('Access Denied. Super Admin privileges required.')
      setLoading(false)
      return
    }
    
    fetchAcceptanceLogs()
  }, [pagination.currentPage, isSuperAdmin])

  const fetchAcceptanceLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = {
        limit: pagination.limit,
        page: pagination.currentPage,
        ...filters
      }
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key]
      })
      
      const response = await reportsAPI.getAcceptanceLogs(params)
      
      console.log('Acceptance logs response:', response.data)
      setLogs(response.data.data || [])
      setPagination(response.data.pagination)
    } catch (err) {
      console.error('Failed to fetch acceptance logs:', err)
      setError(err.response?.data?.error || 'Failed to load acceptance activity')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    fetchAcceptanceLogs()
  }

  const clearFilters = () => {
    setFilters({
      adminId: '',
      startDate: '',
      endDate: '',
      action: ''
    })
    setPagination(prev => ({ ...prev, currentPage: 1 }))
    setTimeout(() => fetchAcceptanceLogs(), 100)
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    return date.toLocaleDateString('en-US', options)
  }

  const getActionBadge = (action) => {
    if (action === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckBadgeIcon className="h-3.5 w-3.5 mr-1" />
          Accepted
        </span>
      )
    } else if (action === 'rejected') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="h-3.5 w-3.5 mr-1" />
          Rejected
        </span>
      )
    }
    return null
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }))
    }
  }

  const handleViewReportDetails = async (reportId) => {
    try {
      const response = await reportsAPI.getReportById(reportId)
      setSelectedReport(response.data.data)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Failed to fetch report details:', error)
      alert('Failed to load report details')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedReport(null)
  }

  const closeImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImage(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'verified': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'resolved': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
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

  // Access denied view
  if (!isSuperAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Access Denied</h3>
          <p className="text-red-600">Only Super Administrators can view acceptance activity logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <ClockIcon className="h-8 w-8 mr-3 text-blue-600" />
          Admin Acceptance Activity
        </h1>
        <p className="text-gray-600 mt-1">Track which admin accepted or rejected each report</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
          <button
            onClick={fetchAcceptanceLogs}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Refresh</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="verified">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading activity logs...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchAcceptanceLogs}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Logs List */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Activity Logs ({pagination.totalCount} total)
              </h2>
            </div>

            {logs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No acceptance activity found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div 
                    key={log._id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewReportDetails(log._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {log.admin?.username || 'Unknown Admin'}
                          </span>
                          {getActionBadge(log.action)}
                        </div>
                        
                        <p className="text-sm text-gray-700">
                          <span className="font-medium capitalize">{log.reportType}</span> report
                          {log.location && (
                            <span className="text-gray-600"> – {log.location}</span>
                          )}
                        </p>
                        
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatDateTime(log.timestamp)}</span>
                          {log.admin?.email && (
                            <span className="text-gray-400">({log.admin.email})</span>
                          )}
                        </div>

                        {log.adminNotes && (
                          <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <span className="font-medium">Note:</span> {log.adminNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-blue-600 text-xs font-medium ml-4">
                        Click to view →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Details Modal */}
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
                    {selectedReport.severity?.toUpperCase() || 'N/A'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <h4 className="text-xs font-medium text-green-600 mb-1">REPORTER</h4>
                  <p className="text-sm font-bold text-green-800 truncate">{selectedReport.reportedBy?.name || selectedReport.reportedBy?.username || 'Anonymous'}</p>
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
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>📍 {selectedReport.barangay}, {selectedReport.city}, {selectedReport.province}</p>
                      {selectedReport.location?.coordinates && (
                        <>
                          <p className="text-gray-500">
                            Coordinates: {selectedReport.location.coordinates.latitude}, {selectedReport.location.coordinates.longitude}
                          </p>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedReport.location.coordinates.latitude},${selectedReport.location.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline inline-block mt-1"
                          >
                            View on Google Maps
                          </a>
                        </>
                      )}
                    </div>
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
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.description || 'No description provided'}</p>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <ClockIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Timeline</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Reported:</span>
                        <p className="text-gray-900 font-medium">
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
                      {selectedReport.verifiedAt && (
                        <div>
                          <span className="text-gray-600">Verified:</span>
                          <p className="text-gray-900 font-medium">
                            {formatTimeAgo(selectedReport.verifiedAt)}
                          </p>
                        </div>
                      )}
                      {selectedReport.verifiedBy && (
                        <div>
                          <span className="text-gray-600">Verified by:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedReport.verifiedBy.username}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedReport.adminNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-amber-800 mb-2">Admin Notes</h4>
                      <p className="text-sm text-amber-900">{selectedReport.adminNotes}</p>
                    </div>
                  )}
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
                            
                            // If it's a Base64 data URL in the new format
                            if (imageData?.data) {
                              return `data:${imageData.mimetype};base64,${imageData.data}`;
                            }
                            
                            const filename = imageData?.filename || imageData;
                            
                            // Make sure filename is a string before calling startsWith
                            if (typeof filename === 'string') {
                              // If it's already a data URL, use it
                              if (filename.startsWith('data:')) {
                                return filename;
                              }
                              
                              // If filename is already a full URL (Cloudinary), use it directly
                              if (filename.startsWith('http://') || filename.startsWith('https://')) {
                                return filename;
                              }
                              
                              // Remove any /api/reports prefix if present for local files
                              const cleanFilename = filename.replace(/^.*\/uploads\//, '');
                              return `${config.BACKEND_URL}/uploads/${cleanFilename}`;
                            }
                            
                            return '';
                          })()}
                          alt="Report evidence"
                          className="w-full h-auto object-contain max-h-64 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={(e) => {
                            setSelectedImage(e.target.src);
                            setIsImageModalOpen(true);
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="flex flex-col items-center justify-center p-8 text-center">
                                <svg class="h-16 w-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-sm text-gray-600 font-medium">Image not available</p>
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
            </div>

            {/* Close Button */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <button
                onClick={closeModal}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4" onClick={closeImageModal}>
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default AcceptanceActivity
