import { Link, useLocation } from 'react-router-dom'
import { MapPinIcon, ChartBarIcon, DocumentTextIcon, UserIcon, ChevronDownIcon, CogIcon, KeyIcon, UserPlusIcon, ArrowRightOnRectangleIcon, UsersIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

const Navbar = () => {
  const location = useLocation()
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
    { name: 'Users', href: '/users', icon: UsersIcon },
    { name: 'Map View', href: '/map', icon: MapPinIcon },
  ]

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    window.location.href = '/login'
  }

  if (location.pathname === '/login') return null

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-8 w-8 text-red-600" />
            <span className="text-xl font-bold text-gray-900">RoadAlert</span>
            <span className="text-sm text-gray-500">Admin Dashboard</span>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>          {/* Admin Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowAdminDropdown(!showAdminDropdown)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-red-100 text-red-700'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              <UserIcon className="h-5 w-5 text-red-600" />
              <span className="text-red-600">Admin</span>
              <ChevronDownIcon className="h-4 w-4 text-red-600" />
            </button>

            {showAdminDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">                  <Link
                    to="/admin/profile"
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${
                      location.pathname === '/admin/profile'
                        ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowAdminDropdown(false)}
                  >
                    <CogIcon className="h-4 w-4 mr-3" />
                    Change Admin Identity
                  </Link>
                  <Link
                    to="/admin/change-password"
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${
                      location.pathname === '/admin/change-password'
                        ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowAdminDropdown(false)}
                  >
                    <KeyIcon className="h-4 w-4 mr-3" />
                    Change Password
                  </Link>
                  <Link
                    to="/admin/create-admin"
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${
                      location.pathname === '/admin/create-admin'
                        ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowAdminDropdown(false)}
                  >
                    <UserPlusIcon className="h-4 w-4 mr-3" />
                    Create Admin Account
                  </Link>
                  <Link
                    to="/admin/reports-pdf"
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${
                      location.pathname === '/admin/reports-pdf'
                        ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setShowAdminDropdown(false)}
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-3" />
                    Report List (PDF)
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
