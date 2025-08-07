import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileVerification from './pages/ProfileVerification';
import VerificationPage from './pages/VerificationPage';
import ProfilePage from './pages/ProfilePage';
import ReportForm from './components/ReportForm';
import NewsFeed from './components/NewsFeed';
import UserProfile from './components/UserProfile';
import MyReports from './components/MyReports';
import NotificationPage from './pages/NotificationPage';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [isVerified, setIsVerified] = useState(false); 
  const [showReport, setShowReport] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentView, setCurrentView] = useState('home'); // 'home', 'myreports', 'verification', 'profile', 'notifications'

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
      const res = await axios.get('http://192.168.1.150:3001/api/notifications', {
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
      await axios.put(`http://192.168.1.150:3001/api/notifications/${notificationId}/read`, {}, {
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
      await axios.post('http://192.168.1.150:3001/api/notifications/mark-all-read', {}, {
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
      const res = await axios.get('http://192.168.1.150:3001/api/auth/me', {
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
            Notification {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
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
        
        {currentView === 'home' && (
          <>
            <NewsFeed />
            {!isVerified && (
              <div className="info" style={{textAlign: 'center', margin: '20px 0'}}>
                <p>📋 Welcome to RoadAlert! You can view reports below.</p>
                <p>💡 <button onClick={() => setCurrentView('verification')} style={{background: 'none', border: 'none', color: '#3498db', textDecoration: 'underline', cursor: 'pointer'}}>Verify your account</button> to start submitting your own reports.</p>
              </div>
            )}
          </>
        )}
        
        {currentView === 'myreports' && isVerified && (
          <MyReports token={token} />
        )}
        
        {currentView === 'myreports' && !isVerified && (
          <div className="verification-notice">
            <h2>Account Verification Required</h2>
            <p>You need to verify your account before you can view your reports.</p>
            <p>💡 <button onClick={() => setCurrentView('verification')} style={{background: 'none', border: 'none', color: '#3498db', textDecoration: 'underline', cursor: 'pointer'}}>Verify your account</button> to access My Reports.</p>
          </div>
        )}
        
        {currentView === 'verification' && (
          <VerificationPage 
            onVerificationComplete={() => {
              setCurrentView('home');
              checkVerificationStatus(); // Refresh verification status
            }}
            onBack={() => setCurrentView('home')}
          />
        )}
        
        {currentView === 'profile' && (
          <ProfilePage 
            onBack={() => setCurrentView('home')}
            onLogout={handleLogout}
            isVerified={isVerified}
            onVerify={() => setCurrentView('verification')}
          />
        )}
        
        {currentView === 'notifications' && (
          <NotificationPage 
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            onRefresh={fetchNotifications}
          />
        )}
      </main>
    </div>
  );
}

export default App;
