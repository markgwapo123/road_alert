import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileVerification from './pages/ProfileVerification';
import ReportForm from './components/ReportForm';
import NewsFeed from './components/NewsFeed';
import UserProfile from './components/UserProfile';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [isVerified, setIsVerified] = useState(false); 
  const [showReport, setShowReport] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // Check verification status when token changes
  useEffect(() => {
    if (token) {
      checkVerificationStatus();
    }
  }, [token]);

  const checkVerificationStatus = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/users/profile', {
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
    <div>
      <nav className="navbar">
        <span className="logo">🚧</span>
        <span className="location">[Location]</span>
        <span className="app-name">ROAD ALERT</span>
        <span className="profile">
          <button onClick={() => setShowProfile(v => !v)}>
            Profile {!isVerified && '⚠️'}
          </button>
          {showProfile && <UserProfile 
            onLogout={handleLogout} 
            isVerified={isVerified}
            onVerify={() => setShowVerification(true)}
          />}
        </span>
        {isVerified ? (
          <button className="report-btn" onClick={() => setShowReport(v => !v)}>Report</button>
        ) : (
          <button className="verify-btn" onClick={() => setShowVerification(true)}>Verify Account</button>
        )}
        <button onClick={handleLogout}>Logout</button>
      </nav>
      <main>
        {showReport && isVerified && <ReportForm onReport={() => setShowReport(false)} />}
        
        <NewsFeed />
        {!isVerified && (
          <div className="info" style={{textAlign: 'center', margin: '20px 0'}}>
            <p>📋 Welcome to RoadAlert! You can view reports below.</p>
            <p>💡 <button onClick={() => setShowVerification(true)} style={{background: 'none', border: 'none', color: '#3498db', textDecoration: 'underline', cursor: 'pointer'}}>Verify your account</button> to start submitting your own reports.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
