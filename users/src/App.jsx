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
import './App.css';
// import './sidebar.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'myreports', 'profile', 'notifications'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu state

  // Fetch notifications when token changes
  useEffect(() => {
    if (token) {
      fetchNotifications();
      // Set up periodic notification checking
      const notificationInterval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
      return () => clearInterval(notificationInterval);
    }
  }, [token]);

  // ESC key handler for closing report form
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showReport) {
        setShowReport(false);
      }
    };

    if (showReport) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
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
      // Only fetch notifications if user is logged in with a valid token
      if (!token) {
        return;
      }
      
      const res = await axios.get(`${config.API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      // Silently handle notification errors - they're not critical for basic app functionality
      console.log('Notifications unavailable:', err.response?.status || err.message);
      setNotifications([]);
      setUnreadCount(0);
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
      
      // Refresh notifications
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
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleLogin = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Helper function to handle navigation and close mobile menu
  const handleNavigation = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const handleRegister = (token) => {
    if (token) {
      // Auto-login after registration
      handleLogin(token);
    } else {
      // Just switch to login page
      setShowRegister(false);
    }
  };

  if (!token) {
    if (showRegister) {
      return <Register onRegister={handleRegister} switchToLogin={() => setShowRegister(false)} />;
    }
    return <Login onLogin={handleLogin} switchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <div className={currentView === 'profile' || currentView === 'notifications' ? 'verification-active' : ''}>
      <nav className="navbar">
        <div className="navbar-left">
          <button 
            className="burger-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '8px',
              marginRight: '12px'
            }}
          >
            ☰
          </button>
          <span className="logo">🚧</span>
          <span className="app-name">ROAD ALERT</span>
        </div>
      </nav>
      <main>
        {showReport && (
          <div 
            className="report-form-fullscreen-overlay"
            onClick={(e) => {
              // Close form when clicking the overlay background
              if (e.target === e.currentTarget) {
                setShowReport(false);
              }
            }}
          >
            <ReportForm 
              onReport={() => setShowReport(false)} 
              onClose={() => setShowReport(false)}
            />
          </div>
        )}
        
        {/* Main Layout with Responsive Sidebar */}
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 998
              }}
              className="mobile-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          {/* Responsive Sidebar */}
          <div 
            style={{
              width: '250px',
              backgroundColor: '#f8f9fa',
              borderRight: '1px solid #e5e7eb',
              padding: '20px',
              height: 'calc(100vh - 80px)',
              position: 'fixed',
              top: '80px',
              overflowY: 'auto',
              transition: 'left 0.3s ease',
              zIndex: 999
            }}
            className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          >
            {/* User Profile Section */}
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
                color: 'white'
              }}>
                👤
              </div>
              <h3 style={{ 
                margin: '0 0 4px 0', 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Welcome Back!
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: '#6b7280'
              }}>
                Ready to report road issues
              </p>
            </div>

            {/* Navigation Menu */}
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
                onMouseOver={(e) => {
                  if (currentView !== 'home') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== 'home') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                🏠 News Feed
              </button>

              <button
                onClick={() => setShowReport(true)}
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
                onMouseOver={(e) => {
                  if (!showReport) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (!showReport) {
                    e.target.style.backgroundColor = 'transparent';
                  }
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
                onMouseOver={(e) => {
                  if (currentView !== 'myreports') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== 'myreports') {
                    e.target.style.backgroundColor = 'transparent';
                  }
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
                onMouseOver={(e) => {
                  if (currentView !== 'notifications') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== 'notifications') {
                    e.target.style.backgroundColor = 'transparent';
                  }
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
                onMouseOver={(e) => {
                  if (currentView !== 'profile') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== 'profile') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                👤 Profile
              </button>

            </nav>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
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
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ef4444';
              }}
            >
              🚪 Logout
            </button>
          </div>

          {/* Main Content Area */}
          <div 
            className="main-content"
            style={{ 
              marginLeft: '250px', 
              flex: 1, 
              padding: '20px',
              width: 'calc(100% - 250px)',
              transition: 'margin-left 0.3s ease'
            }}
          >

            {currentView === 'home' && (
              <>
                <NewsFeed />
              </>
            )}

            {currentView === 'myreports' && (
              <MyReports token={token} />
            )}

            {currentView === 'profile' && (
              <ProfilePage 
                token={token} 
                onLogout={handleLogout}
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
    </div>
  );
}

export default App;
