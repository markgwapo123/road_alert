import { useEffect, useRef, useState } from 'react';
import './ReportsMap.css';

const ReportsMap = ({ reports }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [markers, setMarkers] = useState([]);

  // Center of Negros Occidental (approximate)
  const defaultCenter = { lat: 10.67, lng: 122.95 };
  const defaultZoom = 10;

  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!window.L) {
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(linkElement);

      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      scriptElement.onload = () => {
        setTimeout(initializeMap, 100); // Small delay to ensure DOM is ready
      };
      document.head.appendChild(scriptElement);
    } else {
      setTimeout(initializeMap, 100);
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initializeMap = () => {
    if (!mapContainerRef.current || mapRef.current) return; // Prevent double initialization

    const L = window.L;
    
    // Clear the container first
    mapContainerRef.current.innerHTML = '';
    
    const newMap = L.map(mapContainerRef.current).setView(
      [defaultCenter.lat, defaultCenter.lng],
      defaultZoom
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(newMap);

    mapRef.current = newMap;
  };

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    // Add new markers for reports
    const newMarkers = reports
      .filter(report => report.location?.lat && report.location?.lng)
      .map(report => {
        // Custom icon based on alert type
        const iconColor = 
          report.alertType === 'Accident' ? '#dc3545' :
          report.alertType === 'Under Construction' ? '#ffc107' :
          report.alertType === 'Road Closure' ? '#dc3545' :
          report.alertType === 'Heavy Traffic' ? '#fd7e14' :
          '#007bff';

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background-color: ${iconColor};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
          </div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30]
        });

        const marker = L.marker(
          [report.location.lat, report.location.lng],
          { icon: customIcon }
        ).addTo(mapRef.current);

        // Add popup with report details
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: bold; color: ${iconColor}; margin-bottom: 5px;">
              ${report.alertType}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              ${report.barangay}, ${report.city}, ${report.province}
            </div>
            ${report.description ? `
              <div style="font-size: 13px; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                ${report.description}
              </div>
            ` : ''}
            ${report.image ? `
              <img src="${report.image}" style="width: 100%; border-radius: 6px; margin-top: 8px;" />
            ` : ''}
            <div style="font-size: 11px; color: #999; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
              📅 ${new Date(report.timestamp).toLocaleDateString()}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        return marker;
      });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const group = L.featureGroup(newMarkers);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [reports]);

  return (
    <div className="reports-map-container">
      <div className="map-header">
        <span className="map-icon">🗺️</span>
        <h3>Reports Map</h3>
        <span className="map-count">{reports.length} reports</span>
      </div>
      <div 
        ref={mapContainerRef} 
        className="map-view"
        style={{ height: '400px', width: '100%', borderRadius: '0 0 12px 12px' }}
      />
    </div>
  );
};

export default ReportsMap;
