import { Link, useLocation } from 'react-router-dom'
import { MapPinIcon, ChartBarIcon, DocumentTextIcon, UserIcon, ChevronDownIcon, CogIcon, KeyIcon, UserPlusIcon, ArrowRightOnRectangleIcon, UsersIcon, NewspaperIcon, ShieldCheckIcon, Bars3Icon, XMarkIcon, PresentationChartLineIcon, ClipboardDocumentListIcon, Cog6ToothIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import AdminLogoutConfirmModal from './AdminLogoutConfirmModal'
import axios from 'axios'
import config from '../config/index.js'

const Navbar = () => {
  const location = useLocation()
  const [showAdminDropdown, setShowAdminDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  
  // Check if current admin is super admin
  const isSuperAdmin = currentAdmin?.role === 'super_admin'
  
  useEffect(() => {
    if (location.pathname !== '/login') {
      fetchCurrentAdmin()
      fetchMaintenanceStatus()
    }
  }, [location.pathname])

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/settings/maintenance/status`)
      if (response.data.success) {
        setMaintenanceMode(response.data.maintenance.enabled)
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err)
    }
  }

  const fetchCurrentAdmin = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return

      const response = await axios.get(`${config.API_BASE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setCurrentAdmin(response.data.admin)
      }
    } catch (err) {
      console.error('Error fetching current admin:', err)
      // If token is invalid, redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken')
        window.location.href = '/login'
      }
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
    { name: 'Users', href: '/users', icon: UsersIcon },
    { name: 'Map View', href: '/map', icon: MapPinIcon },
    // News Management - available to both roles
    { name: 'News', href: '/admin/news', icon: NewspaperIcon, permission: 'create_news_posts' },
  ]

  // Filter navigation based on permissions
  const filteredNavigation = currentAdmin 
    ? navigation.filter(item => 
        !item.permission || currentAdmin.permissions?.includes(item.permission)
      )
    : navigation

  const handleLogoutClick = () => {
    setShowAdminDropdown(false)
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = () => {
    localStorage.removeItem('adminToken')
    setShowLogoutModal(false)
    window.location.href = '/login'
  }

  if (location.pathname === '/login') return null

  return (
    <>
      {/* Maintenance Mode Banner */}
      {maintenanceMode && (
        <div className="bg-orange-500 text-white px-4 py-2">
          <div className="container mx-auto flex items-center justify-center gap-2">
            <WrenchScrewdriverIcon className="h-5 w-5" />
            <span className="text-sm font-medium">
              Maintenance Mode is Active - Users cannot access the system
            </span>
            {isSuperAdmin && (
              <Link
                to="/admin/settings"
                className="ml-4 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs font-medium"
              >
                Manage
              </Link>
            )}
          </div>
        </div>
      )}
      <nav className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <MapPinIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">BantayDalan</span>
            {/* Role Badge */}
            {currentAdmin && (
              <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                isSuperAdmin 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex space-x-4 xl:space-x-8">
            {filteredNavigation.map((item) => {
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
          </div>

          {/* Desktop Admin Dropdown Menu */}
          <div className="hidden lg:block relative">
            <button
              onClick={() => setShowAdminDropdown(!showAdminDropdown)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-red-100 text-red-700'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              <UserIcon className="h-5 w-5 text-red-600" />
              <span className="text-red-600">
                {currentAdmin?.username || (currentAdmin?.role === 'super_admin' ? 'Super Admin' : 'Admin')}
              </span>
              <ChevronDownIcon className="h-4 w-4 text-red-600" />
            </button>

            {showAdminDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <Link
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
                  
                  {/* Super Admin Only Options */}
                  {currentAdmin?.role === 'super_admin' && (
                    <>
                      <hr className="my-1" />
                      <div className="px-4 py-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Super Admin
                        </span>
                      </div>
                      <Link
                        to="/admin/manage-admins"
                        className={`flex items-center px-4 py-2 text-sm transition-colors ${
                          location.pathname === '/admin/manage-admins'
                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setShowAdminDropdown(false)}
                      >
                        <ShieldCheckIcon className="h-4 w-4 mr-3" />
                        Manage Admin Users
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
                        to="/admin/settings"
                        className={`flex items-center px-4 py-2 text-sm transition-colors ${
                          location.pathname === '/admin/settings'
                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setShowAdminDropdown(false)}
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-3" />
                        System Settings
                      </Link>
                      <Link
                        to="/admin/audit-logs"
                        className={`flex items-center px-4 py-2 text-sm transition-colors ${
                          location.pathname === '/admin/audit-logs'
                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setShowAdminDropdown(false)}
                      >
                        <ClipboardDocumentListIcon className="h-4 w-4 mr-3" />
                        Audit Logs
                      </Link>
                    </>
                  )}
                  
                  <hr className="my-1" />
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
                    onClick={handleLogoutClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 pb-3">
            <div className="pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-red-100 text-red-700 border-l-4 border-red-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-l-4 border-transparent'
                    }`}
                  >
                    <item.icon className="h-6 w-6" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Mobile Admin Section */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4 mb-3">
                <UserIcon className="h-6 w-6 text-red-600" />
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-900">
                    {currentAdmin?.username || 'Admin'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentAdmin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <CogIcon className="h-5 w-5 mr-3" />
                  Change Identity
                </Link>
                <Link
                  to="/admin/change-password"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <KeyIcon className="h-5 w-5 mr-3" />
                  Change Password
                </Link>
                {currentAdmin?.role === 'super_admin' && (
                  <>
                    <Link
                      to="/admin/manage-admins"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <ShieldCheckIcon className="h-5 w-5 mr-3" />
                      Manage Admins
                    </Link>
                    <Link
                      to="/admin/create"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <UserPlusIcon className="h-5 w-5 mr-3" />
                      Create New Admin
                    </Link>
                    <Link
                      to="/admin/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Cog6ToothIcon className="h-5 w-5 mr-3" />
                      System Settings
                    </Link>
                    <Link
                      to="/admin/audit-logs"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 mr-3" />
                      Audit Logs
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogoutClick()
                  }}
                  className="flex items-center w-full px-4 py-2 text-base font-medium text-red-700 hover:bg-red-50"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <AdminLogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </nav>
    </>
  )
}

export default Navbar
