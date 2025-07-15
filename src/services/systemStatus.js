import api from './api'

class SystemStatusChecker {
  constructor() {
    this.statusCache = {
      frontend: { status: 'online', message: 'Online' },
      backend: { status: 'connecting', message: 'Connecting...' },
      database: { status: 'error', message: 'Setup Required' },
      mapService: { status: 'active', message: 'Active' }
    }
    this.lastCheck = null
    this.checkInterval = 30000 // Check every 30 seconds
  }

  async checkSystemStatus() {
    const now = Date.now()
    
    // Don't check too frequently
    if (this.lastCheck && (now - this.lastCheck) < this.checkInterval) {
      return this.statusCache
    }

    try {
      // Check backend API health
      const backendStatus = await this.checkBackendStatus()
      
      // Check database connectivity
      const databaseStatus = await this.checkDatabaseStatus()
      
      // Frontend is always online if we can run this code
      this.statusCache.frontend = { status: 'online', message: 'Online' }
      
      // Backend status
      this.statusCache.backend = backendStatus
      
      // Database status
      this.statusCache.database = databaseStatus
      
      // Map service (always active for this implementation)
      this.statusCache.mapService = { status: 'active', message: 'Active' }
      
      this.lastCheck = now
      
    } catch (error) {
      console.error('System status check failed:', error)
      // Fallback to last known status
    }

    return this.statusCache
  }
  async checkBackendStatus() {
    try {
      const response = await fetch('http://localhost:3001/api/system/status', {
        method: 'GET',
        timeout: 5000
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return { 
            status: 'online', 
            message: 'Online',
            uptime: data.uptime ? Math.floor(data.uptime / 60) + 'm' : null,
            version: data.services?.api?.version
          }
        } else {
          return { status: 'error', message: 'Service Error' }
        }
      } else {
        return { status: 'error', message: 'HTTP ' + response.status }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { status: 'error', message: 'Timeout' }
      }
      return { status: 'offline', message: 'Offline' }
    }
  }
  async checkDatabaseStatus() {
    try {
      const response = await fetch('http://localhost:3001/api/system/status', {
        method: 'GET',
        timeout: 5000
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.services?.database?.status === 'connected') {
          return { 
            status: 'online', 
            message: 'Connected',
            totalReports: data.services.database.totalReports,
            totalAdmins: data.services.database.totalAdmins,
            totalUsers: data.services.database.totalUsers,
            activeUsers: data.services.database.activeUsers
          }
        } else if (data.services?.database?.status === 'error') {
          return { status: 'error', message: 'Database Error' }
        } else {
          return { status: 'error', message: 'Connection Error' }
        }
      } else {
        return { status: 'error', message: 'Backend Error' }
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return { status: 'offline', message: 'Backend Offline' }
      } else {
        return { status: 'error', message: 'Setup Required' }
      }
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-green-500'
      case 'connecting':
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
      case 'offline':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  getStatusTextColor(status) {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-600'
      case 'connecting':
      case 'warning':
        return 'text-yellow-600'
      case 'error':
      case 'offline':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }
}

// Create singleton instance
const systemStatusChecker = new SystemStatusChecker()

export default systemStatusChecker
