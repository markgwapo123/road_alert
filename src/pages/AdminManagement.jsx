import { useState, useEffect } from 'react'
import { PlusIcon, UserIcon, ShieldExclamationIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import config from '../config/index.js'

const AdminManagement = () => {
  const [adminUsers, setAdminUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    phone: ''
  })
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    setLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.post(`${config.API_BASE_URL}/admin/create-admin-user`, {
        ...newAdmin,
        profile: {
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
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
        email: '',
        firstName: '',
        lastName: '',
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

  const deleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin user?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.delete(`${config.API_BASE_URL}/admin/admin-user/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessage(response.data.message)
      fetchAdminUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin user')
    }
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
          <p className="text-gray-600 mt-2">Manage admin users and their permissions</p>
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
                          onClick={() => deleteAdmin(admin._id)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({...newAdmin, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({...newAdmin, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  />
                </div>
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
    </div>
  )
}

export default AdminManagement