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
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        const reportsData = response.data.data || [];
        setReports(reportsData);
        setFilteredReports(reportsData);
      } catch (err) {
        setError('Failed to load reports');
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Filter reports based on search query
  const filterReports = (query) => {
    if (!query.trim()) {
      setFilteredReports(reports);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = reports.filter(report => {
      // Search in city, barangay, province, and address
      const city = report.city?.toLowerCase() || '';
      const barangay = report.barangay?.toLowerCase() || '';
      const province = report.province?.toLowerCase() || '';
      const address = report.location?.address?.toLowerCase() || '';
      const description = report.description?.toLowerCase() || '';

      return city.includes(searchTerm) || 
             barangay.includes(searchTerm) || 
             province.includes(searchTerm) ||
             address.includes(searchTerm) ||
             description.includes(searchTerm);
    });

    setFilteredReports(filtered);
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterReports(query);
  };

  // Update filtered reports when reports change
  useEffect(() => {
    filterReports(searchQuery);
  }, [reports, searchQuery]);

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
      <h2 className="news-feed-title">
        Recent Road Alerts
      </h2>
      
      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by city, barangay, or location... (e.g., Kabankalan)"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                setFilteredReports(reports);
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Quick Search Suggestions */}
        {!searchQuery && (
          <div className="search-suggestions">
            <span className="suggestions-label">Popular searches:</span>
            {['Kabankalan', 'Bacolod', 'Bago', 'Silay', 'Talisay'].map(city => (
              <button
                key={city}
                className="suggestion-chip"
                onClick={() => {
                  setSearchQuery(city);
                  filterReports(city);
                }}
              >
                {city}
              </button>
            ))}
          </div>
        )}
        
        {searchQuery && (
          <div className="search-results-info">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found for "{searchQuery}"
          </div>
        )}
      </div>
      
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
      ) : filteredReports.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: '#fff3cd',
          borderRadius: '12px',
          color: '#856404',
          maxWidth: '600px',
          margin: '0 auto',
          border: '1px solid #ffeaa7'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔍</div>
          No reports found for "{searchQuery}"
          <div style={{ fontSize: '14px', marginTop: '8px', color: '#6c757d' }}>
            Try searching for cities like "Kabankalan", "Bacolod", or barangays
          </div>
        </div>
      ) : (
        <div className="news-feed-grid">
          {filteredReports.map((report) => {
            const alertStyle = ALERT_COLORS[report.type] || ALERT_COLORS.info;
            
            return (
              <div
                key={report._id}
                onClick={() => handleReportClick(report)}
                className="report-card"
              >
                {/* Mobile-optimized Header */}
                <div className="report-card-header">
                  <div className="report-type-badge" style={{
                    background: alertStyle.background,
                    color: 'white'
                  }}>
                    {alertStyle.icon} {report.type.replace('_', ' ')}
                  </div>
                  <div className="report-date">
                    {formatDate(report.createdAt)}
                  </div>
                </div>
                
                {/* Compact Content Section */}
                <div className="report-content">
                  <p className="report-description">
                    {report.description}
                  </p>
                  
                  {/* Location Information */}
                  <div className="report-location-info" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    padding: '6px 8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#495057'
                  }}>
                    <span className="location-icon">📍</span>
                    <span className="location-text">
                      {report.barangay && report.city && report.province 
                        ? `${report.barangay}, ${report.city}, ${report.province}`
                        : report.location?.address || 'Location not specified'
                      }
                    </span>
                  </div>
                  
                  {/* Mobile-optimized Media Section */}
                  <div className="report-media">
                    {/* Report Image */}
                    <div className="report-image-container">
                      {report.images && report.images.length > 0 ? (
                        <img 
                          src={`${config.BACKEND_URL}/uploads/${report.images[0].filename || report.images[0]}`}
                          alt="Report"
                          className="report-image"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="report-image-placeholder">
                                <span class="placeholder-icon">📷</span>
                                <span class="placeholder-text">No Image</span>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="report-image-placeholder">
                          <span className="placeholder-icon">📷</span>
                          <span className="placeholder-text">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Compact Map */}
                    <div className="report-map-container">
                      {report.location?.coordinates?.latitude && report.location?.coordinates?.longitude ? (
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${(report.location.coordinates.longitude - 0.01)},${(report.location.coordinates.latitude - 0.01)},${(report.location.coordinates.longitude + 0.01)},${(report.location.coordinates.latitude + 0.01)}&layer=mapnik&marker=${report.location.coordinates.latitude},${report.location.coordinates.longitude}`}
                          className="report-map"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                      ) : (
                        <div className="report-map-placeholder">
                          <span className="placeholder-icon">📍</span>
                          <span className="placeholder-text">No Location</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  
                {/* Compact Footer */}
                <div className="report-card-footer">
                  <div className="report-author">
                    By: {report.reportedBy?.name || report.reportedBy?.username || 'Anonymous'}
                  </div>
                  <div className="report-severity-badge" style={{
                    background: alertStyle.background === '#fbbf24' ? '#000' : alertStyle.background,
                    color: alertStyle.background === '#fbbf24' ? '#fff' : 'white'
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
