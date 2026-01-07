import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from './config/index.js';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfilePage from './pages/ProfilePage';
import ReportForm from './components/ReportForm';
import NewsFeed from './components/NewsFeed';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import MyReports from './components/MyReports';
import NotificationPage from './pages/NotificationPage';
import ConfirmationModal from './components/ConfirmationModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import MaintenancePage from './pages/MaintenancePage';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentView, setCurrentView] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationType, setConfirmationType] = useState('success');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceScheduledEnd, setMaintenanceScheduledEnd] = useState('');
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Check maintenance status on app load and periodically
  useEffect(() => {
    checkMaintenanceStatus();
    // Check maintenance status every 60 seconds
    const maintenanceInterval = setInterval(checkMaintenanceStatus, 60000);
    return () => clearInterval(maintenanceInterval);
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/settings/maintenance/status`);
      if (res.data.success && res.data.maintenance) {
        setMaintenanceMode(res.data.maintenance.enabled);
        setMaintenanceMessage(res.data.maintenance.message || '');
        setMaintenanceScheduledEnd(res.data.maintenance.scheduledEnd || '');
      } else {
        setMaintenanceMode(false);
      }
    } catch (err) {
      console.log('Maintenance status check failed:', err.message);
      // If API fails, assume not in maintenance mode
      setMaintenanceMode(false);
    } finally {
      setCheckingMaintenance(false);
    }
  };


  useEffect(() => {
    if (token) {
      fetchNotifications();
      fetchUser();
      const notificationInterval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(notificationInterval);
    } else {
      setUser(null);
    }
  }, [token]);


  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showReport) {
        setShowReport(false);
      }
    };

    if (showReport) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showReport]);

  const fetchNotifications = async () => {
    try {
      if (!token) {
        return;
      }
      
      const res = await axios.get(`${config.API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.log('Notifications unavailable:', err.response?.status || err.message);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const fetchUser = async () => {
    try {
      if (!token) {
        setUser(null);
        return;
      }
      
      const res = await axios.get(`${config.API_BASE_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUser(res.data.data);
    } catch (err) {
      console.log('User data unavailable:', err.response?.status || err.message);
      setUser(null);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      if (!token) {
        return;
      }
      
      await axios.put(`${config.API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      fetchNotifications();
    } catch (err) {
      console.log('Error marking notification as read:', err.response?.status || err.message);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await axios.post(`${config.API_BASE_URL}/notifications/mark-all-read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNewReportClick = () => {
    // Directly open report form (location toggle is now inside the form)
    setShowReport(true);
  };

  const handleSuccessfulReport = () => {
    setShowReport(false);
    setCurrentView('myreports');
  };

  const handleLogin = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setConfirmationMessage('Successfully logged in! 🎉');
    setConfirmationType('success');
    setShowConfirmation(true);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setIsMobileMenuOpen(false); // Close mobile menu when logout modal opens
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowLogoutConfirm(false);
    setConfirmationMessage('Successfully logged out! 👋');
    setConfirmationType('success');
    setShowConfirmation(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const refreshUserData = () => {
    if (token) {
      fetchUser();
    }
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleRegister = (token) => {
    if (token) {
      handleLogin(token);
    } else {
      setShowRegister(false);
    }
  };

  // Show loading while checking maintenance status
  if (checkingMaintenance) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>🚧</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show maintenance page if maintenance mode is enabled
  if (maintenanceMode) {
    return (
      <MaintenancePage 
        message={maintenanceMessage} 
        scheduledEnd={maintenanceScheduledEnd} 
      />
    );
  }

  if (!token) {
    if (showRegister) {
      return <Register onRegister={handleRegister} switchToLogin={() => setShowRegister(false)} />;
    }
    return <Login onLogin={handleLogin} switchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <div className={currentView === 'profile' || currentView === 'notifications' ? 'verification-active' : ''}>
      {/* Desktop Navigation */}
      <nav className="navbar desktop-nav">
        <div className="navbar-left">
          <span className="logo">🚧</span>
          <span className="app-name">BANTAY DALAN</span>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigation('home')}
        >
          <span className="nav-icon">🏠</span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'myreports' ? 'active' : ''}`}
          onClick={() => handleNavigation('myreports')}
        >
          <span className="nav-icon">📊</span>
        </button>
        
        <button 
          className="nav-btn add-btn"
          onClick={handleNewReportClick}
        >
          <span className="nav-icon">✚</span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'notifications' ? 'active' : ''}`}
          onClick={() => handleNavigation('notifications')}
        >
          <span className="nav-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
        
        <button 
          className={`nav-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="nav-icon">≡</span>
        </button>
      </nav>

      <main>
        {/* Report Form */}
        {showReport && (
          <div 
            className="report-form-fullscreen-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowReport(false);
              }
            }}
          >
            <ReportForm 
              onReport={handleSuccessfulReport} 
              onClose={() => {
                setShowReport(false);
              }}
            />
          </div>
        )}
        
        <div className="app-layout">
          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="mobile-menu-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-menu-header">
                  <h3>Menu</h3>
                  <button 
                    className="close-menu-btn"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mobile-menu-items">
                  <button
                    className="mobile-menu-item"
                    onClick={() => handleNavigation('profile')}
                  >
                    <span className="menu-icon">👤</span>
                    <span>Profile</span>
                  </button>
                  
                  <button
                    className="mobile-menu-item logout-item"
                    onClick={handleLogoutClick}
                  >
                    <span className="menu-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Desktop Sidebar */}
          <div className="desktop-sidebar">
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px',
                color: 'white',
                overflow: 'hidden',
                border: '2px solid #e5e7eb'
              }}>
                {user?.profileImage ? (
                  <img 
                    src={`${config.BACKEND_URL}${user.profileImage}`}
                    alt="Profile"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      console.log('User profile image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '👤';
                    }}
                  />
                ) : (
                  '👤'
                )}
              </div>
              <h3 style={{ 
                margin: '0 0 4px 0', 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Welcome Back{user?.username ? `, ${user.username}` : ''}!
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: '#6b7280'
              }}>
                Ready to report road issues
              </p>
            </div>

            <nav style={{ marginBottom: '20px' }}>
              <h4 style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Navigation
              </h4>

              <button
                onClick={() => handleNavigation('home')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: currentView === 'home' ? '#3b82f6' : 'transparent',
                  color: currentView === 'home' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                🏠 News Feed
              </button>

              <button
                onClick={handleNewReportClick}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: showReport ? '#10b981' : 'transparent',
                  color: showReport ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                📝 New Report
              </button>

              <button
                onClick={() => handleNavigation('myreports')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: currentView === 'myreports' ? '#3b82f6' : 'transparent',
                  color: currentView === 'myreports' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                📊 My Reports
              </button>

              <button
                onClick={() => handleNavigation('notifications')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: currentView === 'notifications' ? '#3b82f6' : 'transparent',
                  color: currentView === 'notifications' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                🔔 Notification
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: '600',
                    marginLeft: 'auto'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNavigation('profile')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: currentView === 'profile' ? '#3b82f6' : 'transparent',
                  color: currentView === 'profile' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                👤 Profile
              </button>
            </nav>

            <button
              onClick={handleLogoutClick}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                marginTop: 'auto'
              }}
            >
              🚪 Logout
            </button>
          </div>

          {/* Main Content Area */}
          <div className="main-content">
            {currentView === 'home' && <NewsFeed user={user} />}
            {currentView === 'myreports' && <MyReports token={token} />}
            {currentView === 'profile' && (
              <ProfilePage 
                token={token} 
                onLogout={handleLogoutClick}
                onUserUpdate={refreshUserData}
              />
            )}
            {currentView === 'notifications' && (
              <NotificationPage 
                token={token}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markNotificationAsRead}
                onMarkAllAsRead={markAllNotificationsAsRead}
                onRefresh={fetchNotifications}
              />
            )}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        message={confirmationMessage}
        type={confirmationType}
        autoCloseDelay={2000}
      />
    </div>
  );
}

export default App;