import { useState, useEffect } from 'react'
import { CheckBadgeIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { reportsAPI } from '../services/api'

const AdminAcceptanceActivity = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAcceptanceLogs()
  }, [])

  const fetchAcceptanceLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch recent 10 acceptance logs
      const response = await reportsAPI.getAcceptanceLogs({ 
        limit: 10,
        page: 1
      })
      
      console.log('Acceptance logs response:', response.data)
      setLogs(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch acceptance logs:', err)
      setError('Failed to load acceptance activity')
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Admin Acceptance Activity</h2>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Admin Acceptance Activity</h2>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchAcceptanceLogs}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Admin Acceptance Activity</h2>
          <p className="text-sm text-gray-600">Track which admin accepted or rejected each report</p>
        </div>
        <ClockIcon className="h-5 w-5 text-gray-400" />
      </div>

      {logs.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-gray-500">No acceptance activity yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {logs.map((log) => (
            <div key={log._id} className="p-4 hover:bg-gray-50 transition-colors">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => window.location.href = '/reports'}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Reports →
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminAcceptanceActivity
