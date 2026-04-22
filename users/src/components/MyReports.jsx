import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const MyReports = ({ token, prefetchedReports, onRefresh }) => {
  const [reports, setReports] = useState(prefetchedReports || []);
  const [loading, setLoading] = useState(!prefetchedReports || prefetchedReports.length === 0);
  const [error, setError] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  console.log('MyReports component rendered with token:', token ? 'present' : 'missing');

  useEffect(() => {
    console.log('MyReports useEffect - prefetched:', prefetchedReports?.length);
    if (prefetchedReports && prefetchedReports.length > 0) {
      setReports(prefetchedReports);
      setLoading(false);
    } else if (token && (!prefetchedReports || prefetchedReports.length === 0)) {
      fetchMyReports(1);
    } else if (!token) {
      console.error('No authentication token provided to MyReports');
      setError('Authentication token is missing');
      setLoading(false);
    }
  }, [token, prefetchedReports]);

  const fetchMyReports = async (pageNum) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      console.log(`Fetching reports page ${pageNum} with token:`, token ? 'Token present' : 'No token');
      console.log('Making request to:', `${config.API_BASE_URL}/reports/my-reports?page=${pageNum}&limit=10`);
      
      const res = await axios.get(`${config.API_BASE_URL}/reports/my-reports?page=${pageNum}&limit=10`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Reports response status:', res.status);
      console.log('Reports response data:', res.data);
      
      if (res.data && res.data.success) {
        const newReports = res.data.reports || [];
        const pagination = res.data.pagination || {};
        
        setReports(prev => pageNum === 1 ? newReports : [...prev, ...newReports]);
        setTotalReports(pagination.totalReports || 0);
        setHasMore(pagination.hasNextPage || false);
        setPage(pageNum);
      } else {
        console.log('Response not successful or no reports field, setting empty reports');
        setReports([]);
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('Error fetching my reports:');
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      console.error('Error message:', err.message);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load your reports');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchMyReports(page + 1);
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
          <button onClick={() => fetchMyReports(1)} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('MyReports: Rendering reports list, count:', Array.isArray(reports) ? reports.length : 'Not an array');

  // Ensure reports is always an array
  const validReports = Array.isArray(reports) ? reports : [];

  return (
    <div className="my-reports">
      <div className="my-reports-header">
        <h2>My Reports</h2>
        <p>Total Reports: {totalReports}</p>
      </div>
      
      {validReports.length === 0 && !loading ? (
        <div className="no-reports">
          <p>You haven't submitted any reports yet.</p>
          <p>Start reporting road issues to help keep our roads safe!</p>
        </div>
      ) : (
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
                  <p className="location" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#dc2626">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg> 
                    {typeof report.location === 'object' ? (report.location?.address || 'Location not available') : (report.location || 'Location not available')}
                  </p>
                  
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
                      style={{ cursor: 'pointer' }}
                      loading="lazy"
                      fetchpriority="low"
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
                        }
                        // Use image API endpoint
                        return `${config.BACKEND_URL}/api/reports/${report._id}/image/0`;
                      })()}
                      alt="Report"
                      onClick={(e) => setEnlargedImage(e.target.src)}
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
      )}

      {loadingMore && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <p>Loading more reports...</p>
        </div>
      )}

      {!loadingMore && hasMore && validReports.length > 0 && (
        <div className="load-more-container">
          <button onClick={handleLoadMore} className="load-more-btn">
            Load More
          </button>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {enlargedImage && (
        <div 
          className="image-lightbox-overlay"
          onClick={() => setEnlargedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: 'white',
              fontSize: '32px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ×
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged report"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              cursor: 'default'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MyReports;
