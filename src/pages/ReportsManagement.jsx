import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { MagnifyingGlassIcon, FunnelIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import config from '../config/index.js'
import EditReportModal from '../components/EditReportModal'
import ResolveReportModal from '../components/ResolveReportModal'

const ReportsManagement = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isSuperAdmin, canDeleteReports } = useAuth()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [reportToDelete, setReportToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
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
    setActionLoading(true)
    try {
      console.log('🔧 Accepting report:', reportId)
      
      // Validate report ID
      if (!reportId) {
        throw new Error('Report ID is missing')
      }
      
      console.log('🔧 Making API call to verify report...')
      const response = await reportsAPI.verifyReport(reportId)
      console.log('✅ Report verification response:', response.data)
      
      // Refresh the reports list
      await fetchReports()
      
      // Show success modal
      setSuccessMessage('✅ Report verified successfully!')
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 2000)
    } catch (error) {
      console.error('❌ Failed to verify report:', error)
      console.error('❌ Error details:', error.response?.data)
      alert('Failed to verify report: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (reportId) => {
    setActionLoading(true)
    try {
      console.log('🔧 Rejecting report:', reportId)
      
      // Validate report ID
      if (!reportId) {
        throw new Error('Report ID is missing')
      }
      
      console.log('🔧 Making API call to reject report...')
      const response = await reportsAPI.rejectReport(reportId)
      console.log('✅ Report rejection response:', response.data)
      
      // Refresh the reports list
      await fetchReports()
      
      // Show success modal
      setSuccessMessage('❌ Report rejected successfully!')
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 2000)
    } catch (error) {
      console.error('❌ Failed to reject report:', error)
      console.error('❌ Error details:', error.response?.data)
      alert('Failed to reject report: ' + (error.response?.data?.error || error.message))
    } finally {
      setActionLoading(false)
    }
  }

  // Delete report - Super Admin only
  const confirmDeleteReport = (report) => {
    if (!isSuperAdmin()) {
      alert('Only Super Admins can delete reports.')
      return
    }
    setReportToDelete(report)
    setShowDeleteConfirm(true)
  }

  const cancelDeleteReport = () => {
    setReportToDelete(null)
    setShowDeleteConfirm(false)
  }

  const handleDelete = async (reportId) => {
    if (!isSuperAdmin()) {
      alert('Only Super Admins can delete reports.')
      return
    }
    
    setDeleteLoading(true)
    try {
      console.log('🗑️ Deleting report with ID:', reportId);
      await reportsAPI.deleteReport(reportId);
      await fetchReports();
      
      // Close confirmation modal
      setShowDeleteConfirm(false)
      setReportToDelete(null)
      
      // Show success modal
      setSuccessMessage('🗑️ Report deleted successfully!')
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 2000)
    } catch (error) {
      console.error('❌ Failed to delete report:', error);
      console.error('❌ Report ID:', reportId);
      console.error('❌ Error response:', error.response?.data);
      alert('Failed to delete report: ' + (error.response?.data?.error || error.message));
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleEdit = (report) => {
    setSelectedReport(report)
    setEditModalOpen(true)
  }

  const handleResolve = (report) => {
    setSelectedReport(report)
    setResolveModalOpen(true)
  }

  const handleResolveReport = async (reportId, formData) => {
    try {
      console.log('✅ Resolving report:', reportId)
      console.log('📋 FormData contents:');
      for (let pair of formData.entries()) {
        console.log('  ', pair[0], ':', pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1]);
      }
      
      const response = await reportsAPI.resolveReport(reportId, formData)
      console.log('✅ Resolve response:', response.data)
      
      await fetchReports()
      
      // Show success modal
      setSuccessMessage('✅ Report resolved and user notified!')
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 2000)
      
      setResolveModalOpen(false)
      setSelectedReport(null)
    } catch (error) {
      console.error('❌ Failed to resolve report:', error)
      console.error('❌ Error response:', error.response)
      console.error('❌ Error data:', error.response?.data)
      console.error('❌ Error status:', error.response?.status)
      throw error
    }
  }

  const handleUpdateReport = async (updatedReport) => {
    try {
      console.log('📝 Updating report:', updatedReport._id)
      await reportsAPI.updateReport(updatedReport._id, updatedReport)
      await fetchReports()
      setEditModalOpen(false)
      setSelectedReport(null)
      alert('Report updated successfully!')
    } catch (error) {
      console.error('❌ Failed to update report:', error)
      alert('Failed to update report: ' + (error.response?.data?.error || error.message))
    }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with navigation indicator */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reports Management</h1>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="text-xs sm:text-sm font-medium text-gray-700">
            Total: {reports.length} | Showing: {filteredReports.length}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm"
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
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-gray-900"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReports.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-800">No reports found</h3>
            <p className="mt-2 font-medium text-gray-700">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report._id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 capitalize">{report.type}</h3>
                      <p className="text-sm font-medium text-gray-700">Report #{report._id.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                    <span className={`text-xs font-medium ${getSeverityColor(report.severity)}`}>
                      {report.severity.toUpperCase()} PRIORITY
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                {/* Location */}
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">Location</p>
                    <p className="text-sm font-medium text-gray-700 truncate" title={report.location?.address}>
                      {report.location?.address || 'No address provided'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">Description</p>
                    <p className="text-sm font-medium text-gray-700 line-clamp-2" title={report.description}>
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Reporter & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                      {report.reportedBy?.profile?.profileImage ? (
                        <img 
                          src={`http://localhost:3001${report.reportedBy.profile.profileImage}`}
                          alt={`${report.reportedBy?.name || report.reportedBy?.username}'s profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600">Reporter</p>
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {report.reportedBy?.name || report.reportedBy?.username || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-600">Date</p>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(report.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Preview */}
                {report.images && report.images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800">Report Image</p>
                    <div className="h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
                      <img
                        src={(() => {
                          const imageData = report.images[0];
                          
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
                          }
                          
                          // Otherwise, construct local path
                          const cleanFilename = typeof filename === 'string' 
                            ? filename.replace(/^.*\/uploads\//, '') 
                            : filename;
                          return `${config.BACKEND_URL}/uploads/${cleanFilename}`;
                        })()}
                        alt="Report evidence"
                        className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const imageData = report.images[0];
                          
                          // If it's a Base64 data URL in the new format
                          if (imageData?.data) {
                            const dataUrl = `data:${imageData.mimetype};base64,${imageData.data}`;
                            window.open(dataUrl, '_blank');
                            return;
                          }
                          
                          const filename = imageData?.filename || imageData;
                          
                          // Make sure filename is a string before calling startsWith
                          if (typeof filename === 'string') {
                            // If it's already a data URL, use it
                            if (filename.startsWith('data:')) {
                              window.open(filename, '_blank');
                              return;
                            }
                            
                            // If filename is already a full URL (Cloudinary), use it directly
                            if (filename.startsWith('http://') || filename.startsWith('https://')) {
                              window.open(filename, '_blank');
                              return;
                            }
                            
                            // Otherwise, construct local path
                            const cleanFilename = filename.replace(/^.*\/uploads\//, '');
                            window.open(`${config.BACKEND_URL}/uploads/${cleanFilename}`, '_blank');
                          }
                        }}
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
                            <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
                              <rect width='128' height='128' fill='%23f3f4f6'/>
                              <text x='64' y='64' text-anchor='middle' dy='0.3em' fill='%236b7280' font-size='14'>Image unavailable</text>
                            </svg>
                          `)}`;
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Map Preview */}
                {report.location?.coordinates && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-800">Location Map</p>
                    <div className="h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        src={`https://maps.google.com/maps?q=${report.location.coordinates.latitude},${report.location.coordinates.longitude}&z=15&output=embed`}
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

              {/* Card Footer - Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                {report.status === 'pending' ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-700 text-center">Action Required</p>
                    <div className={`grid ${isSuperAdmin() ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
                      <button
                        onClick={() => handleEdit(report)}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors font-medium text-center flex flex-col items-center justify-center"
                      >
                        <span className="text-base mb-1">✏️</span>
                        <span className="text-xs">Edit</span>
                      </button>
                      <button
                        onClick={() => handleAccept(report._id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors font-medium text-center flex flex-col items-center justify-center"
                      >
                        <span className="text-base mb-1">✓</span>
                        <span className="text-xs">Verified</span>
                      </button>
                      <button
                        onClick={() => handleReject(report._id)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors font-medium text-center flex flex-col items-center justify-center"
                      >
                        <span className="text-base mb-1">✗</span>
                        <span className="text-xs">Reject</span>
                      </button>
                      {isSuperAdmin() && (
                        <button
                          onClick={() => confirmDeleteReport(report)}
                          className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors font-medium text-center flex flex-col items-center justify-center"
                        >
                          <TrashIcon className="h-4 w-4 mb-1" />
                          <span className="text-xs">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        report.status === 'verified' ? 'bg-green-500' : 
                        report.status === 'resolved' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {report.status === 'verified' ? 'Verified & Published' : 
                         report.status === 'resolved' ? '✅ Issue Resolved' : 'Rejected'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {report.status === 'verified' && (
                        <button
                          onClick={() => handleResolve(report)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors font-medium"
                        >
                          ✅ Mark Resolved
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(report)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      {isSuperAdmin() && (
                        <button
                          onClick={() => confirmDeleteReport(report)}
                          className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Report Modal */}
      <EditReportModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedReport(null)
        }}
        report={selectedReport}
        onUpdate={handleUpdateReport}
      />

      {/* Resolve Report Modal */}
      {resolveModalOpen && selectedReport && (
        <ResolveReportModal
          report={selectedReport}
          onClose={() => {
            setResolveModalOpen(false)
            setSelectedReport(null)
          }}
          onResolve={handleResolveReport}
        />
      )}

      {/* Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-700 font-medium">Processing...</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Success!
            </h3>
            <p className="text-sm text-gray-600">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Super Admin Only */}
      {showDeleteConfirm && reportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Report
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to permanently delete this report?
                  </p>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{reportToDelete.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {reportToDelete.status} • Location: {reportToDelete.location?.barangay || 'Unknown'}
                    </p>
                  </div>
                  <p className="text-xs text-red-600 mt-3 font-medium">
                    ⚠️ This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelDeleteReport}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(reportToDelete._id)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportsManagement
