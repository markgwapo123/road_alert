import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Color configurations based on professional road & safety alert standards
const ALERT_COLORS = {
  emergency: {
    background: '#dc2626', // Professional Red
    text: '#ffffff',       // White for maximum contrast
    icon: '🚨'
  },
  caution: {
    background: '#fbbf24', // Professional Yellow
    text: '#000000',       // Black for high visibility
    icon: '⚠️'
  },
  info: {
    background: '#2563eb', // Professional Blue
    text: '#ffffff',       // White for clarity
    icon: 'ℹ️'
  },
  safe: {
    background: '#16a34a', // Professional Green
    text: '#ffffff',       // White for clean look
    icon: '✅'
  },
  construction: {
    background: '#ea580c', // Professional Orange
    text: '#ffffff',       // White for high contrast
    icon: '🚧'
  }
};

const NewsFeed = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Only fetch verified reports for the public home feed
        const response = await axios.get('http://192.168.1.150:3001/api/reports', {
          params: {
            status: 'verified',
            limit: 20,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          }
        });
        setReports(response.data.data || []);
      } catch (err) {
        setError('Failed to load reports');
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className="news-feed">
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>
        Recent Road Alerts
      </h2>
      
      {reports.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#f8f9fa',
          borderRadius: '12px',
          color: '#6c757d'
        }}>
          No reports available yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((report) => {
            const alertStyle = ALERT_COLORS[report.type] || ALERT_COLORS.info;
            
            return (
              <div
                key={report._id}
                style={{
                  background: alertStyle.background,
                  color: alertStyle.text,
                  padding: '16px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '24px', marginTop: '2px' }}>
                  {alertStyle.icon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '18px', 
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {report.type.replace('_', ' ')} Alert
                    </h3>
                    <span style={{ 
                      fontSize: '12px', 
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                      marginLeft: '12px'
                    }}>
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  
                  <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    lineHeight: '1.4',
                    marginBottom: '8px'
                  }}>
                    {report.description}
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '12px',
                    opacity: 0.9
                  }}>
                    <span>📍 Location: {report.location?.lat?.toFixed(4)}, {report.location?.lng?.toFixed(4)}</span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {report.severity}
                    </span>
                  </div>
                  
                  {report.images && report.images.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <img 
                        src={`http://192.168.1.150:3001/uploads/${report.images[0].filename}`}
                        alt="Report"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          border: '2px solid rgba(255, 255, 255, 0.3)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
