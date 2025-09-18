import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ReportDetailModal from './ReportDetailModal.jsx';

const Dashboard = ({ token }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    verifiedReports: 0,
    pendingReports: 0,
    myReports: 0
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch recent reports
      const reportsResponse = await axios.get(`${config.API_BASE_URL}/reports`, {
        params: {
          status: 'verified',
          limit: 8,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      });
      setReports(reportsResponse.data.data || []);

      // Fetch dashboard stats
      const statsResponse = await axios.get(`${config.API_BASE_URL}/reports/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setStats(statsResponse.data.stats || stats);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, stats]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleReportClick = async (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
    
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '16px',
        color: '#6b7280'
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0',
      maxWidth: '100%',
      margin: '0'
    }}>
      {/* Dashboard Header */}
      <div style={{
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 8px 0'
        }}>
          Dashboard
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: '0'
        }}>
          Welcome to your Road Alert dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: '#3b82f6',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '20px'
            }}>
              📊
            </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Reports
            </h3>
          </div>
          <p style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0'
          }}>
            {stats.totalReports}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: '#10b981',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '20px'
            }}>
              ✅
            </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Verified
            </h3>
          </div>
          <p style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0'
          }}>
            {stats.verifiedReports}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: '#f59e0b',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '20px'
            }}>
              ⏳
            </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Pending
            </h3>
          </div>
          <p style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0'
          }}>
            {stats.pendingReports}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: '#8b5cf6',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '20px'
            }}>
              📝
            </div>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              My Reports
            </h3>
          </div>
          <p style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0'
          }}>
            {stats.myReports}
          </p>
        </div>
      </div>

      {/* Recent Reports Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🚨 Recent Alerts
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '4px 0 0 0'
          }}>
            Latest verified road alerts from the community
          </p>
        </div>

        <div style={{ padding: '20px' }}>
          {reports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              No recent reports available
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '16px'
            }}>
              {reports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => handleReportClick(report)}
                  style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Alert Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937',
                      margin: '0',
                      textTransform: 'capitalize'
                    }}>
                      {report.type.replace('_', ' ')} alert
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      {formatDate(report.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    margin: '0 0 12px 0',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {report.description}
                  </p>

                  {/* Image and Map Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                    height: '100px'
                  }}>
                    {/* Image */}
                    {report.images && report.images.length > 0 ? (
                      <img
                        src={`${config.BACKEND_URL}/uploads/${report.images[0].filename || report.images[0]}`}
                        alt="Report"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        fontSize: '12px'
                      }}>
                        No Image
                      </div>
                    )}

                    {/* Map */}
                    {report.location && report.location.coordinates ? (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                      }}>
                        <iframe
                          src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3921.4!2d${report.location.coordinates[0]}!3d${report.location.coordinates[1]}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sph!4v1635820000000!5m2!1sen!2sph`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen=""
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        fontSize: '12px',
                        flexDirection: 'column'
                      }}>
                        📍 No Location
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#6b7280' }}>
                      by <strong>{report.submittedBy?.username || 'Anonymous'}</strong>
                    </span>
                    <button style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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

export default Dashboard;
