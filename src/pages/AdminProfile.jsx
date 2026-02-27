import { useState, useEffect } from 'react'
import { UserIcon, CheckIcon, ShieldCheckIcon, ClockIcon, KeyIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const AdminProfile = () => {  const [profile, setProfile] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    phone: '',
    role: '',
    isActive: true,
    lastLogin: null,
    permissions: [],
    createdAt: null
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminProfile()
  }, [])

  const fetchAdminProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.get('http://localhost:3010/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        if (response.data.success) {
        const adminData = response.data.admin;
        setProfile({
          username: adminData.username || '',
          email: adminData.email || '',
          firstName: adminData.profile?.firstName || '',
          lastName: adminData.profile?.lastName || '',
          department: adminData.profile?.department || '',
          phone: adminData.profile?.phone || '',
          role: adminData.role || '',
          isActive: adminData.isActive || false,
          lastLogin: adminData.lastLogin || null,
          permissions: adminData.permissions || [],
          createdAt: adminData.createdAt || null
        })
      }
    } catch (err) {
      setError('Failed to load admin profile')
    }
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.put('http://localhost:3010/api/auth/profile', {
        email: profile.email,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          department: profile.department,
          phone: profile.phone
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('Profile updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    })
  }

  return (    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
        <p className="text-gray-600">View and manage your admin account information</p>
      </div>

      {/* Admin Information Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Administrator Information</h2>
            <p className="text-gray-600">Your account details and system permissions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <UserIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-900">{profile.username || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900 capitalize">{profile.role || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`h-3 w-3 rounded-full ${profile.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium text-gray-900">{profile.isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium text-gray-900">
                  {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="font-medium text-gray-900">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <KeyIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Permissions</p>
                <p className="font-medium text-gray-900">{profile.permissions?.length || 0} granted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions List */}
        {profile.permissions && profile.permissions.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">System Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {profile.permissions.map((permission, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editable Profile Form */}
      <div className="bg-white rounded-lg shadow p-6">        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <UserIcon className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Profile Information</h2>
            <p className="text-gray-600">Update your personal details and contact information</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-700">{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={profile.username}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>              <input
                type="text"
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>              <input
                type="text"
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>              <input
                type="text"
                name="department"
                value={profile.department}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                placeholder="Enter your department"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminProfile
