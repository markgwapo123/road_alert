import React, { useEffect, useState } from 'react';
import axios from 'axios';

const NewsFeed = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      await axios.get('http://localhost:3001/api/health', { timeout: 3000 });
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError('');
      
      // First test if backend is reachable
      const isBackendUp = await testBackendConnection();
      if (!isBackendUp) {
        setError('🔌 Backend server is not running. Please start your Express.js server on port 3001.');
        setLoading(false);
        return;
      }
      
      try {
        // Check if we have a token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found. Please login again.');
          setLoading(false);
          return;
        }

        const res = await axios.get('http://localhost:3001/api/reports/verified', {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000 // Increased timeout to 10 seconds
        });
        
        // Check if response has data
        if (res.data && Array.isArray(res.data)) {
          setReports(res.data);
        } else {
          setReports([]);
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        
        // More specific error handling
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error') || err.message.includes('connect ECONNREFUSED')) {
          setError('🔌 Cannot connect to server. Please ensure the backend is running on http://localhost:3001');
        } else if (err.response?.status === 401) {
          setError('🔐 Authentication failed. Please login again.');
          // Clear invalid token
          localStorage.removeItem('token');
          setTimeout(() => window.location.reload(), 2000);
        } else if (err.response?.status === 404) {
          setError('📭 Reports endpoint not found. Please check your backend configuration.');
        } else if (err.response?.status === 500) {
          setError('🛠️ Server error. Please try again later.');
        } else if (err.code === 'ENOTFOUND') {
          setError('🌐 Network error. Please check your internet connection.');
        } else {
          setError(`❌ ${err.response?.data?.message || err.message || 'Failed to load reports'}`);
        }
      }
      setLoading(false);
    };
    
    fetchReports();
    
    // Optional: Set up polling to retry every 30 seconds if there's an error
    const interval = setInterval(() => {
      if (error && !loading) {
        fetchReports();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [error, loading]);

  const retryFetch = () => {
    setError('');
    setLoading(true);
    // This will trigger the useEffect to run again
  };

  if (loading) return (
    <div className="loading" style={{
      textAlign: 'center', 
      padding: '40px', 
      color: '#6b7280',
      background: 'white',
      borderRadius: '12px',
      margin: '20px auto',
      maxWidth: '600px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{fontSize: '24px', marginBottom: '10px'}}>🔄</div>
      Loading reports...
    </div>
  );
  
  if (error) return (
    <div className="error" style={{
      maxWidth: '600px', 
      margin: '20px auto',
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      textAlign: 'center',
      border: '1px solid #fee2e2',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{fontSize: '24px', marginBottom: '15px'}}>⚠️</div>
      <div style={{color: '#dc2626', marginBottom: '20px', fontSize: '16px', lineHeight: '1.5'}}>
        {error}
      </div>
      <button 
        onClick={retryFetch}
        style={{
          background: '#3498db',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600'
        }}
      >
        🔄 Try Again
      </button>
    </div>
  );
  
  if (!reports.length) return (
    <div className="info" style={{
      maxWidth: '600px', 
      margin: '20px auto',
      background: 'white',
      borderRadius: '12px',
      padding: '40px',
      textAlign: 'center',
      border: '1px solid #fef3c7',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{fontSize: '48px', marginBottom: '20px'}}>📭</div>
      <h3 style={{margin: '0 0 10px 0', color: '#2c3e50'}}>No Reports Yet</h3>
      <p style={{color: '#6b7280', margin: '0'}}>
        Be the first to report a road hazard in your area!
      </p>
    </div>
  );

  return (
    <div className="news-feed">
      {reports.map(r => (
        <div key={r._id} className="report-card social-post">
          <div className="post-header">
            <div className="post-author">
              <div className="avatar">👤</div>
              <div className="author-info">
                <div className="author-name">RoadAlert User</div>
                <div className="post-time">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="post-badges">
              <span className={`severity-badge severity-${r.severity?.toLowerCase()}`}>
                {r.severity}
              </span>
              <span className={`status-badge status-${r.status?.toLowerCase()}`}>
                {r.status}
              </span>
            </div>
          </div>
          
          <div className="post-content">
            <h3 className="report-title">{r.type}</h3>
            <p className="report-description">{r.description}</p>
            <p className="report-location">📍 Location: {r.location?.lat?.toFixed(4)}, {r.location?.lng?.toFixed(4)}</p>
            
            {r.imageUrl && (
              <div className="post-image">
                <img src={r.imageUrl} alt="Report evidence" />
              </div>
            )}
          </div>
          
          <div className="post-actions">
            <button className="action-btn">👍 Like</button>
            <button className="action-btn">💬 Comment</button>
            <button className="action-btn">📤 Share</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NewsFeed;
