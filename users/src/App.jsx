import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileVerification from './pages/ProfileVerification';
import Dashboard from './pages/Dashboard';
import UserProfile from './components/UserProfile';
import { useUserProfile } from './hooks/useUserProfile';
import useServerConnection from './hooks/useServerConnection';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showRegister, setShowRegister] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [serverDownMessage, setServerDownMessage] = useState('');
  const { user, loading: userLoading, setUser } = useUserProfile();

  const handleServerDown = () => {
    setServerDownMessage('Server connection lost. You have been logged out for security.');
    handleLogout();
  };

  const { isServerOnline, lastCheck } = useServerConnection(handleServerDown);

  const handleLogin = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setShowProfile(false);
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
      return (
        <div>
          {serverDownMessage && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              margin: '20px',
              borderRadius: '6px',
              border: '1px solid #f5c6cb',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ⚠️ {serverDownMessage}
            </div>
          )}
          <Register onRegister={handleRegister} switchToLogin={() => setShowRegister(false)} />
        </div>
      );
    }
    return (
      <div>
        {serverDownMessage && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '15px',
            margin: '20px',
            borderRadius: '6px',
            border: '1px solid #f5c6cb',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            ⚠️ {serverDownMessage}
          </div>
        )}
        <Login onLogin={handleLogin} switchToRegister={() => setShowRegister(true)} />
      </div>
    );
  }

  // Show profile page when requested
  if (showProfile) {
    return (
      <div>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: '60px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#dc3545',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px'
            }}>
              🚧
            </div>
            <span style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              <span style={{ color: '#dc3545' }}>Road</span>
              <span style={{ color: '#6c757d' }}>Alert</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => setShowProfile(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Logout
            </button>
          </div>
        </nav>
        <main style={{ padding: '20px' }}>
          <UserProfile onLogout={handleLogout} />
        </main>
      </div>
    );
  }

  return (
    <div>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '60px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Left side - Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#dc3545',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px'
          }}>
            🚧
          </div>
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            <span style={{ color: '#dc3545' }}>Road</span>
            <span style={{ color: '#6c757d' }}>Alert</span>
          </span>
        </div>

        {/* Right side - User info and actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user && !userLoading && (
            <>
              <span style={{ fontSize: '14px', color: '#6c757d' }}>
                {user.profile?.phone || 'Phone not set'}
              </span>
              
              {/* User Avatar */}
              <div 
                onClick={() => setShowProfile(true)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
              </div>
              
              <span style={{ fontSize: '14px', color: '#333' }}>
                {user.name || user.username}
              </span>
            </>
          )}
          
          {userLoading && (
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Loading user...
            </div>
          )}
          
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      
      {/* Main content area */}
      <main style={{ padding: '20px' }}>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
