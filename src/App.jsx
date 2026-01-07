import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import ReportsManagement from './pages/ReportsManagement'
import MapView from './pages/MapView'
import Login from './pages/Login'
import AdminProfile from './pages/AdminProfile'
import ChangePassword from './pages/ChangePassword'
import CreateAdmin from './pages/CreateAdmin'
import AdminManagement from './pages/AdminManagement'
import NewsManagement from './pages/NewsManagement'
import ReportsPDF from './pages/ReportsPDF'
import Analytics from './pages/Analytics'
import Users from './pages/Users'
import SystemSettings from './pages/SystemSettings'
import AuditLogs from './pages/AuditLogs'
import Navbar from './components/Navbar'
import './App.css'

function App() {
  // PrivateRoute component for route protection
  function PrivateRoute({ children }) {
    const token = localStorage.getItem('adminToken');
    return token ? children : <Navigate to="/login" replace />;
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/reports" element={
                <PrivateRoute>
                  <ReportsManagement />
                </PrivateRoute>
              } />
              <Route path="/users" element={
                <PrivateRoute>
                  <Users />
                </PrivateRoute>
              } />
              <Route path="/map" element={<MapView />} />
              <Route path="/admin/profile" element={
                <PrivateRoute>
                  <AdminProfile />
                </PrivateRoute>
              } />
              <Route path="/admin/change-password" element={
                <PrivateRoute>
                  <ChangePassword />
                </PrivateRoute>
              } />
              <Route path="/admin/create-admin" element={
                <PrivateRoute>
                  <CreateAdmin />
                </PrivateRoute>
              } />
              <Route path="/admin/manage-admins" element={
                <PrivateRoute>
                  <AdminManagement />
                </PrivateRoute>
              } />
              <Route path="/admin/news" element={
                <PrivateRoute>
                  <NewsManagement />
                </PrivateRoute>
              } />
              <Route path="/admin/reports-pdf" element={
                <PrivateRoute>
                  <ReportsPDF />
                </PrivateRoute>
              } />
              <Route path="/admin/analytics" element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              } />
              <Route path="/admin/settings" element={
                <PrivateRoute>
                  <SystemSettings />
                </PrivateRoute>
              } />
              <Route path="/admin/audit-logs" element={
                <PrivateRoute>
                  <AuditLogs />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
