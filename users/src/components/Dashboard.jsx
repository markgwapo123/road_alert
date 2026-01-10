import React, { useState, useEffect, useCallback, useRef } from 'react';
import config from '../config/index.js';
import ReportDetailModal from './ReportDetailModal.jsx';
import { DashboardSkeleton, ReportListSkeleton } from './SkeletonLoaders.jsx';
import './SkeletonLoaders.css';
import { getReportsCached, cachedRequest, invalidateCache } from '../services/EnhancedApiService.js';
import { localCache, CACHE_TTL } from '../services/LocalCacheService.js';

const Dashboard = ({ token }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    verifiedReports: 0,
    pendingReports: 0,
    myReports: 0
  });
  
  const timeoutRef = useRef(null);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setLoadError(null);
    setShowTimeout(false);
    
    // Show timeout message after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);
    
    try {
      // Try to get cached data first for instant display
      if (!forceRefresh) {
        const cachedReports = localCache.get('dashboard_reports', true);
        const cachedStats = localCache.get('dashboard_stats', true);
        
        if (cachedReports) {
          setReports(cachedReports.data);
          setIsStale(cachedReports.isStale);
          setLoading(false);
        }
        
        if (cachedStats) {
          setStats(cachedStats.data);
        }
      }
      
      // Fetch reports with caching and retry
      const reportsResult = await getReportsCached({
        status: 'verified',
        limit: 8,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }, {
        allowStale: true,
        maxRetries: 3,
      });
      
      setReports(reportsResult.data?.data || []);
      setIsStale(reportsResult.isStale || false);
      
      // Cache the dashboard reports
      if (reportsResult.data?.data) {
        localCache.set('dashboard_reports', reportsResult.data.data, CACHE_TTL.REPORTS);
      }

      // Fetch dashboard stats with caching
      const statsResult = await cachedRequest({
        method: 'GET',
        endpoint: '/reports/stats',
        cacheKey: 'dashboard_stats',
        cacheTTL: CACHE_TTL.MEDIUM,
        allowStale: true,
      });
      
      if (statsResult.data?.stats) {
        setStats(statsResult.data.stats);
        localCache.set('dashboard_stats', statsResult.data.stats, CACHE_TTL.MEDIUM);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoadError(error.message || 'Failed to load data');
      
      // Try to show cached data on error
      const cachedReports = localCache.get('dashboard_reports', true);
      if (cachedReports) {
        setReports(cachedReports.data);
        setIsStale(true);
      }
    } finally {
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setShowTimeout(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchDashboardData]);

  const handleRetry = () => {
    setLoading(true);
    fetchDashboardData(true);
  };

  const handleRefresh = () => {
    invalidateCache('dashboard_');
    setLoading(true);
    setIsStale(false);
    fetchDashboardData(true);
  };

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

  // Show skeleton loader while loading (no cached data available)
  if (loading && reports.length === 0) {
    return (
      <div className="dashboard-container">
        <DashboardSkeleton />
        {showTimeout && (
          <div className="loading-timeout-message">
            <p>⏳ Server is waking up, please wait...</p>
            <button onClick={handleRetry} className="timeout-retry-btn">
              Retry Now
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // Show error state
  if (loadError && reports.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{loadError}</p>
          <button onClick={handleRetry} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Stale data indicator */}
      {isStale && (
        <div className="stale-banner">
          <span>📡 Showing cached data</span>
          <button onClick={handleRefresh} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      )}
      
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome to your BantayDalan dashboard</p>
        </div>
        <button onClick={handleRefresh} className="header-refresh-btn" title="Refresh data">
          🔄
        </button>
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