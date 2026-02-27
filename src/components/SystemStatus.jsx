import { useState, useEffect } from 'react'
import systemStatusChecker from '../services/systemStatus'

const SystemStatus = () => {  const [systemStatus, setSystemStatus] = useState({
    frontend: { status: 'online', message: 'Online' },
    backend: { status: 'connecting', message: 'Connecting...' },
    database: { status: 'error', message: 'Setup Required', totalUsers: 0, activeUsers: 0 },
    mapService: { status: 'active', message: 'Active' }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkStatus()
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const checkStatus = async () => {
    try {
      const status = await systemStatusChecker.checkSystemStatus()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to check system status:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatusIndicator = ({ label, status, message, additionalInfo }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${systemStatusChecker.getStatusColor(status)} ${
          status === 'connecting' ? 'animate-pulse' : ''
        }`}></div>
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {additionalInfo && (
            <div className="text-xs text-gray-500">{additionalInfo}</div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${systemStatusChecker.getStatusTextColor(status)}`}>
          {message}
        </span>
        {loading && status === 'connecting' && (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
        <button
          onClick={checkStatus}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <StatusIndicator
          label="Frontend Application"
          status={systemStatus.frontend.status}
          message={systemStatus.frontend.message}
        />
        
        <StatusIndicator
          label="Backend API"
          status={systemStatus.backend.status}
          message={systemStatus.backend.message}
          additionalInfo={systemStatus.backend.uptime ? `Uptime: ${systemStatus.backend.uptime}` : null}
        />        <StatusIndicator
          label="Database"
          status={systemStatus.database.status}
          message={systemStatus.database.message}
          additionalInfo={systemStatus.database.totalReports ? 
            `${systemStatus.database.totalReports} reports` : 
            systemStatus.database.totalAdmins ? `${systemStatus.database.totalAdmins} admins` : null}
        />
        
        <StatusIndicator
          label="User Activity"
          status={systemStatus.database.totalUsers >= 0 ? 'online' : 'error'}
          message={systemStatus.database.totalUsers >= 0 ? 'Active' : 'Unknown'}
          additionalInfo={systemStatus.database.totalUsers >= 0 ? 
            `${systemStatus.database.totalUsers || 0} total, ${systemStatus.database.activeUsers || 0} online` : null}
        />
        
        <StatusIndicator
          label="Map Service"
          status={systemStatus.mapService.status}
          message={systemStatus.mapService.message}
        />
      </div>
      
      {/* Additional System Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
          <span>Auto-refresh: 30s</span>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
