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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Call backend login endpoint using production backend URL
      const response = await axios.post(`${config.API_BASE_URL}/auth/login`, {
        username: credentials.username,
        password: credentials.password
      })
      if (response.data && response.data.token) {
        // Store token as adminToken for axios interceptor
        localStorage.setItem('adminToken', response.data.token)
        setModalMessage('Login successful!')
        setModalType('success')
        setShowModal(true)
        // Redirect after modal is shown
        setTimeout(() => {
          window.location.href = '/reports' // or your admin dashboard route
        }, 1500)
      } else {
        setModalMessage('Login failed: No token received')
        setModalType('error')
        setShowModal(true)
      }
    } catch (error) {
      setModalMessage('Login failed: ' + (error.response?.data?.error || error.message))
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
            >
              Sign in
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
