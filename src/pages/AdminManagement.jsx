import { useState, useEffect } from 'react'
import { PlusIcon, UserIcon, ShieldExclamationIcon, TrashIcon, EyeIcon, EyeSlashIcon, DocumentTextIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import config from '../config/index.js'
import { useAuth } from '../context/AuthContext.jsx'

const AdminManagement = () => {
  const { isSuperAdmin } = useAuth()
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    department: '',
    phone: ''
  })
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [adminActivity, setAdminActivity] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchCurrentAdmin()
    fetchAdminUsers()
  }, [])

  const fetchCurrentAdmin = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${config.API_BASE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setCurrentAdmin(response.data.admin)
      }
    } catch (err) {
      console.error('Error fetching current admin:', err)
    }
  }

  const fetchAdminUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${config.API_BASE_URL}/admin/admin-users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAdminUsers(response.data.adminUsers)
    } catch (err) {
      setError('Failed to load admin users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setError('')
    
    // Validate passwords match
    if (newAdmin.password !== newAdmin.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.post(`${config.API_BASE_URL}/admin/create-admin-user`, {
        ...newAdmin,
        profile: {
          department: newAdmin.department,
          phone: newAdmin.phone
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMessage('Admin user created successfully')
      setShowCreateModal(false)
      setNewAdmin({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        department: '',
        phone: ''
      })
      fetchAdminUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin user')
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminStatus = async (adminId) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.put(`${config.API_BASE_URL}/admin/admin-user/${adminId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage(response.data.message)
      fetchAdminUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle admin status')
    }
  }

  // Open delete confirmation modal
  const confirmDeleteAdmin = (admin) => {
    if (!isSuperAdmin()) {
      setError('Only Super Admins can delete admin users.')
      return
    }
    setAdminToDelete(admin)
    setShowDeleteConfirm(true)
  }

  // Cancel delete
  const cancelDeleteAdmin = () => {
    setAdminToDelete(null)
    setShowDeleteConfirm(false)
  }

  // Execute delete
  const deleteAdmin = async (adminId) => {
    setDeleteLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.delete(`${config.API_BASE_URL}/admin/admin-user/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage(response.data.message)
      setShowDeleteConfirm(false)
      setAdminToDelete(null)
      fetchAdminUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin user')
    } finally {
      setDeleteLoading(false)
    }
  }

  const fetchAdminActivity = async (adminId, adminData) => {
    setLoadingActivity(true)
    setSelectedAdmin(adminData)
    setShowActivityModal(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get(`${config.API_BASE_URL}/admin/activity-logs/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAdminActivity(response.data.activities || [])
    } catch (err) {
      console.error('Error fetching admin activity:', err)
      setError('Failed to fetch admin activity logs')
      setAdminActivity([])
    } finally {
      setLoadingActivity(false)
    }
  }

  const closeActivityModal = () => {
    setShowActivityModal(false)
    setSelectedAdmin(null)
    setAdminActivity([])
    setError('')
  }

  // Only super admins can access this page
  if (currentAdmin && currentAdmin.role !== 'super_admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-600">Only Super Administrators can manage admin users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin User Management</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create Admin User
        </button>
      </div>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Admin Users List */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Admin Users ({adminUsers.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin users...</p>
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No admin users found. Create your first admin user!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {admin.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.username}</div>
                          <div className="text-sm text-gray-500">
                            {admin.profile?.firstName || ''} {admin.profile?.lastName || ''}
                          </div>
                          <div className="text-xs text-gray-400">{admin.profile?.department || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.email || 'No email'}</div>
                      <div className="text-sm text-gray-500">{admin.profile?.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        admin.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Admin User</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                      {admin.createdBy && (
                        <div className="text-xs text-gray-400">
                          by {admin.createdBy.username}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAdminStatus(admin._id)}
                          className={`inline-flex items-center px-3 py-1 text-xs rounded-md ${
                            admin.isActive
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {admin.isActive ? (
                            <>
                              <EyeSlashIcon className="w-4 h-4 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <EyeIcon className="w-4 h-4 mr-1" />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => fetchAdminActivity(admin._id, admin)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-1" />
                          View Activity
                        </button>
                        <button
                          onClick={() => confirmDeleteAdmin(admin)}
                          className="inline-flex items-center px-3 py-1 text-xs bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Admin User</h3>
            </div>
            <form onSubmit={handleCreateAdmin} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={newAdmin.confirmPassword}
                  onChange={(e) => setNewAdmin({...newAdmin, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={newAdmin.department}
                  onChange={(e) => setNewAdmin({...newAdmin, department: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Admin User Permissions:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Review pending reports</li>
                  <li>• Accept/reject reports</li>
                  <li>• Create news posts for users</li>
                  <li>• Limited access (cannot manage other admins)</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Activity Modal */}
      {showActivityModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Admin Activity Logs</h3>
                  <p className="text-sm text-gray-500">
                    Activity history for {selectedAdmin.username}
                  </p>
                </div>
              </div>
              <button
                onClick={closeActivityModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Admin Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedAdmin.username}</h4>
                    <p className="text-sm text-gray-500">{selectedAdmin.email}</p>
                    <p className="text-xs text-gray-400">
                      {selectedAdmin.profile?.firstName} {selectedAdmin.profile?.lastName} • {selectedAdmin.profile?.department}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Logs */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <ClockIcon className="w-5 h-5 mr-2 text-gray-500" />
                  Recent Activity
                </h5>

                {loadingActivity ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading activity logs...</span>
                  </div>
                ) : adminActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Activity Found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No activity logs available for this admin user.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {adminActivity.map((activity, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                activity.action === 'login' ? 'bg-green-100 text-green-800' :
                                activity.action === 'logout' ? 'bg-gray-100 text-gray-800' :
                                activity.action === 'create' ? 'bg-blue-100 text-blue-800' :
                                activity.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                                activity.action === 'delete' ? 'bg-red-100 text-red-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {activity.action?.toUpperCase()}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {activity.description}
                              </span>
                            </div>
                            {activity.details && (
                              <div className="mt-2 space-y-1">
                                {activity.details.postTitle && (
                                  <p className="text-sm font-medium text-blue-600">
                                    📰 "{activity.details.postTitle}"
                                  </p>
                                )}
                                {activity.details.category && (
                                  <p className="text-xs text-gray-500">
                                    Category: {activity.details.category}
                                  </p>
                                )}
                                {activity.details.changes && (
                                  <p className="text-sm text-gray-600">
                                    Changes: {activity.details.changes}
                                  </p>
                                )}
                                {activity.details.reason && (
                                  <p className="text-sm text-red-600">
                                    Reason: {activity.details.reason}
                                  </p>
                                )}
                                {activity.details.priority && (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    activity.details.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    activity.details.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    Priority: {activity.details.priority}
                                  </span>
                                )}
                                {activity.details.attachmentsAdded && (
                                  <p className="text-xs text-green-600">
                                    Added {activity.details.attachmentsAdded} attachment(s)
                                  </p>
                                )}
                                {activity.details.targetAudience && (
                                  <p className="text-xs text-purple-600">
                                    Target: {activity.details.targetAudience}
                                  </p>
                                )}
                                {activity.details.dataPoints && (
                                  <p className="text-xs text-blue-600">
                                    Data points: {activity.details.dataPoints}
                                  </p>
                                )}
                                {activity.details.postId && (
                                  <p className="text-xs text-gray-400 font-mono">
                                    ID: {activity.details.postId}
                                  </p>
                                )}
                                {activity.details.commentId && (
                                  <p className="text-xs text-gray-400 font-mono">
                                    Comment ID: {activity.details.commentId}
                                  </p>
                                )}
                                {(activity.details.reportId || activity.details.newAdminUsername) && (
                                  <p className="text-sm text-gray-600">
                                    {typeof activity.details === 'object' 
                                      ? JSON.stringify(activity.details, null, 2)
                                      : activity.details
                                    }
                                  </p>
                                )}
                                {typeof activity.details === 'string' && (
                                  <p className="text-sm text-gray-600">
                                    {activity.details}
                                  </p>
                                )}
                              </div>
                            )}
                            {activity.ipAddress && (
                              <p className="text-xs text-gray-400 mt-1">
                                IP: {activity.ipAddress}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 ml-4">
                            {new Date(activity.timestamp || activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeActivityModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && adminToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Admin User
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Are you sure you want to permanently delete this admin user?
                  </p>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{adminToDelete.username}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Role: {adminToDelete.role === 'super_admin' ? 'Super Admin' : 'Admin'} • Email: {adminToDelete.email || 'N/A'}
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
                onClick={cancelDeleteAdmin}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteAdmin(adminToDelete._id)}
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
                    Delete Admin
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

export default AdminManagement