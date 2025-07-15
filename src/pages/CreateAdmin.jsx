import { useState } from 'react'
import { UserPlusIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const CreateAdmin = () => {
  const [adminData, setAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    role: 'admin', // Always admin
    firstName: '',
    lastName: '',
    department: '',
    phone: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    // Validation
    if (adminData.password !== adminData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (adminData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (!adminData.username || !adminData.password) {
      setError('Username and password are required')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.post('http://localhost:3001/api/admin/users', {
        username: adminData.username,
        password: adminData.password,
        email: adminData.email || undefined,
        role: adminData.role,
        profile: {
          firstName: adminData.firstName || undefined,
          lastName: adminData.lastName || undefined,
          department: adminData.department || undefined,
          phone: adminData.phone || undefined
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('Admin account created successfully!')
        setAdminData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          role: 'admin', // Reset to default admin role
          firstName: '',
          lastName: '',
          department: '',
          phone: ''
        })
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin account')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setAdminData({
      ...adminData,
      [e.target.name]: e.target.value
    })
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    })
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Admin Account</h1>
          <p className="mt-2 text-gray-600">Add a new administrator to the system</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8"><div className="flex items-center justify-center space-x-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <UserPlusIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">New Administrator</h2>
            <p className="text-gray-600">Create a new admin user account</p>
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
          {/* Account Information */}          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={adminData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter username"
                />
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={adminData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>                <div className="relative">
                  <input
                    type={showPasswords.password ? 'text' : 'password'}
                    name="password"
                    value={adminData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 text-gray-900"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('password')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.password ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>                <div className="relative">
                  <input
                    type={showPasswords.confirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={adminData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 text-gray-900"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>            </div>
          </div>

          {/* Personal Information */}          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Personal Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={adminData.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={adminData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={adminData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter department"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={adminData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setAdminData({
                username: '',
                password: '',
                confirmPassword: '',
                email: '',
                role: 'admin', // Reset to default admin role
                firstName: '',
                lastName: '',
                department: '',
                phone: ''
              })}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Admin Account'}            </button>
          </div>
        </form>        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 text-center">Security Guidelines</h4>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            <li>Use strong, unique passwords for each admin account</li>
            <li>Moderators can view and manage reports but cannot create new admin accounts</li>
            <li>Administrators have full access to all system features</li>
            <li>Regularly review and audit admin accounts</li>
          </ul>
        </div>
        </div>
      </div>
    </div>
  )
}

export default CreateAdmin
