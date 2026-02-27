import { useState } from 'react'
import { KeyIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const ChangePassword = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
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
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await axios.put('http://localhost:3001/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        setMessage('Password changed successfully!')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setPasswordData({
      ...passwordData,
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
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Change Password</h1>
          <p className="mt-2 text-gray-600">Update your admin account password</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <KeyIcon className="h-8 w-8 text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
            <p className="text-gray-600">Keep your account secure</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 text-gray-900"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.current ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handleChange}
                required
                minLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 text-gray-900"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.new ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-10 text-gray-900"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPasswords.confirm ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 text-center">Password Requirements</h4>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            <li>At least 6 characters long</li>
            <li>Use a strong, unique password</li>
            <li>Don't reuse previous passwords</li>
          </ul>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword
