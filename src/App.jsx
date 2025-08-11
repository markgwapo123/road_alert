import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from './config/index.js';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileVerification from './pages/ProfileVerification';
import VerificationPage from './pages/VerificationPage';
import ProfilePage from './pages/ProfilePage';
import ReportForm from './components/ReportForm';
import NewsFeed from './components/NewsFeed';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import MyReports from './components/MyReports';
import NotificationPage from './pages/NotificationPage';
import './App.css';
import './sidebar.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [isVerified, setIsVerified] = useState(false); 
  const [showReport, setShowReport] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'home', 'myreports', 'verification', 'profile', 'notifications'

  // Check verification status when token changes
  useEffect(() => {
    if (token) {
      checkVerificationStatus();
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
      const res = await axios.get(`${config.API_BASE_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`${config.API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh notifications
      fetchNotifications();
      
      // Check if this was a verification notification and refresh verification status
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && notification.type === 'verification_status') {
        checkVerificationStatus();
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
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

  const checkVerificationStatus = async () => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIsVerified(res.data.isVerified || false);
    } catch (err) {
      console.error('Error checking verification status:', err);
      // If error, assume not verified
      setIsVerified(false);
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

  // Show verification page only when explicitly requested
  if (showVerification) {
    return <ProfileVerification onVerified={() => {
      setIsVerified(true);
      setShowVerification(false);
    }} />;
  }

  return (
    <div className={currentView === 'verification' || currentView === 'profile' || currentView === 'notifications' ? 'verification-active' : ''}>
      <nav className="navbar">
        <div className="navbar-left">
          <span className="logo">🚧</span>
          <span className="app-name">ROAD ALERT</span>
        </div>
        <div className="navbar-right">
          <button className="home-btn" onClick={() => setCurrentView('home')}>
            Home
          </button>
          <button className="notification-btn" onClick={() => setCurrentView('notifications')}>
            Notification
          </button>
          <span className="profile">
            <button onClick={() => setCurrentView('profile')}>
              Profile
            </button>
          </span>
          {isVerified && (
            <button 
              className={`report-btn ${showReport ? 'active' : ''}`} 
              onClick={() => setShowReport(v => !v)}
            >
              {showReport ? 'Close Form' : 'Submit Report'}
            </button>
          )}
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main>
        {showReport && isVerified && (
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
        
        {/* Main Layout with Persistent Sidebar */}
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Persistent Sidebar */}
          <div style={{
            width: '250px',
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #e5e7eb',
            padding: '20px',
            height: 'calc(100vh - 80px)',
            position: 'fixed',
            left: 0,
            top: '80px',
            overflowY: 'auto'
          }}>
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
                {isVerified ? 'Verified User' : 'Unverified User'}
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
                onClick={() => setCurrentView('dashboard')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: currentView === 'dashboard' ? '#3b82f6' : 'transparent',
                  color: currentView === 'dashboard' ? 'white' : '#374151',
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
                  if (currentView !== 'dashboard') {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentView !== 'dashboard') {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                📊 Dashboard
              </button>

              <button
                onClick={() => setCurrentView('home')}
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

              {isVerified && (
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
              )}

              {isVerified && (
                <button
                  onClick={() => setCurrentView('myreports')}
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
              )}

              <button
                onClick={() => setCurrentView('notifications')}
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
                onClick={() => setCurrentView('profile')}
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

              {!isVerified && (
                <button
                  onClick={() => setCurrentView('verification')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: currentView === 'verification' ? '#3b82f6' : 'transparent',
                    color: currentView === 'verification' ? 'white' : '#374151',
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
                    if (currentView !== 'verification') {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentView !== 'verification') {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  🔐 Verify Account
                </button>
              )}
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
          <div style={{ 
            marginLeft: '250px', 
            flex: 1, 
            padding: '20px',
            width: 'calc(100% - 250px)'
          }}>
            {currentView === 'dashboard' && (
              <Dashboard token={token} isVerified={isVerified} />
            )}

            {currentView === 'home' && (
              <>
                <NewsFeed />
                {!isVerified && (
                  <div className="info" style={{textAlign: 'center', margin: '20px 0'}}>
                    <p>📋 Welcome to RoadAlert! You can view reports above.</p>
                    <p>💡 <button onClick={() => setCurrentView('verification')} style={{background: 'none', border: 'none', color: '#3498db', textDecoration: 'underline', cursor: 'pointer'}}>Verify your account</button> to start submitting your own reports.</p>
                  </div>
                )}
              </>
            )}

            {currentView === 'myreports' && isVerified && (
              <MyReports token={token} />
            )}

            {currentView === 'verification' && (
              <VerificationPage 
                token={token} 
                onVerificationSubmitted={() => setCurrentView('home')}
              />
            )}

            {currentView === 'profile' && (
              <ProfilePage 
                token={token} 
                onLogout={handleLogout}
                isVerified={isVerified}
                onVerify={() => setCurrentView('verification')}
              />
            )}

            {currentView === 'notifications' && (
              <NotificationPage 
                token={token}
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
