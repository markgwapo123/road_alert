import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ReportsOverviewMap.css';
import config from '../config';
import { useSettings } from '../context/SettingsContext.jsx';

// Fix for default marker icon issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Map tile layers for different styles
const MAP_TILES = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
};

const ReportsOverviewMap = ({ searchQuery = '' }) => {
  const { getMapConfig } = useSettings();
  const mapConfig = getMapConfig();
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setPermissionError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLatLng = { lat: latitude, lng: longitude };
        setUserLocation(userLatLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(userLatLng, 17);
        }
        setPermissionError(null);
      },
      (error) => {
        setPermissionError(`Error getting location: ${error.message}`);
      }
    );
  };

  // Fetch all verified reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${config.API_BASE_URL}/reports?status=verified&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Failed to fetch reports: ${response.status}`);

        const responseData = await response.json();
        const data = responseData.data || responseData.reports || [];
        
        if (!Array.isArray(data)) {
          console.error('Data is not an array:', data);
          setReports([]);
          setIsLoading(false);
          return;
        }
        
        const validReports = data.filter(report => 
          (report.location?.lat && report.location?.lng) ||
          (report.location?.coordinates?.latitude && report.location?.coordinates?.longitude)
        );
        
        const normalizedReports = validReports.map(report => ({
          ...report,
          location: {
            lat: report.location.lat ?? report.location.coordinates.latitude,
            lng: report.location.lng ?? report.location.coordinates.longitude,
          }
        }));
        
        setReports(normalizedReports);
      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        center: [mapConfig.center.lat, mapConfig.center.lng],
        zoom: mapConfig.zoom,
        zoomControl: true, // Keep zoom controls, but they can be styled
        attributionControl: false, // We will add it manually
      });
      mapInstanceRef.current = map;

      tileLayerRef.current = L.tileLayer(MAP_TILES[mapConfig.style].url).addTo(map);
      
      // Add custom attribution
      L.control.attribution({
        prefix: false,
        position: 'bottomright'
      }).addAttribution(MAP_TILES[mapConfig.style].attribution).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
    }
  }, [mapConfig]);

  // Update markers when reports change
  useEffect(() => {
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      reports.forEach(report => {
        const marker = L.marker([report.location.lat, report.location.lng]);
        marker.bindPopup(`<b>${report.type}</b><br>${report.description}`);
        markersLayerRef.current.addLayer(marker);
      });
    }
  }, [reports]);

  // Update map style
  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(MAP_TILES[mapConfig.style].url);
      // Also update attribution
      const attributionControl = mapInstanceRef.current.attributionControl;
      if (attributionControl) {
        attributionControl.remove();
        L.control.attribution({
          prefix: false,
          position: 'bottomright'
        }).addAttribution(MAP_TILES[mapConfig.style].attribution).addTo(mapInstanceRef.current);
      }
    }
  }, [mapConfig.style]);

  // User location marker
  useEffect(() => {
    if (userLocation && mapInstanceRef.current) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        fillColor: "#1a73e8",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapInstanceRef.current);

      const pulsingIcon = L.divIcon({
          className: 'pulsing-dot',
          iconSize: [20, 20]
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: pulsingIcon }).addTo(mapInstanceRef.current);
    }
  }, [userLocation]);

  return (
    <div className="map-overview-container">
      <div ref={mapRef} className="map-overview-map"></div>
      <button onClick={locateUser} className="locate-me-btn-overview" aria-label="Center map on your location">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
        </svg>
      </button>
      {permissionError && <div className="map-permission-error-overview">{permissionError}</div>}
      {isLoading && <div className="map-loading-overlay">Loading Map...</div>}
      {error && <div className="map-error-overlay">Error: {error}</div>}
    </div>
  );
};

export default ReportsOverviewMap;

