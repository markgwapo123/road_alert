import React, { useState, useEffect } from 'react'
import { 
  ClipboardDocumentListIcon, 
  FunnelIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import config from '../config/index.js'

const AuditLogs = () => {
  const { isSuperAdmin } = useAuth()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0
  })

  // Filters
  const [filters, setFilters] = useState({
    category: '',
    action: '',
    adminId: '',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'auth', label: 'Authentication' },
    { value: 'reports', label: 'Reports' },
    { value: 'users', label: 'Users' },
    { value: 'admins', label: 'Admin Management' },
    { value: 'settings', label: 'System Settings' },
    { value: 'news', label: 'News' },
    { value: 'override', label: 'Override Actions' }
  ]

  const actions = [
    { value: '', label: 'All Actions' },
    // Auth
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'password_change', label: 'Password Change' },
    // Reports
    { value: 'report_view', label: 'Report View' },
    { value: 'report_edit', label: 'Report Edit' },
    { value: 'report_verify', label: 'Report Verify' },
    { value: 'report_reject', label: 'Report Reject' },
    { value: 'report_delete', label: 'Report Delete' },
    // Users
    { value: 'user_view', label: 'User View' },
    { value: 'user_freeze', label: 'User Freeze' },
    { value: 'user_unfreeze', label: 'User Unfreeze' },
    { value: 'user_delete', label: 'User Delete' },
    // Admins
    { value: 'admin_create', label: 'Admin Create' },
    { value: 'admin_edit', label: 'Admin Edit' },
    { value: 'admin_delete', label: 'Admin Delete' },
    { value: 'admin_activate', label: 'Admin Activate' },
    { value: 'admin_deactivate', label: 'Admin Deactivate' },
    // Settings
    { value: 'settings_view', label: 'Settings View' },
    { value: 'settings_update', label: 'Settings Update' }
  ]

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchLogs()
      fetchStats()
    }
  }, [pagination.page, filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.category && { category: filters.category }),
        ...(filters.action && { action: filters.action }),
        ...(filters.adminId && { adminId: filters.adminId }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`${config.API_BASE_URL}/settings/audit-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      const response = await fetch(`${config.API_BASE_URL}/settings/audit-logs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'blocked':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      auth: 'bg-blue-100 text-blue-700',
      reports: 'bg-green-100 text-green-700',
      users: 'bg-purple-100 text-purple-700',
      admins: 'bg-orange-100 text-orange-700',
      settings: 'bg-gray-100 text-gray-700',
      news: 'bg-pink-100 text-pink-700',
      override: 'bg-red-100 text-red-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      action: '',
      adminId: '',
      search: '',
      startDate: '',
      endDate: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Check access
  if (!isSuperAdmin()) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <ClipboardDocumentListIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
        <p className="text-red-600">
          Only Super Admins can view audit logs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-8 w-8 text-red-600" />
              Audit Logs
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track all admin actions and system events
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                showFilters 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-4 w-4 inline mr-1" />
              Filters
            </button>
            <button
              onClick={() => { fetchLogs(); fetchStats(); }}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Successful</p>
              <p className="text-2xl font-bold text-green-700">
                {stats.byAction?.filter(a => !['blocked'].includes(a._id)).reduce((acc, a) => acc + a.count, 0) || 0}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Blocked Actions</p>
              <p className="text-2xl font-bold text-yellow-700">
                {stats.recentBlocked?.length || 0}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Active Admins</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.byAdmin?.length || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search logs..."
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                {actions.map(act => (
                  <option key={act.value} value={act.value}>{act.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <XCircleIcon className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id} className={`hover:bg-gray-50 ${log.status === 'blocked' ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusIcon(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCircleIcon className="h-8 w-8 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.adminUsername}</p>
                          <p className="text-xs text-gray-500">{log.adminRole === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.targetName || log.targetType || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogs
