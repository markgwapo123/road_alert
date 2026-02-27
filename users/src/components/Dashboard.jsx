import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ReportDetailModal from './ReportDetailModal.jsx';
import { useSettings } from '../context/SettingsContext';

const Dashboard = ({ token }) => {
  const { getSetting } = useSettings();
  const siteName = getSetting('site_name', 'BantayDalan');
  
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
    
    if (report.reportedBy) {
      setSelectedReportUser(report.reportedBy);
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
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to your {siteName} dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-blue">📊</div>
            <h3 className="stat-label">Total Reports</h3>
          </div>
          <p className="stat-value">{stats.totalReports}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-green">✅</div>
            <h3 className="stat-label">Verified</h3>
          </div>
          <p className="stat-value">{stats.verifiedReports}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-yellow">⏳</div>
            <h3 className="stat-label">Pending</h3>
          </div>
          <p className="stat-value">{stats.pendingReports}</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-icon stat-icon-purple">📝</div>
            <h3 className="stat-label">My Reports</h3>
          </div>
          <p className="stat-value">{stats.myReports}</p>
        </div>
      </div>

      {/* Recent Reports Section */}
      <div className="recent-reports-section">
        <div className="recent-reports-header">
          <h2 className="recent-reports-title">🚨 Recent Alerts</h2>
          <p className="recent-reports-subtitle">Latest verified reports from the community</p>
        </div>

        <div className="recent-reports-content">
          {reports.length === 0 ? (
            <div className="no-recent-reports">
              <p>📋 No recent alerts available</p>
              <p>Check back later for community reports</p>
            </div>
          ) : (
            <div className="recent-reports-grid">
              {reports.map((report) => (
                <div
                  key={report._id}
                  onClick={() => handleReportClick(report)}
                  className="report-card dashboard-report-card"
                >
                  <div className="report-header">
                    <div className="report-type">
                      <span className="report-icon">
                        {report.severity === 'high' ? '🚨' : 
                         report.severity === 'medium' ? '⚠️' : '📍'}
                      </span>
                      <span className="report-type-text">{report.type}</span>
                    </div>
                    <span className="report-time">{formatDate(report.createdAt)}</span>
                  </div>
                  
                  <div className="report-content">
                    <p className="report-description">
                      {report.description?.length > 120 
                        ? `${report.description.substring(0, 120)}...` 
                        : report.description}
                    </p>
                    
                    <div className="report-location">
                      <span className="location-icon">📍</span>
                      <span className="location-text">
                        {typeof report.location === 'object' 
                          ? report.location.address || 'Location coordinates provided'
                          : report.location || 'Location not specified'}
                      </span>
                    </div>
                    
                    <div className="report-footer">
                      <span className={`severity-badge severity-${report.severity}`}>
                        {report.severity?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span className="view-details">👁️ View Details</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      <ReportDetailModal
        isOpen={isModalOpen}
        onClose={closeModal}
        report={selectedReport}
        user={selectedReportUser}
      />
    </div>
  );
};

export default Dashboard;