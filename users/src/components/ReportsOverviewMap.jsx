import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ReportsOverviewMap.css';
import config from '../config';
import { useSettings } from '../context/SettingsContext.jsx';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Map tile layers for different styles
const MAP_TILES = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB'
  }
};

const ReportsOverviewMap = ({ searchQuery = '', statusFilter = 'reports' }) => {
  const { getMapConfig } = useSettings();
  const mapConfig = getMapConfig();
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const updateLabelVisibilityRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Fetch all verified reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const statusParam = statusFilter === 'resolved' ? 'resolved' : 'verified';
        
        console.log('🗺️ ReportsOverviewMap: Fetching reports...');
        console.log('🗺️ API URL:', `${config.API_BASE_URL}/reports`);
        
        const response = await fetch(`${config.API_BASE_URL}/reports?status=${statusParam}&limit=100`, {
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
  }, [statusFilter]);

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapRef.current) {
      // Use settings for map center and zoom
      const { center, zoom, style } = mapConfig;
      
      mapInstanceRef.current = L.map(mapRef.current, {
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
        tap: false,
        keyboard: false,
        attributionControl: false, // Disable attribution control
      }).setView([center.lat, center.lng], zoom);

      // Get tile layer based on style setting
      const tileConfig = MAP_TILES[style] || MAP_TILES.streets;
      tileLayerRef.current = L.tileLayer(tileConfig.url, {
        attribution: '', // Remove attribution from tile layer
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      // Create a layer group for markers
      markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

      // Hide labels at lower zoom (fit-all view), show when zoomed in
      const LABEL_SHOW_ZOOM = 14;
      const updateLabelVisibility = () => {
        if (!mapInstanceRef.current || !mapRef.current) return;
        const zoom = mapInstanceRef.current.getZoom();
        if (zoom >= LABEL_SHOW_ZOOM) {
          mapRef.current.classList.remove('labels-hidden');
        } else {
          mapRef.current.classList.add('labels-hidden');
        }
      };

      updateLabelVisibilityRef.current = updateLabelVisibility;
      mapInstanceRef.current.on('zoomend', updateLabelVisibility);
      updateLabelVisibility();
      
      mapInstanceRef.current.on('popupopen', () => setIsPopupOpen(true));
      mapInstanceRef.current.on('popupclose', () => setIsPopupOpen(false));
      
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

  // Update tile layer when map style changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const { style } = mapConfig;
    const tileConfig = MAP_TILES[style] || MAP_TILES.streets;

    // Remove old tile layer
    tileLayerRef.current.remove();

    // Add new tile layer
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

    console.log('🗺️ Map style updated to:', style);
  }, [mapConfig.style]);

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

        return L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
      };

      const recenterToVisibleReports = () => {
        if (!mapInstanceRef.current || reportsWithLocation.length === 0) return;

        if (reportsWithLocation.length === 1) {
          const singleLat = Number(reportsWithLocation[0]?.location?.lat);
          const singleLng = Number(reportsWithLocation[0]?.location?.lng);
          if (!Number.isNaN(singleLat) && !Number.isNaN(singleLng)) {
            mapInstanceRef.current.setView([singleLat, singleLng], 16, { animate: true });
          }
        } else {
          const bounds = L.latLngBounds(
            reportsWithLocation.map(r => [r.location.lat, r.location.lng])
          );
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 15,
            animate: true
          });
        }

        if (updateLabelVisibilityRef.current) {
          updateLabelVisibilityRef.current();
        }
      };

      // Add markers for each report
      reportsWithLocation.forEach(report => {
        const labelText = (() => {
          const description = String(report.description || '').trim();
          if (description) {
            return description.length > 32 ? `${description.slice(0, 32)}...` : description;
          }
          const alertType = String(report.alertType || '').trim();
          return alertType || 'Report';
        })();

        const marker = L.marker(
          [report.location.lat, report.location.lng],
          { icon: getMarkerIcon(report.alertType) }
        );

        // Show report type label above each pin
        marker.bindTooltip(labelText, {
          permanent: true,
          direction: 'top',
          offset: [0, -34],
          className: 'report-pin-label',
          opacity: 1
        });

        // Create popup content with report image
        const getImageUrl = (report) => {
          if (report.images && report.images.length > 0) {
            const firstImage = report.images[0];
            // Check if it's base64 data
            if (firstImage.data) {
              return `data:${firstImage.mimetype || 'image/jpeg'};base64,${firstImage.data}`;
            }
            // Check if it's a full URL
            if (typeof firstImage.filename === 'string') {
              if (firstImage.filename.startsWith('http://') || firstImage.filename.startsWith('https://')) {
                return firstImage.filename;
              }
            }
            // Use image API endpoint
            return `${config.BACKEND_URL}/api/reports/${report._id}/image/0`;
          }
          return null;
        };

        const imageUrl = getImageUrl(report);
        
        const popupContent = `
          <div class="report-popup-content-root">
            ${imageUrl ? `
              <div class="report-popup-image-wrap">
                <img 
                  src="${imageUrl}" 
                  alt="Report Image"
                  class="report-popup-image"
                  style="width: 100%; object-fit: cover; display: block;"
                  onerror="this.style.display='none'"
                />
              </div>
            ` : ''}
            <div class="report-popup-text">
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
          </div>
        `;

        marker.bindPopup(popupContent, {
          autoPan: true,
          keepInView: true,
          autoPanPadding: [10, 10],
          offset: [0, -18],
          closeButton: true,
          maxWidth: 340,
          minWidth: 260,
          className: 'report-map-popup'
        });

        // When popup is closed, re-center to show all visible reports.
        marker.on('popupclose', () => {
          setTimeout(recenterToVisibleReports, 120);
        });
        
        markersLayerRef.current.addLayer(marker);
      });

      // Center map to show all visible reports
      if (reportsWithLocation.length > 0) {
        setTimeout(() => {
          recenterToVisibleReports();
        }, 100);
      }
    }
  }, [reports, searchQuery]); // Re-run when reports or searchQuery changes

  // Map control functions
  const handleFitAll = () => {
    if (mapInstanceRef.current && reports.length > 0) {
      const reportsWithLocation = reports.filter(r => r.location?.lat && r.location?.lng);
      if (reportsWithLocation.length > 0) {
        if (reportsWithLocation.length === 1) {
          // Center on single marker
          mapInstanceRef.current.setView(
            [reportsWithLocation[0].location.lat, reportsWithLocation[0].location.lng],
            16,
            { animate: true }
          );
        } else {
          // Fit multiple markers
          const bounds = L.latLngBounds(
            reportsWithLocation.map(r => [r.location.lat, r.location.lng])
          );
          mapInstanceRef.current.fitBounds(bounds, { 
            padding: [30, 30], 
            maxZoom: 15,
            animate: true
          });
        }

        if (updateLabelVisibilityRef.current) {
          updateLabelVisibilityRef.current();
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

  // Cleanup label visibility listener
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current && updateLabelVisibilityRef.current) {
        mapInstanceRef.current.off('zoomend', updateLabelVisibilityRef.current);
      }
    };
  }, []);

  return (
    <div className={`reports-overview-map-container ${isPopupOpen ? 'popup-active' : ''}`}>
      <div className="map-header">
        <div className="map-title">
          <img
            src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
            alt="location"
            className="map-icon"
          />
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


      </div>
    </div>
  );
};

export default ReportsOverviewMap;
