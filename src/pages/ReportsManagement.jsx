import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import config from '../config/index.js'

const ReportsManagement = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Set initial filter from URL parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && ['all', 'pending', 'verified', 'rejected'].includes(filterParam)) {
      setFilterStatus(filterParam)
    }
  }, [searchParams])
  
  useEffect(() => {
    fetchReports()
    
    // Remove auto-refresh - now using manual refresh button
    // const interval = setInterval(() => {
    //   fetchReports()
    // }, 5000) // Poll every 5 seconds
    // 
    // return () => clearInterval(interval)
  }, [])
  
  const fetchReports = async () => {
    try {
      setLoading(true)
      console.log('Fetching reports from API...')
      const response = await reportsAPI.getAllReports()
      console.log('API Response:', response.data)
      setReports(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      // Show error message but don't fall back to mock data
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh function
  const handleRefresh = async () => {
    console.log('Manually refreshing reports...')
    await fetchReports()
  }
  const handleAccept = async (reportId) => {
    try {
      console.log('Accepting report:', reportId)
      await reportsAPI.verifyReport(reportId)
      console.log('Report accepted successfully')
      // Refresh the reports list
      await fetchReports()
      alert('Report accepted successfully!')
    } catch (error) {
      console.error('Failed to accept report:', error)
      alert('Failed to accept report: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleReject = async (reportId) => {
    try {
      console.log('Rejecting report:', reportId)
      await reportsAPI.rejectReport(reportId)
      console.log('Report rejected successfully')
      // Refresh the reports list
      await fetchReports()
      alert('Report rejected successfully!')
    } catch (error) {
      console.error('Failed to reject report:', error)
      alert('Failed to reject report: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
    try {
      await reportsAPI.deleteReport(reportId);
      await fetchReports();
      alert('Report deleted successfully!');
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report: ' + (error.response?.data?.error || error.message));
    }
  }

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
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  // Filter reports based on search term and status
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.location?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading reports...</div>
  }
  return (
    <div className="space-y-6">
      {/* Header with navigation indicator */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
          {filterStatus !== 'all' && (
            <div className="mt-1 flex items-center text-sm text-blue-600">
              <span>Filtered by: </span>
              <span className="font-semibold capitalize ml-1">{filterStatus} Reports</span>
              <button 
                onClick={() => setFilterStatus('all')}
                className="ml-2 text-gray-500 hover:text-gray-700"
                title="Clear filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Total Reports: {reports.length} | Showing: {filteredReports.length}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No reports found.</p>
          </div>
        ) : (          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <div key={report._id} className="p-6">
                {/* Report Header */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 capitalize">
                    {report.type}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <span className={`text-sm font-medium ${getSeverityColor(report.severity)}`}>
                    {report.severity} severity
                  </span>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Left Column - Report Details */}
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Location</h4>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{report.location?.address || 'No address provided'}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{report.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Date & Time</h4>
                      <p className="text-gray-900">
                        {new Date(report.createdAt).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} at {new Date(report.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Reporter Information</h4>
                      <div className="text-gray-900">
                        <p className="font-medium">
                          {report.reportedBy?.username || report.reportedBy?.name || 'Anonymous Reporter'}
                          {report.reportedBy?.username && report.reportedBy?.name && 
                            <span className="text-sm text-gray-600 ml-2">({report.reportedBy.name})</span>
                          }
                        </p>
                        {report.reportedBy?.email && (
                          <p className="text-sm text-gray-600 mt-1">📧 {report.reportedBy.email}</p>
                        )}
                        {report.reportedBy?.phone && (
                          <p className="text-sm text-gray-600 mt-1">📱 {report.reportedBy.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Quick Info Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Report Details</h5>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>Report ID: {report._id}</p>
                        <p>Priority: {report.severity} severity</p>
                        <p>Status: {report.status}</p>
                        {report.verifiedAt && (
                          <p>Verified: {new Date(report.verifiedAt).toLocaleDateString()}</p>
                        )}
                        {report.location?.coordinates && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="font-medium">Coordinates:</p>
                            <p>Lat: {report.location.coordinates.latitude}</p>
                            <p>Lng: {report.location.coordinates.longitude}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Map and Images */}
                  <div className="space-y-4">
                    {/* Map Section */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Location on Map</h4>
                      {report.location?.coordinates ? (
                        <div className="space-y-3">
                          <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                            <iframe
                              src={`https://maps.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}&z=15&output=embed`}
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              title="Report Location Map"
                              loading="lazy"
                              allowFullScreen
                            ></iframe>
                          </div>
                          
                          <div className="flex gap-2 text-sm">
                            <a
                              href={`https://www.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              Open in Google Maps
                            </a>
                            <span className="text-gray-300">|</span>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${report.location.coordinates.latitude}&mlon=${report.location.coordinates.longitude}#map=15/${report.location.coordinates.latitude}/${report.location.coordinates.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              OpenStreetMap
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
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

                    {/* Images Section */}
                    {report.images && report.images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">
                          Uploaded Images ({report.images.length})
                        </h4>                        <div className="grid grid-cols-1 gap-3">
                          {report.images.map((image, index) => {
                            // Support both object (with filename) & direct string values
                            const filename = image?.filename || image;
                            // Bust cache if images were recently added / replaced
                            const imageUrl = `${config.BACKEND_URL}/uploads/${filename}`;
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`Report image ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg shadow-sm border border-gray-200 transition-opacity duration-200"
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error('❌ Image load failed:', imageUrl);
                                    const fallback = `data:image/svg+xml;utf8,${encodeURIComponent(`
                                      <svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'>
                                        <rect width='400' height='200' fill='%23f3f4f6'/>
                                        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='14'>Image Not Available</text>
                                        <text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='10'>${filename}</text>
                                      </svg>
                                    `)}`;
                                    e.target.src = fallback;
                                    e.target.classList.add('object-contain');
                                  }}
                                  onLoad={(ev) => {
                                    console.log('✅ Image loaded:', imageUrl);
                                    // If server accidentally returned HTML (CSP error), width/height might be 0
                                    if (ev.target.naturalWidth === 0) {
                                      console.warn('Image naturalWidth is 0, forcing fallback');
                                      ev.target.onerror();
                                    }
                                  }}
                                />
                                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                  {image.originalName || `Image ${index + 1}`}
                                </div>
                                {/* Debug filename display */}
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-80">
                                  {filename}
                                </div>
                                <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black bg-opacity-40 text-white text-xs font-medium rounded-lg">
                                  Click to open
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Debug information panel */}
                        <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
                          <strong>🔍 Debug Info:</strong> Images served from: <code>localhost:3001/uploads/</code>
                          <br />
                          <strong>📊 Image count:</strong> {report.images.length}
                          <br />
                          <strong>🌐 Troubleshooting:</strong> If images don't load, check Network tab in DevTools
                        </div>
                      </div>
                    )}

                    {(!report.images || report.images.length === 0) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Images</h4>
                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <div className="text-center">
                            <div className="text-gray-400 mb-1">
                              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-500 text-xs">No images uploaded</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {report.status === 'pending' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Actions Required</h5>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAccept(report._id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium"
                      >
                        ✓ Accept Report
                      </button>
                      <button
                        onClick={() => handleReject(report._id)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium"
                      >
                        ✗ Reject Report
                      </button>
                      <button
                        onClick={() => handleDelete(report._id)}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                      >
                        🗑️ Delete Report
                      </button>
                    </div>
                  </div>
                )}
                
                {report.status !== 'pending' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1 mr-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-1">Report Status</h5>
                        <p className="text-sm text-gray-600">
                          This report has been {report.status}. 
                          {report.status === 'verified' && ' It is now visible to the public.'}
                          {report.status === 'rejected' && ' It has been rejected and is not visible to the public.'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(report._id)}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                      >
                        🗑️ Delete Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsManagement
