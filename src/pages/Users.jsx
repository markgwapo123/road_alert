import { useState, useEffect } from 'react'
import { UsersIcon, ClockIcon, CheckCircleIcon, XCircleIcon, UserGroupIcon, EyeIcon } from '@heroicons/react/24/outline'

const Users = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Online Users</p>
                <p className="text-2xl font-bold text-green-600">{stats.onlineUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <EyeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeUsers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            <p className="text-gray-600">Total: {users.length} users</p>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-4 text-gray-600">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user) => {
                const StatusIcon = getStatusIcon(user.isOnline)
                return (
                  <div key={user._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <UsersIcon className="h-6 w-6 text-gray-600" />
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
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.isOnline)}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {user.onlineStatus}
                        </span>
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
      </div>
    </div>
  )
}

export default Users