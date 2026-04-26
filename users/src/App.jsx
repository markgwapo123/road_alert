import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import config from './config/index.js';
import { SettingsProvider, useSettings } from './context/SettingsContext.jsx';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfilePage from './pages/ProfilePage';
import ReportFormMVP from './components/ReportFormMVP';
import NewsFeed from './components/NewsFeed';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import MyReports from './components/MyReports';
import NotificationPage from './pages/NotificationPage';
import ConfirmationModal from './components/ConfirmationModal';
import LogoutConfirmModal from './components/LogoutConfirmModal';
import MaintenancePage from './pages/MaintenancePage';
import { LocalNotifications } from '@capacitor/local-notifications';
import EmergencySOS from './components/EmergencySOS';
import './App.css';

// Main App component wrapped with settings
function AppContent() {
  const { 
    settings, 
    loading: settingsLoading, 
    getSetting, 
    isMaintenanceMode, 
    getMaintenanceInfo,
    getAuthConfig 
  } = useSettings();
  
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [myReports, setMyReports] = useState([]);
  const [myReportsCount, setMyReportsCount] = useState(0);
  const [currentView, setCurrentView] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadNewsCount, setUnreadNewsCount] = useState(0);
  const [lastNewsId, setLastNewsId] = useState(localStorage.getItem('lastSeenNewsId'));
  const lastNewsIdRef = useRef(localStorage.getItem('lastSeenNewsId'));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationType, setConfirmationType] = useState('success');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [lastReportId, setLastReportId] = useState(localStorage.getItem('lastSeenReportId'));
  const lastReportIdRef = useRef(localStorage.getItem('lastSeenReportId'));
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [unreadWarnings, setUnreadWarnings] = useState([]);

  // Session timeout handling
  useEffect(() => {
    if (!token) return;
    
    const sessionTimeout = getSetting('session_timeout_minutes', 1440);
    if (sessionTimeout <= 0) return; // 0 = never timeout
    
    const timeoutMs = sessionTimeout * 60 * 1000;
    
    // Activity tracker
    const updateActivity = () => setLastActivity(Date.now());
    
    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    
    // Check for timeout every minute
    const checkTimeout = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      if (inactiveTime > timeoutMs) {
        console.log('⏰ Session timeout - logging out');
        handleSessionTimeout();
      }
    }, 60000);
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(checkTimeout);
    };
  }, [token, lastActivity, getSetting]);

  const handleSessionTimeout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setConfirmationMessage('Your session has expired. Please log in again.');
    setConfirmationType('warning');
    setShowConfirmation(true);
  };
  useEffect(() => {
    if (token) {
      // ⚡ Fetch EVERYTHING in PARALLEL so tabs are instant
      Promise.all([
        fetchNotifications(), 
        fetchUser(), 
        fetchMyReports(), 
        fetchNewsUpdate(),
        fetchNewReportsUpdate()
      ]);
      
      const updateInterval = setInterval(() => {
        fetchNotifications();
        fetchNewsUpdate();
        fetchNewReportsUpdate();
      }, 10000); // ⚡ Updated to 10 seconds for faster notifications
      
      return () => clearInterval(updateInterval);
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
      
      // Check for unread warnings
      const warnings = res.data.data.warnings || [];
      const unread = warnings.filter(w => !w.isRead);
      if (unread.length > 0) {
        setUnreadWarnings(unread);
        setShowWarningModal(true);
      }
    } catch (err) {
      console.log('User data unavailable:', err.response?.status || err.message);
      // If token is invalid or expired, clear it to force re-login
      if (err.response?.status === 401) {
        console.log('🚫 Token expired or invalid - clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } else {
        setUser(null);
      }
    }
  };

  const fetchNewsUpdate = async () => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/news/public/posts?limit=1`);
      const latestPost = res.data.posts?.[0];
      
      if (latestPost) {
        const storedLastId = localStorage.getItem('lastSeenNewsId');
        
        // Use Ref to check what we've already alerted for in this session
        if (storedLastId && latestPost._id !== storedLastId && latestPost._id !== lastNewsIdRef.current) {
          console.log('🔔 New news post detected:', latestPost.title);
          setUnreadNewsCount(prev => prev + 1);
          lastNewsIdRef.current = latestPost._id;
          setLastNewsId(latestPost._id);
          
          // 📢 Trigger system pop-up for news
          triggerNewsNotification(latestPost);
        } else if (!storedLastId) {
          // Initialize if empty
          localStorage.setItem('lastSeenNewsId', latestPost._id);
          lastNewsIdRef.current = latestPost._id;
          setLastNewsId(latestPost._id);
        }
      }
    } catch (err) {
      console.log('News update check failed:', err.message);
    }
  };

  const fetchNewReportsUpdate = async () => {
    try {
      // Fetch latest verified reports
      const res = await axios.get(`${config.API_BASE_URL}/reports?limit=1&status=verified`);
      const latestReport = res.data.data?.[0];
      
      if (latestReport) {
        const storedLastId = localStorage.getItem('lastSeenReportId');
        
        // If we haven't seen this report before, and it's not by us
        if (storedLastId && latestReport._id !== storedLastId && latestReport._id !== lastReportIdRef.current) {
          if (latestReport.reportedBy?.id !== user?._id) {
            console.log('🚨 New hazard detected:', latestReport.type);
            triggerLocalNotification(latestReport);
            lastReportIdRef.current = latestReport._id;
            setLastReportId(latestReport._id);
          }
        } else if (!storedLastId) {
          // Initialize if empty
          localStorage.setItem('lastSeenReportId', latestReport._id);
          lastReportIdRef.current = latestReport._id;
          setLastReportId(latestReport._id);
        }
      }
    } catch (err) {
      console.log('Report update check failed:', err.message);
    }
  };

  const triggerLocalNotification = async (report) => {
    try {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              title: `🚨 NEW HAZARD: ${report.type.toUpperCase()}`,
              body: `Reported at ${report.barangay}, ${report.city}. Be careful!`,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'siren.wav', // Fallback to default if not found
              attachments: [],
              actionTypeId: "",
              extra: { reportId: report._id }
            }
          ]
        });
      } else {
        // Web notification fallback
        if (Notification.permission === "granted") {
          new Notification(`🚨 NEW HAZARD: ${report.type.toUpperCase()}`, {
            body: `Reported at ${report.barangay}, ${report.city}.`,
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
      
      // Also play the ding sound for consistent UI
      playNotificationSound();
    } catch (e) {
      console.log('Error triggering notification:', e);
    }
  };

  const triggerNewsNotification = async (newsPost) => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const title = newsPost.priority === 'urgent' ? `🚨 URGENT NEWS` : `📰 NEW UPDATE`;
      
      if (isNative) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: `${title}: ${newsPost.title}`,
              body: newsPost.content.substring(0, 100) + (newsPost.content.length > 100 ? '...' : ''),
              id: Math.floor(Math.random() * 100000) + 200000,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'news.wav',
              extra: { newsId: newsPost._id }
            }
          ]
        });
      } else {
        if (Notification.permission === "granted") {
          new Notification(`${title}: ${newsPost.title}`, {
            body: newsPost.content.substring(0, 100),
          });
        }
      }
      playNotificationSound();
    } catch (e) {
      console.log('Error triggering news notification:', e);
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play blocked by browser:', e));
    } catch (e) {
      console.log('Error playing sound:', e);
    }
  };

  const handleNewsViewed = (latestId) => {
    setUnreadNewsCount(0);
    if (latestId) {
      setLastNewsId(latestId);
      lastNewsIdRef.current = latestId;
      localStorage.setItem('lastSeenNewsId', latestId);
    }
  };

  const fetchMyReports = async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${config.API_BASE_URL}/reports/my-reports?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setMyReports(res.data.reports || []);
        setMyReportsCount(res.data.pagination?.totalReports || 0);
      }
    } catch (err) {
      console.log('My Reports unavailable:', err.message);
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
    fetchMyReports(); // Fetch the newly submitted report immediately
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

  const handleMarkWarningsRead = async () => {
    try {
      await axios.post(`${config.API_BASE_URL}/users/me/warnings/read`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setShowWarningModal(false);
      setUnreadWarnings([]);
      // Update user data to reflect warnings are read
      fetchUser();
    } catch (err) {
      console.error('Error marking warnings as read:', err);
      setShowWarningModal(false);
    }
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

  // Get site name from settings
  const siteName = getSetting('site_name', 'BANTAY DALAN');

  // ⚡ Don't block the entire app waiting for settings - render immediately with defaults
  // Settings will update silently in the background

  // Show maintenance page if maintenance mode is enabled
  if (isMaintenanceMode()) {
    const maintenanceInfo = getMaintenanceInfo();
    return (
      <MaintenancePage 
        message={maintenanceInfo.message} 
        scheduledEnd={maintenanceInfo.scheduledEnd} 
      />
    );
  }

  // Check if registration is allowed
  const authConfig = getAuthConfig();

  if (!token) {
    if (showRegister) {
      // Check if registration is allowed
      if (!authConfig.allowRegistration) {
        return (
          <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
          }}>
            <div style={{ 
              textAlign: 'center', 
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              padding: '40px',
              borderRadius: '16px',
              maxWidth: '400px'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚫</div>
              <h2 style={{ marginBottom: '16px' }}>Registration Disabled</h2>
              <p style={{ marginBottom: '24px', opacity: 0.9 }}>
                New user registration is currently disabled. Please contact the administrator.
              </p>
              <button
                onClick={() => setShowRegister(false)}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        );
      }
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
          <span className="app-name">{siteName.toUpperCase()}</span>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigation('home')}
        >
          <span className="nav-icon" style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {unreadNewsCount > 0 && (
              <span className="notification-badge" style={{ backgroundColor: '#ef4444' }}>
                {unreadNewsCount}
              </span>
            )}
          </span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'myreports' ? 'active' : ''}`}
          onClick={() => handleNavigation('myreports')}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </span>
        </button>
        
        <button 
          className="nav-btn add-btn"
          onClick={handleNewReportClick}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'notifications' ? 'active' : ''}`}
          onClick={() => handleNavigation('notifications')}
        >
          <span className="nav-icon" style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </button>
        
        <button 
          className={`nav-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </span>
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
            <ReportFormMVP 
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
                    src={user.profileImage.startsWith('data:') ? user.profileImage : `${config.BACKEND_URL}${user.profileImage}`}
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
            {currentView === 'home' && (
              <NewsFeed 
                user={user} 
                unreadNewsCount={unreadNewsCount} 
                onNewsViewed={handleNewsViewed} 
              />
            )}
            {currentView === 'myreports' && (
              <MyReports 
                token={token} 
                prefetchedReports={myReports} 
                prefetchedCount={myReportsCount}
                onRefresh={fetchMyReports} 
              />
            )}
            {currentView === 'profile' && (
              <ProfilePage 
                token={token} 
                prefetchedUser={user}
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

      {/* User Warning Modal */}
      {showWarningModal && unreadWarnings.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 10000, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="confirmation-modal" style={{ maxWidth: '400px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div className="confirmation-icon" style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ margin: '10px 0', color: '#f59e0b', fontSize: '20px' }}>Account Warning</h3>
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                You have received the following warnings from the system:
              </p>
              <div style={{ maxHeight: '200px', overflowY: 'auto', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                {unreadWarnings.map((warning, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#fffbeb', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{warning.reason || 'General Warning'}</div>
                    <div style={{ fontSize: '13px', color: '#444' }}>{warning.message}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{new Date(warning.date).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="mvp-btn mvp-btn-block" 
              onClick={handleMarkWarningsRead}
              style={{ width: '100%', backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

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
      {/* Floating Emergency SOS Button */}
      {token && <EmergencySOS />}
    </div>
  );
}

// Wrap App with SettingsProvider
function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;