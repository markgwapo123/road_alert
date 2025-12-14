import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ReportsOverviewMap.css';
import config from '../config';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ReportsOverviewMap = ({ searchQuery = '' }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false); // Track popup state

  // Fetch all verified reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        console.log('🗺️ ReportsOverviewMap: Fetching reports...');
        console.log('🗺️ API URL:', `${config.API_BASE_URL}/reports`);
        
        const response = await fetch(`${config.API_BASE_URL}/reports?status=verified&limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch reports: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('📍 API Response:', responseData);
        
        // Extract the reports array from the response
        const data = responseData.data || responseData.reports || [];
        console.log('📍 Fetched reports for overview map:', data);
        console.log('📍 Number of reports:', Array.isArray(data) ? data.length : 'Not an array!');
        
        // Ensure data is an array before filtering
        if (!Array.isArray(data)) {
          console.error('❌ Data is not an array:', typeof data, data);
          setReports([]);
          setLoading(false);
          return;
        }
        
        // Filter reports that have valid location data
        const validReports = data.filter(report => {
          // Check both possible location structures
          const hasNewFormat = report.location?.lat && report.location?.lng;
          const hasOldFormat = report.location?.coordinates?.latitude && report.location?.coordinates?.longitude;
          
          console.log('🔍 Checking report:', {
            id: report._id,
            location: report.location,
            hasNewFormat,
            hasOldFormat
          });
          
          return (hasNewFormat && !isNaN(report.location.lat) && !isNaN(report.location.lng)) ||
                 (hasOldFormat && !isNaN(report.location.coordinates.latitude) && !isNaN(report.location.coordinates.longitude));
        });
        
        // Normalize location format
        const normalizedReports = validReports.map(report => ({
          ...report,
          location: {
            ...report.location,
            lat: report.location.lat || report.location.coordinates?.latitude,
            lng: report.location.lng || report.location.coordinates?.longitude
          }
        }));
        
        console.log('📍 Valid reports with location:', normalizedReports.length);
        console.log('📍 Valid reports details:', normalizedReports);
        
        console.log(`✅ ${normalizedReports.length} reports with valid locations`);
        setReports(normalizedReports);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching reports:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapRef.current) {
      // Center on Negros Occidental
      mapInstanceRef.current = L.map(mapRef.current, {
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true
      }).setView([10.1617, 122.9747], 10);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Create a layer group for markers
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
      
      setIsLoading(false);
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Update markers when reports change
    if (mapInstanceRef.current && markersLayerRef.current && reports) {
      // Clear existing markers
      markersLayerRef.current.clearLayers();

      // Filter reports with valid location data
      let reportsWithLocation = reports.filter(
        report => report.location?.lat && report.location?.lng
      );

      // Apply search filter if searchQuery exists
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        reportsWithLocation = reportsWithLocation.filter(report => {
          const matchesCity = report.city?.toLowerCase().includes(query);
          const matchesBarangay = report.barangay?.toLowerCase().includes(query);
          const matchesProvince = report.province?.toLowerCase().includes(query);
          const matchesDescription = report.description?.toLowerCase().includes(query);
          const matchesAlertType = report.alertType?.toLowerCase().includes(query);
          
          return matchesCity || matchesBarangay || matchesProvince || matchesDescription || matchesAlertType;
        });
      }

      if (reportsWithLocation.length === 0) {
        return;
      }

      // Create custom icons based on alert type
      const getMarkerIcon = (alertType) => {
        const colors = {
          'Pothole': '#ef4444',
          'Road Damage': '#f97316',
          'Obstruction': '#eab308',
          'Construction': '#3b82f6',
          'Accident': '#dc2626',
          'Flood': '#06b6d4',
          'Traffic': '#8b5cf6',
          'Other': '#6b7280'
        };

        const color = colors[alertType] || '#6b7280';

        return L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); margin-top: 5px; font-size: 14px;">📍</div></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30]
        });
      };

      // Add markers for each report
      reportsWithLocation.forEach(report => {
        const marker = L.marker(
          [report.location.lat, report.location.lng],
          { icon: getMarkerIcon(report.alertType) }
        );

        // Create popup content with report image
        const getImageUrl = (report) => {
          if (report.images && report.images.length > 0) {
            const firstImage = report.images[0];
            // Check if it's base64 data
            if (firstImage.data) {
              return `data:${firstImage.mimetype || 'image/jpeg'};base64,${firstImage.data}`;
            }
            // Otherwise use filename from backend
            return `${config.BACKEND_URL}/uploads/${firstImage.filename}`;
          }
          return null;
        };

        const imageUrl = getImageUrl(report);
        
        const popupContent = `
          <div style="min-width: 250px; max-width: 300px;">
            ${imageUrl ? `
              <div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden;">
                <img 
                  src="${imageUrl}" 
                  alt="Report Image"
                  style="width: 100%; height: 150px; object-fit: cover; display: block;"
                  onerror="this.style.display='none'"
                />
              </div>
            ` : ''}
            <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
              ${report.alertType || 'Report'}
            </h4>
            <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px;">
              📍 ${report.barangay}, ${report.city}
            </p>
            ${report.description ? `
              <p style="margin: 0 0 8px 0; color: #374151; font-size: 12px; line-height: 1.4;">
                ${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}
              </p>
            ` : ''}
            <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 11px;">
              ${new Date(report.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        `;

        marker.bindPopup(popupContent);
        
        // Add event listeners for popup open/close
        marker.on('popupopen', () => setIsPopupOpen(true));
        marker.on('popupclose', () => setIsPopupOpen(false));
        
        markersLayerRef.current.addLayer(marker);
      });

      // Fit map to show all markers with better centering
      if (reportsWithLocation.length > 0) {
        const bounds = L.latLngBounds(
          reportsWithLocation.map(r => [r.location.lat, r.location.lng])
        );
        
        // Use setTimeout to ensure map is fully loaded
        setTimeout(() => {
          if (mapInstanceRef.current) {
            if (reportsWithLocation.length === 1) {
              // If only one marker, center on it with good zoom
              mapInstanceRef.current.setView(
                [reportsWithLocation[0].location.lat, reportsWithLocation[0].location.lng],
                14
              );
            } else {
              // Multiple markers - fit all with padding
              mapInstanceRef.current.fitBounds(bounds, { 
                padding: [30, 30],
                maxZoom: 13,
                animate: true
              });
            }
          }
        }, 100);
      }
    }
  }, [reports, searchQuery]); // Re-run when reports or searchQuery changes

  // Map control functions
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([10.1617, 122.9747], 10);
    }
  };

  const handleFitAll = () => {
    if (mapInstanceRef.current && reports.length > 0) {
      const reportsWithLocation = reports.filter(r => r.location?.lat && r.location?.lng);
      if (reportsWithLocation.length > 0) {
        if (reportsWithLocation.length === 1) {
          // Center on single marker
          mapInstanceRef.current.setView(
            [reportsWithLocation[0].location.lat, reportsWithLocation[0].location.lng],
            14,
            { animate: true }
          );
        } else {
          // Fit multiple markers
          const bounds = L.latLngBounds(
            reportsWithLocation.map(r => [r.location.lat, r.location.lng])
          );
          mapInstanceRef.current.fitBounds(bounds, { 
            padding: [30, 30], 
            maxZoom: 13,
            animate: true
          });
        }
      }
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className="reports-overview-map-container">
      <div className="map-header">
        <div className="map-title">
          <span className="map-icon">📍</span>
          <h3>Live Map</h3>
        </div>
        <div className="map-stats">
          {isLoading ? (
            <span className="loading-text">Loading...</span>
          ) : error ? (
            <span className="error-text">Error loading</span>
          ) : (
            <span className="reports-count">{reports.length} reports shown</span>
          )}
        </div>
      </div>
      
      <div className="map-wrapper">
        <div 
          ref={mapRef} 
          className="reports-overview-map"
          style={{ height: '400px', width: '100%' }}
        >
          {isLoading && (
            <div className="map-loading">
              <div className="spinner"></div>
              <p>Loading map...</p>
            </div>
          )}
        </div>

        {/* Map Controls - Hide when popup is open */}
        {!isPopupOpen && (
          <div className="map-controls">
            <button onClick={handleResetView} className="map-control-btn reset-btn" title="Reset View">
              <span className="btn-icon">🔄</span>
              Reset View
            </button>
            <button onClick={handleFitAll} className="map-control-btn fit-btn" title="Fit All Markers">
              <span className="btn-icon">📍</span>
              Fit All
            </button>
            <button onClick={handleZoomIn} className="map-control-btn zoom-btn" title="Zoom In">
              <span className="btn-icon">+</span>
              Zoom In
            </button>
            <button onClick={handleZoomOut} className="map-control-btn zoom-btn" title="Zoom Out">
              <span className="btn-icon">−</span>
              Zoom Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsOverviewMap;
