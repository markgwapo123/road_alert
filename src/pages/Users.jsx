import React, { useState, useEffect } from 'react'
import { UsersIcon, ClockIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon, EyeIcon, DocumentTextIcon, CalendarIcon, MapPinIcon, PhoneIcon, FunnelIcon, UserIcon } from '@heroicons/react/24/outline'

const Users = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userReports, setUserReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [loadingFreezeAction, setLoadingFreezeAction] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filteredUsers, setFilteredUsers] = useState([])

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    // Filter users based on selected filter type
    if (filterType === 'all') {
      setFilteredUsers(users)
    } else if (filterType === 'online') {
      setFilteredUsers(users.filter(user => user.isOnline))
    } else if (filterType === 'active') {
      setFilteredUsers(users.filter(user => user.isActive))
    } else if (filterType === 'frozen') {
      setFilteredUsers(users.filter(user => user.isFrozen))
    }
  }, [users, filterType])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      
      console.log('Debug: Fetching users...')
      console.log('Debug: Token present:', !!token)
      console.log('Debug: Token value:', token ? token.substring(0, 20) + '...' : 'No token')
      
      if (!token) {
        throw new Error('No admin token found. Please log in first.')
      }
      
      const response = await fetch('http://localhost:3001/api/admin/app-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Debug: Response status:', response.status)
      console.log('Debug: Response headers:', response.headers)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('Debug: Error response:', errorText)
        throw new Error(`Failed to fetch users (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log('Debug: Response data:', data)
      setUsers(data.data.users)
      setStats(data.data.stats)
    } catch (err) {
      setError(`${err.message}. Please check if you're logged in and try again.`)
      console.error('Error fetching users:', err)
      console.error('Response details:', {
        url: 'http://localhost:3001/api/admin/app-users',
        token: token ? 'Present' : 'Missing',
        error: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const formatLastActivity = (lastActivity) => {
    if (!lastActivity) return 'Never'
    const date = new Date(lastActivity)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (isOnline) => {
    return isOnline ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
  }

  const getStatusIcon = (isOnline) => {
    return isOnline ? CheckCircleIcon : XCircleIcon
  }

  const viewUserProfile = async (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
    setLoadingReports(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:3001/api/admin/user-reports/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserReports(data.data.reports || [])
      } else {
        console.error('Failed to fetch user reports')
        setUserReports([])
      }
    } catch (err) {
      console.error('Error fetching user reports:', err)
      setUserReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const closeUserModal = () => {
    setShowUserModal(false)
    setSelectedUser(null)
    setUserReports([])
  }

  const viewReportDetails = (report) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setSelectedReport(null)
  }

  const goBackToUserProfile = () => {
    setShowReportModal(false)
    setSelectedReport(null)
    // Keep user modal open
  }

  const toggleUserFreezeStatus = async (userId, currentStatus) => {
    try {
      setLoadingFreezeAction(true)
      const token = localStorage.getItem('adminToken')
      
      const response = await fetch(`http://localhost:3001/api/admin/user-freeze/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isFrozen: !currentStatus
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the selected user state
        setSelectedUser(prev => ({
          ...prev,
          isFrozen: !currentStatus
        }))

        // Update the users list
        setUsers(prev => prev.map(user => 
          user._id === userId 
            ? { ...user, isFrozen: !currentStatus }
            : user
        ))

        console.log(`User ${!currentStatus ? 'frozen' : 'unfrozen'} successfully`)
      } else {
        throw new Error('Failed to update user freeze status')
      }
    } catch (err) {
      console.error('Error updating freeze status:', err)
      alert('Failed to update user status. Please try again.')
    } finally {
      setLoadingFreezeAction(false)
    }
  }

  const handleStatCardClick = (filterType) => {
    setFilterType(filterType)
  }

  const clearFilter = () => {
    setFilterType('all')
  }

  const getStatCardStyle = (cardType) => {
    const isActive = filterType === cardType
    return `bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
      isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
    }`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReportStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-red-600 font-medium">Error loading users</p>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <UsersIcon className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          </div>
          <p className="text-gray-600">Monitor all registered users and their activity status</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div 
            className={getStatCardStyle('all')}
            onClick={() => handleStatCardClick('all')}
            title="Click to show all users"
          >
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
                <p className="text-xs text-blue-600 mt-1">Click to view all</p>
              </div>
            </div>
          </div>

          <div 
            className={getStatCardStyle('online')}
            onClick={() => handleStatCardClick('online')}
            title="Click to show only online users"
          >
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Online Users</p>
                <p className="text-2xl font-bold text-green-600">{stats.onlineUsers || 0}</p>
                <p className="text-xs text-green-600 mt-1">Click to filter</p>
              </div>
            </div>
          </div>

          <div 
            className={getStatCardStyle('active')}
            onClick={() => handleStatCardClick('active')}
            title="Click to show only active users"
          >
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeUsers || 0}</p>
                <p className="text-xs text-purple-600 mt-1">Click to filter</p>
              </div>
            </div>
          </div>

          <div 
            className={getStatCardStyle('frozen')}
            onClick={() => handleStatCardClick('frozen')}
            title="Click to show only frozen users"
          >
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Frozen Users</p>
                <p className="text-2xl font-bold text-red-600">{stats.frozenUsers || 0}</p>
                <p className="text-xs text-red-600 mt-1">Click to filter</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Indicator */}
        {filterType !== 'all' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FunnelIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  Showing {filterType} users ({filteredUsers.length} total)
                </span>
              </div>
              <button 
                onClick={clearFilter}
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Clear filter
              </button>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {filterType === 'all' ? 'All Users' : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Users`}
            </h2>
            <p className="text-gray-600">
              {filterType === 'all' ? `Total: ${users.length} users` : `Showing: ${filteredUsers.length} of ${users.length} users`}
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-gray-600">
                {filterType === 'all' ? 'No users found' : `No ${filterType} users found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const StatusIcon = getStatusIcon(user.isOnline)
                return (
                  <div key={user._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                            {user.profile?.profileImage ? (
                              <img 
                                src={`http://localhost:3001${user.profile.profileImage}`}
                                alt={`${user.name}'s profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UsersIcon className="h-6 w-6 text-gray-600" />
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                          <p className="text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-500">
                                Last activity: {formatLastActivity(user.lastActivityTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.isOnline)}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {user.onlineStatus}
                        </span>
                        {user.isFrozen && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🧊 Frozen
                          </span>
                        )}
                        <button
                          onClick={() => viewUserProfile(user)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            {loading ? 'Refreshing...' : 'Refresh Users'}
          </button>
        </div>

        {/* User Profile Modal */}
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">User Profile Details</h3>
                </div>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* User Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Basic Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <UsersIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-4 pb-3 border-b border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                            {selectedUser.profile?.profileImage ? (
                              <img 
                                src={`http://localhost:3001${selectedUser.profile.profileImage}`}
                                alt={`${selectedUser.name}'s profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UsersIcon className="h-8 w-8 text-gray-600" />
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Profile Picture</label>
                          <p className="text-gray-900 text-sm">
                            {selectedUser.profile?.profileImage ? 'Custom profile picture' : 'Default avatar'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Full Name</label>
                        <p className="text-gray-900">{selectedUser.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email Address</label>
                        <p className="text-gray-900">{selectedUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone Number</label>
                        <p className="text-gray-900 flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-1 text-gray-500" />
                          {selectedUser.phoneNumber || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">User ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedUser._id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
                      Activity Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Status</label>
                        <p className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedUser.isOnline)}`}>
                          {React.createElement(getStatusIcon(selectedUser.isOnline), { className: "h-4 w-4 mr-1" })}
                          {selectedUser.onlineStatus}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Activity</label>
                        <p className="text-gray-900">{formatLastActivity(selectedUser.lastActivityTime)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Registration Date</label>
                        <p className="text-gray-900 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                          {formatDate(selectedUser.createdAt)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Total Reports</label>
                        <p className="text-gray-900 flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-1 text-gray-500" />
                          {userReports.length} reports submitted
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Account Status</label>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                            selectedUser.isFrozen 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {selectedUser.isFrozen ? '🧊 Frozen' : '✅ Active'}
                          </span>
                          <button
                            onClick={() => toggleUserFreezeStatus(selectedUser._id, selectedUser.isFrozen)}
                            disabled={loadingFreezeAction}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                              selectedUser.isFrozen
                                ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400'
                                : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                            }`}
                          >
                            {loadingFreezeAction 
                              ? 'Processing...' 
                              : selectedUser.isFrozen 
                                ? 'Unfreeze Account' 
                                : 'Freeze Account'
                            }
                          </button>
                        </div>
                        {selectedUser.isFrozen && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ User cannot submit new reports while frozen
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Reports Section */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                      User Reports & Posts ({userReports.length})
                    </h4>
                  </div>

                  {loadingReports ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading user reports...</p>
                    </div>
                  ) : userReports.length === 0 ? (
                    <div className="p-8 text-center">
                      <DocumentTextIcon className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="mt-2 text-gray-600">No reports found for this user</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {userReports.map((report, index) => (
                        <div 
                          key={report._id} 
                          className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => viewReportDetails(report)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                              Report #{index + 1}
                              <span className="ml-2 text-xs text-gray-500">(Click to view details)</span>
                            </h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReportStatusColor(report.status)}`}>
                              {report.status || 'Pending'}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2 line-clamp-2">{report.description}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formatDate(report.createdAt)}
                            </span>
                            {report.location?.coordinates && (
                              <span className="flex items-center">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {report.location.coordinates.latitude?.toFixed(4)}, {report.location.coordinates.longitude?.toFixed(4)}
                              </span>
                            )}
                            {report.type && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                                {report.type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          {report.images && report.images.length > 0 && (
                            <div className="mt-2 flex items-center">
                              <img 
                                src={`http://localhost:3001/uploads/${report.images[0].filename}`}
                                alt="Report attachment"
                                className="h-12 w-12 object-cover rounded border mr-2"
                              />
                              {report.images.length > 1 && (
                                <span className="text-xs text-gray-500">+{report.images.length - 1} more</span>
                              )}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-end">
                            <div className="text-xs text-blue-600 font-medium flex items-center">
                              <EyeIcon className="h-3 w-3 mr-1" />
                              Click to view full details
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={closeUserModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Report Modal */}
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReportStatusColor(selectedReport.status)}`}>
                    {selectedReport.status || 'Pending'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={goBackToUserProfile}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Back to User Profile"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={closeReportModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Report Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Basic Report Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Report Information
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Report Type</label>
                        <p className="text-gray-900 capitalize">{selectedReport.type?.replace('_', ' ') || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-gray-900">{selectedReport.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Severity Level</label>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          selectedReport.severity === 'high' ? 'bg-red-100 text-red-800' :
                          selectedReport.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedReport.severity || 'Medium'}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Report ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedReport._id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location & Time Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPinIcon className="h-5 w-5 mr-2 text-green-600" />
                      Location & Timeline
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Address</label>
                        <p className="text-gray-900">{selectedReport.location?.address || 'Address not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">GPS Coordinates</label>
                        <p className="text-gray-900 font-mono text-sm">
                          {selectedReport.location?.coordinates?.latitude?.toFixed(6)}, {selectedReport.location?.coordinates?.longitude?.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Submitted</label>
                        <p className="text-gray-900 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                          {formatDate(selectedReport.createdAt)}
                        </p>
                      </div>
                      {selectedReport.updatedAt && selectedReport.updatedAt !== selectedReport.createdAt && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Last Updated</label>
                          <p className="text-gray-900">{formatDate(selectedReport.updatedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reporter Information */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                    <UsersIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Reported By
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900">{selectedReport.reportedBy?.name || 'Anonymous'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{selectedReport.reportedBy?.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">User ID</label>
                      <p className="text-gray-900 font-mono text-sm">{selectedReport.reportedBy?.id || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                {/* Images Section */}
                {selectedReport.images && selectedReport.images.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="mr-2">📷</span>
                      Attached Images ({selectedReport.images.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedReport.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={`http://localhost:3001/uploads/${image.filename}`}
                            alt={`Report attachment ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => window.open(`http://localhost:3001/uploads/${image.filename}`, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                            <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click on any image to view in full size</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between space-x-3">
                <button
                  onClick={goBackToUserProfile}
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  ← Back to User Profile
                </button>
                <button
                  onClick={closeReportModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users