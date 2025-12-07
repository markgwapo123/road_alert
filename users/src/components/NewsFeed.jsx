import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';
import ReportDetailModal from './ReportDetailModal.jsx';
import NewsPostModal from './NewsPostModal.jsx';

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

const NewsFeed = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [newsPosts, setNewsPosts] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportUser, setSelectedReportUser] = useState(null);
  const [selectedNewsPost, setSelectedNewsPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'news'

  useEffect(() => {
    // Debug: Log configuration details
    console.log('🔧 NewsFeed Debug Information:');
    console.log('- API_BASE_URL:', config.API_BASE_URL);
    console.log('- BACKEND_URL:', config.BACKEND_URL);
    console.log('- Environment:', config.ENVIRONMENT);
    console.log('- Is Mobile:', config.IS_MOBILE);
    console.log('- Is Web:', config.IS_WEB);
    console.log('- User Agent:', navigator.userAgent);
    
    // Test backend connectivity
    const testBackendConnection = async () => {
      try {
        const response = await fetch(`${config.BACKEND_URL}/api/health`);
        console.log('🌐 Backend health check:', response.status, response.ok ? '✅' : '❌');
        
        // Test uploads directory
        const uploadsResponse = await fetch(`${config.BACKEND_URL}/api/debug/uploads`);
        const uploadsData = await uploadsResponse.json();
        console.log('📁 Uploads directory debug:', uploadsData);
        
        if (uploadsData.success && uploadsData.files?.length > 0) {
          console.log('📷 Sample files in uploads:', uploadsData.files.slice(0, 3));
        }
      } catch (error) {
        console.error('🌐 Backend connection failed:', error.message);
      }
    };
    testBackendConnection();
    
    const fetchData = async () => {
      try {
        // Fetch both reports and news posts
        const [reportsResponse, newsResponse] = await Promise.all([
          axios.get(`${config.API_BASE_URL}/reports`, {
            params: {
              status: 'verified',
              limit: 20,
              sortBy: 'createdAt',
              sortOrder: 'desc'
            }
          }),
          axios.get(`${config.API_BASE_URL}/news/public/posts`, {
            params: {
              limit: 20
            }
          })
        ]);
        
        const reportsData = reportsResponse.data.data || [];
        const newsData = newsResponse.data.posts || [];
        
        setReports(reportsData);
        setNewsPosts(newsData);
        setFilteredReports(reportsData);
        setFilteredNews(newsData);
      } catch (err) {
        setError('Failed to load content');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter content based on search query
  const filterContent = (query) => {
    if (!query.trim()) {
      setFilteredReports(reports);
      setFilteredNews(newsPosts);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Filter reports
    const filteredReportsData = reports.filter(report => {
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

    // Filter news posts
    const filteredNewsData = newsPosts.filter(post => {
      const title = post.title?.toLowerCase() || '';
      const content = post.content?.toLowerCase() || '';
      const tags = post.tags?.join(' ').toLowerCase() || '';
      const authorName = post.authorName?.toLowerCase() || '';

      return title.includes(searchTerm) || 
             content.includes(searchTerm) ||
             tags.includes(searchTerm) ||
             authorName.includes(searchTerm);
    });

    setFilteredReports(filteredReportsData);
    setFilteredNews(filteredNewsData);
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterContent(query);
  };

  // Update filtered content when data changes
  useEffect(() => {
    filterContent(searchQuery);
  }, [reports, newsPosts, searchQuery]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent':
        return { backgroundColor: '#dc2626', color: '#ffffff' };
      case 'high':
        return { backgroundColor: '#ea580c', color: '#ffffff' };
      case 'normal':
        return { backgroundColor: '#2563eb', color: '#ffffff' };
      case 'low':
        return { backgroundColor: '#16a34a', color: '#ffffff' };
      default:
        return { backgroundColor: '#6b7280', color: '#ffffff' };
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement':
        return '📢';
      case 'safety_tip':
        return '🛡️';
      case 'road_update':
        return '🚧';
      case 'general':
        return 'ℹ️';
      default:
        return '📰';
    }
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

  const handleNewsPostClick = async (post) => {
    setSelectedNewsPost(post);
    setIsNewsModalOpen(true);
    
    // Track post view with user ID for unique counting
    try {
      const payload = user ? { userId: user._id } : {};
      await axios.post(`${config.API_BASE_URL}/news/public/post/${post._id}/view`, payload);
    } catch (err) {
      console.error('Error tracking post view:', err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
    setSelectedReportUser(null);
  };

  const closeNewsModal = () => {
    setIsNewsModalOpen(false);
    setSelectedNewsPost(null);
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
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '20px',
        borderBottom: '2px solid #e9ecef'
      }}>
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'reports' ? '#007bff' : 'transparent',
            color: activeTab === 'reports' ? 'white' : '#007bff',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '-2px'
          }}
        >
          🚨 Road Alerts ({filteredReports.length})
        </button>
        <button
          onClick={() => setActiveTab('news')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'news' ? '#007bff' : 'transparent',
            color: activeTab === 'news' ? 'white' : '#007bff',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '-2px'
          }}
        >
          📰 News & Announcements ({filteredNews.length})
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={activeTab === 'reports' 
              ? "Search by city, barangay, or location..." 
              : "Search news by title, content, or author..."
            }
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                filterContent('');
              }}
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Quick Search Suggestions */}
        {!searchQuery && activeTab === 'reports' && (
          <div className="search-suggestions">
            <span className="suggestions-label">Popular searches:</span>
            {['Kabankalan', 'Bacolod', 'Bago', 'Silay', 'Talisay'].map(city => (
              <button
                key={city}
                className="suggestion-chip"
                onClick={() => {
                  setSearchQuery(city);
                  filterContent(city);
                }}
              >
                {city}
              </button>
            ))}
          </div>
        )}
        
        {searchQuery && (
          <div className="search-results-info">
            {activeTab === 'reports' 
              ? `${filteredReports.length} report${filteredReports.length !== 1 ? 's' : ''} found`
              : `${filteredNews.length} news item${filteredNews.length !== 1 ? 's' : ''} found`
            } for "{searchQuery}"
          </div>
        )}
      </div>
      
      {/* Content Area */}
      {activeTab === 'reports' ? (
        // Reports Tab Content
        reports.length === 0 ? (
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
                            src={(() => {
                              const filename = report.images[0].filename || report.images[0];
                              // If filename is already a full URL (Cloudinary), use it directly
                              if (filename?.startsWith('http://') || filename?.startsWith('https://')) {
                                return filename;
                              }
                              // Otherwise, construct local path
                              return `${config.BACKEND_URL}/uploads/${filename}`;
                            })()}
                            alt="Report"
                            className="report-image"
                            onLoad={(e) => {
                              console.log('✅ Image loaded successfully:', e.target.src);
                            }}
                            onError={(e) => {
                              console.error('❌ Image failed to load:', e.target.src);
                              console.error('Backend URL:', config.BACKEND_URL);
                              console.error('Image filename:', report.images[0].filename || report.images[0]);
                              
                              // Try alternative URLs
                              const originalSrc = e.target.src;
                              const filename = report.images[0].filename || report.images[0];
                              
                              // Try different URL formats
                              const alternativeUrls = [
                                `${config.BACKEND_URL}/uploads/${filename}`,
                                `${config.API_BASE_URL}/../uploads/${filename}`,
                                `https://roadalert-backend-xze4.onrender.com/uploads/${filename}`,
                                `http://192.168.1.150:3001/uploads/${filename}`
                              ];
                              
                              // Try the next URL in sequence
                              const currentIndex = alternativeUrls.indexOf(originalSrc);
                              const nextIndex = currentIndex + 1;
                              
                              if (nextIndex < alternativeUrls.length) {
                                console.log('🔄 Trying alternative URL:', alternativeUrls[nextIndex]);
                                e.target.src = alternativeUrls[nextIndex];
                                return;
                              }
                              
                              // If all URLs failed, show placeholder
                              console.error('🚫 All image URLs failed, showing placeholder');
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div class="report-image-placeholder">
                                  <span class="placeholder-icon">📷</span>
                                  <span class="placeholder-text">Image not available</span>
                                  <div style="font-size: 10px; color: #999; margin-top: 4px;">
                                    Debug: ${filename}
                                  </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>By:</span>
                        {/* Profile Avatar beside username */}
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f3f4f6',
                          fontSize: '12px'
                        }}>
                          {report.reportedBy?.profile?.profileImage ? (
                            <img 
                              src={`${config.BACKEND_URL}${report.reportedBy.profile.profileImage}`}
                              alt="Reporter"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                console.log('Profile image failed to load:', e.target.src);
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = '👤';
                              }}
                            />
                          ) : (
                            '👤'
                          )}
                        </div>
                        <span>{report.reportedBy?.name || report.reportedBy?.username || 'Anonymous'}</span>
                      </div>
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
        )
      ) : (
        // News Tab Content
        newsPosts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: '#f8f9fa',
            borderRadius: '12px',
            color: '#6c757d',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            No news posts available yet
          </div>
        ) : filteredNews.length === 0 ? (
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
            No news found for "{searchQuery}"
            <div style={{ fontSize: '14px', marginTop: '8px', color: '#6c757d' }}>
              Try searching for different keywords
            </div>
          </div>
        ) : (
          <div className="news-feed-grid">
            {filteredNews.map((post) => {
              const priorityStyle = getPriorityStyle(post.priority);
              
              return (
                <div
                  key={post._id}
                  className="report-card news-post-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNewsPostClick(post)}
                >
                  {/* News Post Header */}
                  <div className="report-card-header">
                    <div className="report-type-badge" style={priorityStyle}>
                      {getTypeIcon(post.type)} {post.type.replace('_', ' ')}
                    </div>
                    <div className="report-date">
                      {formatDate(post.publishDate)}
                    </div>
                  </div>
                  
                  {/* News Content */}
                  <div className="report-content">
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginBottom: '12px',
                      color: '#343a40'
                    }}>
                      {post.title}
                    </h3>
                    
                    <p className="report-description" style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '12px'
                    }}>
                      {post.content}
                    </p>
                    
                    {/* Attachments */}
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="news-attachments" style={{
                        marginTop: '12px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '8px'
                      }}>
                        {post.attachments.map((attachment, index) => (
                          <div key={index} style={{
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}>
                            {attachment.type === 'image' ? (
                              <img
                                src={`${config.BACKEND_URL}${attachment.url}`}
                                alt={attachment.originalName}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  objectFit: 'contain',
                                  maxHeight: '120px',
                                  backgroundColor: '#f8f9fa'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentElement.innerHTML = `
                                    <div style="display: flex; align-items: center; justify-content: center; min-height: 120px; background: #f8f9fa; color: #6c757d;">
                                      <span>📷 Image</span>
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div style={{
                                minHeight: '120px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f8f9fa',
                                color: '#6c757d',
                                padding: '10px'
                              }}>
                                <span style={{ fontSize: '24px', marginBottom: '4px' }}>🎥</span>
                                <span style={{ fontSize: '12px', textAlign: 'center', padding: '0 8px' }}>
                                  {attachment.originalName}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div style={{
                        marginTop: '12px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px'
                      }}>
                        {post.tags.map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              fontSize: '11px',
                              background: '#e9ecef',
                              color: '#495057',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                    
                  {/* News Footer */}
                  <div className="report-card-footer">
                    <div className="report-author">
                      By: {post.authorName}
                    </div>
                    <div className="report-severity-badge" style={priorityStyle}>
                      {post.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
      
      {/* Report Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        reportUser={selectedReportUser}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      {/* News Post Detail Modal */}
      <NewsPostModal
        post={selectedNewsPost}
        isOpen={isNewsModalOpen}
        onClose={closeNewsModal}
      />
    </div>
  );
};

export default NewsFeed;
