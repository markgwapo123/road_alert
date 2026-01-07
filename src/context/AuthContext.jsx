import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import config from '../config/index.js'

// Create the Auth Context
const AuthContext = createContext(null)

// Permission definitions matching backend
export const PERMISSIONS = {
  // Report permissions
  REPORT_VIEW: 'report_view',
  REPORT_EDIT: 'report_edit',
  REPORT_VERIFY: 'report_verify',
  REPORT_REJECT: 'report_reject',
  REPORT_DELETE: 'report_delete',
  REPORT_RESOLVE: 'report_resolve',
  
  // User permissions
  USER_VIEW: 'user_view',
  USER_FREEZE: 'user_freeze',
  USER_DELETE: 'user_delete',
  
  // Admin permissions
  ADMIN_VIEW: 'admin_view',
  ADMIN_CREATE: 'admin_create',
  ADMIN_EDIT: 'admin_edit',
  ADMIN_DELETE: 'admin_delete',
  ADMIN_ROLE_CHANGE: 'admin_role_change',
  
  // System permissions
  SETTINGS_VIEW: 'settings_view',
  SETTINGS_UPDATE: 'settings_update',
  ANALYTICS_VIEW: 'analytics_view',
  AUDIT_LOGS_VIEW: 'audit_logs_view',
  
  // News permissions
  NEWS_CREATE: 'news_create',
  NEWS_EDIT: 'news_edit',
  NEWS_DELETE: 'news_delete',
  
  // Override permission (Super Admin only)
  OVERRIDE: 'override'
}

// Role definitions
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_USER: 'admin_user'
}

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [roleInfo, setRoleInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch admin role info from backend
  const fetchRoleInfo = useCallback(async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await axios.get(`${config.API_BASE_URL}/admin/role-info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setRoleInfo(response.data.roleInfo)
        setAdmin({
          id: response.data.roleInfo.id,
          username: response.data.roleInfo.username,
          role: response.data.roleInfo.role,
          isSuperAdmin: response.data.roleInfo.isSuperAdmin
        })
      }
    } catch (err) {
      console.error('Error fetching role info:', err)
      if (err.response?.status === 401) {
        // Token invalid, clear it
        localStorage.removeItem('adminToken')
        setAdmin(null)
        setRoleInfo(null)
      }
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    fetchRoleInfo()
  }, [fetchRoleInfo])

  // Check if admin has a specific permission
  const hasPermission = useCallback((permission) => {
    if (!roleInfo) return false
    
    // Super admin has all permissions
    if (roleInfo.isSuperAdmin) return true
    
    // Check if permission is in the admin's permissions array
    return roleInfo.permissions?.includes(permission) || false
  }, [roleInfo])

  // Check if admin is super admin
  const isSuperAdmin = useCallback(() => {
    return roleInfo?.isSuperAdmin || false
  }, [roleInfo])

  // Check if admin can delete reports (Super Admin only)
  const canDeleteReports = useCallback(() => {
    return roleInfo?.canDeleteReports || false
  }, [roleInfo])

  // Check if admin can delete users (Super Admin only)
  const canDeleteUsers = useCallback(() => {
    return roleInfo?.canDeleteUsers || false
  }, [roleInfo])

  // Check if admin can manage other admins (Super Admin only)
  const canManageAdmins = useCallback(() => {
    return roleInfo?.canManageAdmins || false
  }, [roleInfo])

  // Check if admin can access system settings (Super Admin only)
  const canAccessSettings = useCallback(() => {
    return roleInfo?.canAccessSettings || false
  }, [roleInfo])

  // Check if admin can view audit logs (Super Admin only)
  const canViewAuditLogs = useCallback(() => {
    return roleInfo?.canViewAuditLogs || false
  }, [roleInfo])

  // Check if admin can override actions (Super Admin only)
  const canOverride = useCallback(() => {
    return roleInfo?.canOverride || false
  }, [roleInfo])

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      const response = await axios.post(`${config.API_BASE_URL}/auth/login`, credentials)
      
      if (response.data.success && response.data.token) {
        localStorage.setItem('adminToken', response.data.token)
        await fetchRoleInfo()
        return { success: true }
      }
      
      return { success: false, error: 'Login failed' }
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.error || err.message 
      }
    }
  }, [fetchRoleInfo])

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('adminToken')
    setAdmin(null)
    setRoleInfo(null)
  }, [])

  // Refresh role info (useful after admin actions)
  const refreshRoleInfo = useCallback(() => {
    return fetchRoleInfo()
  }, [fetchRoleInfo])

  // Context value
  const value = {
    // State
    admin,
    roleInfo,
    loading,
    error,
    
    // Auth functions
    login,
    logout,
    refreshRoleInfo,
    
    // Permission checks
    hasPermission,
    isSuperAdmin,
    canDeleteReports,
    canDeleteUsers,
    canManageAdmins,
    canAccessSettings,
    canViewAuditLogs,
    canOverride,
    
    // Constants
    PERMISSIONS,
    ROLES
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-Order Component for role-based route protection
export const withRoleProtection = (Component, requiredPermissions = []) => {
  return function ProtectedComponent(props) {
    const { hasPermission, loading, admin } = useAuth()
    
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      )
    }
    
    if (!admin) {
      window.location.href = '/login'
      return null
    }
    
    // Check all required permissions
    const hasAllPermissions = requiredPermissions.every(perm => hasPermission(perm))
    
    if (!hasAllPermissions) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Access Denied</h3>
          <p className="text-red-600">
            You don't have permission to access this page.
          </p>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

// Component for conditional rendering based on permissions
export const PermissionGate = ({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = true,
  fallback = null 
}) => {
  const { hasPermission, isSuperAdmin } = useAuth()
  
  // Super admin bypasses all permission checks
  if (isSuperAdmin()) {
    return <>{children}</>
  }
  
  // Check single permission
  if (permission) {
    return hasPermission(permission) ? <>{children}</> : fallback
  }
  
  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p))
    
    return hasAccess ? <>{children}</> : fallback
  }
  
  return <>{children}</>
}

// Component for Super Admin only content
export const SuperAdminOnly = ({ children, fallback = null }) => {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin() ? <>{children}</> : fallback
}

// Component for Admin Users (both roles)
export const AdminOnly = ({ children, fallback = null }) => {
  const { admin } = useAuth()
  return admin ? <>{children}</> : fallback
}

export default AuthContext
