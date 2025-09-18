import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ReportDetailModal from './ReportDetailModal.jsx';

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
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Only fetch verified reports for the public home feed
        const response = await axios.get(`${config.API_BASE_URL}/reports`, {
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

  const fetchReportUser = async (userId) => {
    try {
      const response = await axios.get(`${config.API_BASE_URL}/users/profile/${userId}`);
      return response.data.data;
    } catch (err) {
      console.error('Error fetching user details:', err);
      return null;
    }
  };

  const handleReportClick = async (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
    
    // Use the populated user data directly from the report
    if (report.submittedBy) {
      setSelectedReportUser(report.submittedBy);
    } else {
      setSelectedReportUser(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
    setSelectedReportUser(null);
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
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '20px', 
        color: '#1f2937',
        fontSize: '24px',
        fontWeight: '600',
        letterSpacing: '0.5px'
      }}>
        Recent Road Alerts
      </h2>
      
      {reports.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#f8f9fa',
          borderRadius: '12px',
          color: '#6c757d',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          No reports available yet
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '16px',
          padding: '0 16px',
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%'
        }}>
          {reports.map((report) => {
            const alertStyle = ALERT_COLORS[report.type] || ALERT_COLORS.info;
            
            return (
              <div
                key={report._id}
                onClick={() => handleReportClick(report)}
                style={{
                  background: '#ffffff',
                  color: '#1f2937',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  border: '1px solid #e5e7eb'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Header with Alert Type and Date */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#1f2937',
                    textTransform: 'capitalize'
                  }}>
                    {report.type.replace('_', ' ')} alert
                  </h3>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {formatDate(report.createdAt)}
                  </div>
                </div>
                
                {/* Description */}
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  lineHeight: '1.4',
                  marginBottom: '12px',
                  color: '#4b5563',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {report.description}
                </p>
                  
                  {/* Image and Map Section */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '12px',
                    height: '120px'
                  }}>
                    {/* Report Image */}
                    {report.images && report.images.length > 0 ? (
                      <div style={{ flex: '1' }}>
                        <img 
                          src={`${config.BACKEND_URL}/uploads/${report.images[0].filename || report.images[0]}`}
                          alt="Report preview"
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'contain',
                            backgroundColor: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}
                          onError={(e) => {
                            console.error('Image failed to load:', e.target.src);
                            console.log('Report images data:', report.images);
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div style="
                                width: 100%; 
                                height: 120px; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                background-color: #f3f4f6; 
                                border-radius: 6px; 
                                color: #6b7280;
                                border: 1px solid #e5e7eb;
                              ">
                                <div style="text-align: center;">
                                  <div style="font-size: 24px; margin-bottom: 4px;">📷</div>
                                  <div style="font-size: 12px;">Image not available</div>
                                </div>
                              </div>
                            `;
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'scale(1.01)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'scale(1)';
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        flex: '1',
                        height: '120px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                        fontSize: '12px'
                      }}>
                        No Image
                      </div>
                    )}
                    
                    {/* Map Section */}
                    <div style={{ flex: '1' }}>
                      {report.location && report.location.coordinates ? (
                        <div style={{
                          width: '100%',
                          height: '120px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          overflow: 'hidden',
                          position: 'relative',
                          backgroundColor: '#f9fafb'
                        }}>
                          <iframe
                            src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3921.4!2d${report.location.coordinates[0]}!3d${report.location.coordinates[1]}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1635820000000!5m2!1sen!2sph`}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          ></iframe>
                        </div>
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '120px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                          fontSize: '12px',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <span>📍</span>
                          <span>Location not available</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Footer Information */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#6b7280',
                    paddingTop: '8px',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    <div>
                      <div style={{ marginBottom: '2px' }}>
                        Reported by: <span style={{ fontWeight: '500', color: '#374151' }}>{report.submittedBy?.username || 'Anonymous'}</span>
                      </div>
                    </div>
                    
                    <div style={{
                      background: alertStyle.background,
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {report.severity}
                    </div>
                  </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        reportUser={selectedReportUser}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default NewsFeed;
