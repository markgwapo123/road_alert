import { useState } from 'react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import AdminConfirmModal from '../components/AdminConfirmModal'
import config from '../config/index.js'

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: 'admin', // Pre-filled for testing
    password: 'admin123' // Pre-filled for testing
  })
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [modalType, setModalType] = useState('success')
  const [isLoading, setIsLoading] = useState(false) // Add loading state

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true) // Start loading
    try {
      // Call backend login endpoint using production backend URL
      const response = await axios.post(`${config.API_BASE_URL}/auth/login`, {
        username: credentials.username,
        password: credentials.password
      })
      if (response.data && response.data.token) {
        // Store token as adminToken for axios interceptor
        localStorage.setItem('adminToken', response.data.token)
        setIsLoading(false) // Stop loading
        setModalMessage('✅ Login successful! Redirecting to dashboard...')
        setModalType('success')
        setShowModal(true)
        // Redirect after modal is shown
        setTimeout(() => {
          window.location.href = '/reports' // or your admin dashboard route
        }, 2000) // Increased to 2 seconds to show success message
      } else {
        setIsLoading(false) // Stop loading
        setModalMessage('❌ Login failed: No token received')
        setModalType('error')
        setShowModal(true)
      }
    } catch (error) {
      setIsLoading(false) // Stop loading
      setModalMessage('❌ Login failed: ' + (error.response?.data?.error || error.message))
      setModalType('error')
      setShowModal(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <MapPinIcon className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            BantayDalan Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the admin dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                disabled={isLoading}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm ${
                  isLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying credentials...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <AdminConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        message={modalMessage}
        type={modalType}
      />
    </div>
  )
}

export default Login
