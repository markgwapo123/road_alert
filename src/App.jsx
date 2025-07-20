import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ReportsManagement from './pages/ReportsManagement'
import MapView from './pages/MapView'
import Login from './pages/Login'
import AdminProfile from './pages/AdminProfile'
import ChangePassword from './pages/ChangePassword'
import CreateAdmin from './pages/CreateAdmin'
import ReportsPDF from './pages/ReportsPDF'
import Navbar from './components/Navbar'
import useServerConnection from './hooks/useServerConnection'
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [serverDownMessage, setServerDownMessage] = useState('');

  const handleServerDown = () => {
    console.log('🚨 Admin: Server connection lost, logging out...');
    setServerDownMessage('Server connection lost. You have been logged out for security.');
    localStorage.removeItem('adminToken');
    // Force page reload to reset all state and redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  };

  const { isServerOnline, lastCheck } = useServerConnection(handleServerDown);

  // PrivateRoute component for route protection
  function PrivateRoute({ children }) {
    const token = localStorage.getItem('adminToken');
    return token ? children : <Navigate to="/login" replace />;
  }

  // ServerStatusProvider to pass server status to all components
  const ServerStatusProvider = ({ children }) => {
    useEffect(() => {
      // Add server status to window for access in components
      window.serverStatus = { isServerOnline };
    }, [isServerOnline]);

    return children;
  };

  return (
    <Router>
      <ServerStatusProvider>
        <div className="min-h-screen bg-gray-50">
          {serverDownMessage && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              textAlign: 'center',
              fontWeight: 'bold',
              borderBottom: '1px solid #f5c6cb',
              position: 'sticky',
              top: 0,
              zIndex: 1000
            }}>
              ⚠️ {serverDownMessage}
            </div>
          )}
          <Navbar serverStatus={isServerOnline} />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard serverStatus={isServerOnline} lastServerCheck={lastCheck} />
                </PrivateRoute>
              } />
              <Route path="/reports" element={
                <PrivateRoute>
                  <ReportsManagement />
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
              <Route path="/admin/reports-pdf" element={
                <PrivateRoute>
                  <ReportsPDF />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </ServerStatusProvider>
    </Router>
  )
}

export default App
