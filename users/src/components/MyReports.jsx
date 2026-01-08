import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import { useConnectivity } from '../context/ConnectivityContext.jsx';
import { getPendingReports, SYNC_STATUS } from '../services/offlineStorage.js';

const MyReports = ({ token }) => {
  const [reports, setReports] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get connectivity context
  const connectivity = useConnectivity();
  const { isOnline, pendingCount, triggerSync, isSyncing } = connectivity || {};

  console.log('MyReports component rendered with token:', token ? 'present' : 'missing');

  useEffect(() => {
    console.log('MyReports useEffect - token:', token ? 'present' : 'missing');
    if (token) {
      fetchMyReports();
      fetchPendingReports();
    } else {
      console.error('No authentication token provided to MyReports');
      setError('Authentication token is missing');
      setLoading(false);
    }
  }, [token]);
  
  // Refresh pending reports when pendingCount changes
  useEffect(() => {
    fetchPendingReports();
  }, [pendingCount]);

  const fetchPendingReports = async () => {
    try {
      const pending = await getPendingReports();
      setPendingReports(pending);
    } catch (err) {
      console.error('Error fetching pending reports:', err);
    }
  };

  const fetchMyReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // If offline, show message but don't error
      if (!navigator.onLine) {
        console.log('📴 Offline - showing cached reports');
        setLoading(false);
        return;
      }
      
      console.log('Fetching reports with token:', token ? 'Token present' : 'No token');
      console.log('Making request to:', `${config.API_BASE_URL}/reports/my-reports`);
      
      const res = await axios.get(`${config.API_BASE_URL}/reports/my-reports`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Reports response status:', res.status);
      console.log('Reports response data:', res.data);
      
      if (res.data && res.data.success && res.data.reports) {
        console.log('Setting reports:', res.data.reports);
        const validReports = Array.isArray(res.data.reports) ? res.data.reports : [];
        setReports(validReports);
      } else {
        console.log('Response not successful or no reports field, setting empty reports');
        setReports([]);
      }
      
    } catch (err) {
      console.error('Error fetching my reports:');
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      console.error('Error message:', err.message);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (!navigator.onLine) {
        // Don't show error when offline
        setError(null);
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load your reports');
      }
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#fbbf24'; // Yellow - Under Review
      case 'verified': return '#16a34a'; // Green - Approved/Published
      case 'rejected': return '#dc2626'; // Red - Rejected
      case 'resolved': return '#2563eb'; // Blue - Resolved
      default: return '#6b7280'; // Gray - Unknown
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'UNDER REVIEW';
      case 'verified': return 'APPROVED';
      case 'rejected': return 'REJECTED';
      case 'resolved': return 'RESOLVED';
      default: return status.toUpperCase();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'verified': return '✅';
      case 'rejected': return '❌';
      case 'resolved': return '🛠️';
      default: return '📋';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    console.log('MyReports: Rendering loading state');
    return (
      <div className="my-reports">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading your reports...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    console.log('MyReports: Rendering error state:', error);
    return (
      <div className="my-reports">
        <div className="error">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchMyReports} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('MyReports: Rendering reports list, count:', Array.isArray(reports) ? reports.length : 'Not an array');

  // Ensure reports is always an array
  const validReports = Array.isArray(reports) ? reports : [];
  
  // Get pending offline reports status info
  const getSyncStatusLabel = (status) => {
    switch (status) {
      case SYNC_STATUS.PENDING: return 'Waiting to sync';
      case SYNC_STATUS.SYNCING: return 'Syncing...';
      case SYNC_STATUS.FAILED: return 'Sync failed';
      default: return status;
    }
  };

  return (
    <div className="my-reports">
      <div className="my-reports-header">
        <h2>My Reports</h2>
        <p>Total Reports: {validReports.length + pendingReports.length}</p>
        {!isOnline && (
          <span className="offline-badge" style={{ background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginLeft: '8px' }}>
            📴 Offline
          </span>
        )}
      </div>
      
      {/* Pending Offline Reports Section */}
      {pendingReports.length > 0 && (
        <div className="pending-reports-section" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, color: '#856404' }}>
              📤 Pending Upload ({pendingReports.length})
            </h3>
            {isOnline && !isSyncing && (
              <button 
                onClick={triggerSync}
                style={{ 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sync Now
              </button>
            )}
            {isSyncing && (
              <span style={{ color: '#007bff' }}>🔄 Syncing...</span>
            )}
          </div>
          
          {pendingReports.map((report) => (
            <div 
              key={report.localId} 
              className="report-card my-report-card pending-offline"
              style={{ 
                border: '2px dashed #ffc107', 
                background: '#fffbeb',
                opacity: report.syncStatus === SYNC_STATUS.SYNCING ? 0.7 : 1
              }}
            >
              <div className="report-header">
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: report.syncStatus === SYNC_STATUS.FAILED ? '#dc3545' : '#ffc107',
                    color: report.syncStatus === SYNC_STATUS.FAILED ? 'white' : '#000'
                  }}
                >
                  {report.syncStatus === SYNC_STATUS.FAILED ? '⚠️' : '📤'} {getSyncStatusLabel(report.syncStatus)}
                </span>
                <span className="report-date">{formatDate(report.createdAt)}</span>
              </div>
              
              <div className="report-content">
                <h3>{report.type || 'Unknown Type'}</h3>
                <p className="description">{report.description || 'No description'}</p>
                <p className="location">📍 {report.location?.address || `${report.province}, ${report.city}, ${report.barangay}`}</p>
                
                {report.syncError && (
                  <p style={{ color: '#dc3545', fontSize: '12px', marginTop: '8px' }}>
                    ⚠️ Error: {report.syncError}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {validReports.length === 0 && pendingReports.length === 0 ? (
        <div className="no-reports">
          <p>You haven't submitted any reports yet.</p>
          <p>Start reporting road issues to help keep our roads safe!</p>
        </div>
      ) : validReports.length > 0 ? (
        <div className="reports-list">
          {validReports.map((report, index) => {
            if (!report || !report._id) {
              console.warn('Invalid report at index:', index, report);
              return null;
            }
            
            return (
              <div key={report._id} className="report-card my-report-card">
                <div className="report-header">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(report.status || 'pending') }}
                  >
                    {getStatusIcon(report.status || 'pending')} {getStatusLabel(report.status || 'pending')}
                  </span>
                  <span className="report-date">{formatDate(report.createdAt || new Date())}</span>
                </div>
                
                <div className="report-content">
                  <h3>{report.type || 'Unknown Type'}</h3>
                  <p className="description">{report.description || 'No description available'}</p>
                  <p className="location">📍 {typeof report.location === 'object' ? (report.location?.address || 'Location not available') : (report.location || 'Location not available')}</p>
                  
                  {/* Status-specific information */}
                  {report.status === 'pending' && (
                    <div className="status-info">
                      <p style={{ color: '#f59e0b', fontSize: '14px', fontStyle: 'italic' }}>
                        ⏳ Your report is currently being reviewed by our admin team.
                      </p>
                    </div>
                  )}
                  
                  {report.status === 'verified' && (
                    <div className="status-info">
                      <p style={{ color: '#10b981', fontSize: '14px', fontStyle: 'italic' }}>
                        ✅ Your report has been approved and is now visible to the community.
                      </p>
                    </div>
                  )}
                  
                  {report.status === 'rejected' && (
                    <div className="status-info">
                      <p style={{ color: '#ef4444', fontSize: '14px', fontStyle: 'italic' }}>
                        ❌ Your report was rejected. {report.adminNotes ? `Reason: ${report.adminNotes}` : ''}
                      </p>
                    </div>
                  )}
                  
                  {report.images && Array.isArray(report.images) && report.images.length > 0 && (
                    <img 
                      className="report-image"
                      src={(() => {
                        const imageData = report.images[0];
                        // If it's a Base64 data URL, use it directly
                        if (imageData?.data) {
                          return `data:${imageData.mimetype};base64,${imageData.data}`;
                        }
                        // Legacy: If filename is a full URL (Cloudinary), use it directly
                        const filename = imageData?.filename || imageData;
                        // Make sure filename is a string before calling startsWith
                        if (typeof filename === 'string') {
                          if (filename.startsWith('http://') || filename.startsWith('https://')) {
                            return filename;
                          }
                          if (filename.startsWith('data:')) {
                            return filename;
                          }
                          // Otherwise, construct local path
                          return `${config.BACKEND_URL}/uploads/${filename}`;
                        }
                        // Fallback for non-string values
                        return '';
                      })()}
                      alt="Report"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default MyReports;