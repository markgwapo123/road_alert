import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import config from '../config/index.js'

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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
}

// Custom icons for different report types and severities
const createCustomIcon = (type, severity, status) => {
  let color = '#3B82F6' // Default blue
  
  if (status === 'pending') color = '#F59E0B' // Yellow
  else if (status === 'verified') {
    switch (severity) {
      case 'high': color = '#EF4444'; break // Red
      case 'medium': color = '#F59E0B'; break // Yellow  
      case 'low': color = '#10B981'; break // Green
      default: color = '#3B82F6'
    }
  } else if (status === 'resolved') color = '#6B7280' // Gray

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5S12.5 41 12.5 41s12.5-23.9 12.5-28.5S19.4 0 12.5 0z" fill="${color}"/>
        <circle cx="12.5" cy="12.5" r="7" fill="white"/>
        <text x="12.5" y="17" text-anchor="middle" font-size="8" fill="${color}" font-weight="bold">
          ${type.charAt(0).toUpperCase()}
        </text>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

// Component to handle map updates
const MapController = ({ center, zoom, bounds, filteredReports }) => {
  const map = useMap()
  
  useEffect(() => {
    if (bounds && filteredReports.length > 1) {
      // Fit map to show all filtered reports
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, bounds, filteredReports.length, map])
  
  return null
}

const InteractiveMap = ({ reports = [], filters = {}, onReportClick, focusReportId }) => {
  const [mapCenter, setMapCenter] = useState([10.2397, 122.8203]) // Kabankalan City center, Negros Occidental
  const [mapZoom, setMapZoom] = useState(14) // Balanced zoom for city view
  const [filteredReports, setFilteredReports] = useState([])
  const [activePopupId, setActivePopupId] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [mapStyle, setMapStyle] = useState('streets') // Map style from settings

  // Fetch map style from settings
  useEffect(() => {
    const fetchMapStyle = async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/settings/public`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.settings) {
            const style = data.settings.map_style || 'streets'
            console.log('🗺️ Map style loaded:', style)
            setMapStyle(style)
          }
        }
      } catch (error) {
        console.error('Failed to fetch map style:', error)
        // Keep default 'streets' style on error
      }
    }
    fetchMapStyle()
  }, [])

  // Filter reports based on current filters
  useEffect(() => {
    let filtered = reports

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status)
    }

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(report => report.type === filters.type)
    }

    if (filters.severity && filters.severity !== 'all') {
      filtered = filtered.filter(report => report.severity === filters.severity)
    }

    setFilteredReports(filtered)
    
    // Auto-center map when filters change and reports are available
    if (filtered.length > 0) {
      // Calculate the center point of all filtered reports
      const validReports = filtered.filter(report => {
        const coords = report.location?.coordinates;
        if (Array.isArray(coords)) {
          return !isNaN(coords[1]) && !isNaN(coords[0]);
        } else if (coords?.latitude && coords?.longitude) {
          return !isNaN(coords.latitude) && !isNaN(coords.longitude);
        }
        return false;
      });

      if (validReports.length > 0) {
        if (validReports.length === 1) {
          // Single report - center on it
          const report = validReports[0];
          const coords = report.location.coordinates;
          let lat, lng;
          
          if (Array.isArray(coords)) {
            lat = coords[1];
            lng = coords[0];
          } else {
            lat = coords.latitude;
            lng = coords.longitude;
          }
          
          console.log('🎯 Centering on single report:', { lat, lng });
          setMapCenter([lat, lng]);
          setMapZoom(16);
          setMapBounds(null);
        } else {
          // Multiple reports - calculate bounds
          let minLat = Infinity, maxLat = -Infinity;
          let minLng = Infinity, maxLng = -Infinity;
          
          validReports.forEach(report => {
            const coords = report.location.coordinates;
            let lat, lng;
            
            if (Array.isArray(coords)) {
              lat = coords[1];
              lng = coords[0];
            } else {
              lat = coords.latitude;
              lng = coords.longitude;
            }
            
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          });
          
          const bounds = [[minLat, minLng], [maxLat, maxLng]];
          console.log('🗺️ Setting bounds for multiple reports:', bounds, 'Report count:', validReports.length);
          
          setMapBounds(bounds);
          setMapCenter(null); // Let bounds control the view
        }
      }
    } else if (filtered.length === 0 && reports.length > 0) {
      // If no reports match filters, reset to default view
      console.log('🔄 No reports match filters, resetting to default view');
      setMapCenter([10.2397, 122.8203]);
      setMapZoom(14);
      setMapBounds(null);
    }
  }, [reports, filters])

  // Auto-focus on the report with focusReportId
  useEffect(() => {
    if (focusReportId && filteredReports.length > 0) {
      const report = filteredReports.find(r => (r._id || r.id) === focusReportId)
      if (report) {
        setMapCenter([
          report.location.coordinates.latitude,
          report.location.coordinates.longitude
        ])
        setMapZoom(16)
        setActivePopupId(focusReportId)
      }
    }
  }, [focusReportId, filteredReports])

  const handleMarkerClick = (report) => {
    if (onReportClick) {
      onReportClick(report)
    }
    setMapCenter([report.location.coordinates.latitude, report.location.coordinates.longitude])
    setMapZoom(15)
    setActivePopupId(report._id || report.id)
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'verified': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'resolved': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="relative w-full h-96 sm:h-[28rem] md:h-[32rem] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <MapController 
          center={mapCenter} 
          zoom={mapZoom} 
          bounds={mapBounds} 
          filteredReports={filteredReports} 
        />
        {/* Base map layer */}
        <TileLayer
          key={mapStyle}
          attribution={MAP_TILES[mapStyle]?.attribution || MAP_TILES.streets.attribution}
          url={MAP_TILES[mapStyle]?.url || MAP_TILES.streets.url}
        />

        {/* Report markers */}
        {filteredReports.length === 0 && (
          <div className="absolute top-1/2 left-1/2 z-20 bg-white bg-opacity-90 rounded-lg px-6 py-4 shadow-lg text-center transform -translate-x-1/2 -translate-y-1/2 animate-fade-in">
            <p className="text-gray-700 font-semibold">No reports found for the selected filters.</p>
          </div>
        )}
        {filteredReports.map((report) => {
          let lat, lng;
          
          console.log('🔍 Processing report for popup:', report._id, 'Images:', report.images);
          
          if (Array.isArray(report.location.coordinates)) {
            // GeoJSON: [lng, lat]
            lng = report.location.coordinates[0];
            lat = report.location.coordinates[1];
            console.log('📍 Array coordinates:', { lat, lng });
          } else if (
            typeof report.location.coordinates === 'object' &&
            'latitude' in report.location.coordinates &&
            'longitude' in report.location.coordinates
          ) {
            lat = report.location.coordinates.latitude;
            lng = report.location.coordinates.longitude;
            console.log('📍 Object coordinates:', { lat, lng });
          } else {
            console.error('❌ Invalid coordinate format for report:', report._id, report.location);
            return null; // Skip this report if coordinates are invalid
          }
          
          // Validate coordinates are numbers and in valid range
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.error('❌ Invalid coordinate values for report:', report._id, { lat, lng });
            return null; // Skip this report if coordinates are invalid
          }
          
          return (
            <Marker
              key={report._id || report.id}
              position={[lat, lng]}
              icon={createCustomIcon(report.type, report.severity, report.status)}
              eventHandlers={{
                click: () => handleMarkerClick(report)
              }}
            >
              <Popup autoOpen={((report._id || report.id) === activePopupId)} autoPan={true}>
                <div className="min-w-64 space-y-2 animate-popup-fade-in">
                  <div className="flex items-center justify-between mb-2 border-b pb-1">
                    <h3 className="font-semibold text-gray-900 capitalize text-lg flex items-center gap-2">
                      {report.type}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(report.status)}`}>{report.status}</span>
                  </div>
                  
                  {/* Report Images */}
                  {report.images && report.images.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1">Images ({report.images.length})</div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {report.images.slice(0, 2).map((image, index) => {
                          const filename = image?.filename || image;
                          const imageUrl = `${config.BACKEND_URL}/uploads/${filename}`;
                          console.log('🖼️ Popup image:', { index, image, filename, imageUrl });
                          return (
                            <div key={index} className="relative">
                              <img
                                src={imageUrl}
                                alt={`Report image ${index + 1}`}
                                className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                onLoad={(e) => {
                                  console.log('✅ Popup image loaded:', imageUrl);
                                }}
                                onError={(e) => { 
                                  console.error('❌ Popup image failed to load:', imageUrl);
                                  e.target.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
                                    <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>
                                      <rect width='80' height='80' fill='%23f3f4f6' stroke='%23d1d5db' stroke-width='1'/>
                                      <text x='40' y='40' text-anchor='middle' dy='0.3em' fill='%236b7280' font-size='12'>IMG</text>
                                    </svg>
                                  `)}`;
                                }}
                              />
                            </div>
                          );
                        })}
                        {report.images.length > 2 && (
                          <div className="h-20 w-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">+{report.images.length - 2}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Debug info */}
                  {(!report.images || report.images.length === 0) && (
                    <div className="mb-2 text-xs text-gray-400 italic">
                      No images available for this report
                    </div>
                  )}
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold text-gray-700">Location:</span>
                      <span className="text-gray-600 break-words">{report.location.address}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold text-gray-700">Severity:</span>
                      <span className={`font-medium ${getSeverityColor(report.severity)}`}>{report.severity}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold text-gray-700">Reported:</span>
                      <span className="text-gray-600">{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    {report.description && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-gray-700">Description:</span>
                        <span className="text-gray-600 break-words">{report.description}</span>
                      </div>
                    )}
                    {report.reportedBy?.name && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-gray-700">Reported by:</span>
                        <span className="text-gray-600">{report.reportedBy.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => handleMarkerClick(report)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                      View Full Report
                    </button>
                    <button
                      onClick={() => {
                        const coords = `${report.location.coordinates.latitude},${report.location.coordinates.longitude}`
                        window.open(`https://www.google.com/maps?q=${coords}`, '_blank')
                      }}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                      Open in Google Maps
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map overlay with report count */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:top-4 sm:left-4 sm:translate-x-0 bg-white rounded-lg shadow-lg p-3 sm:p-4 z-10 border border-blue-200 flex items-center gap-2 animate-fade-in">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0V7m0 4v4m0 0c0 1.104-.896 2-2 2s-2-.896-2-2 .896-2 2-2 2 .896 2 2z"/></svg>
        <span className="text-sm font-medium text-gray-900">{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} shown</span>
      </div>

      {/* Map controls */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 sm:top-4 sm:right-4 sm:left-auto sm:bottom-auto sm:translate-x-0 bg-white rounded-lg shadow-lg p-2 z-10 flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 animate-fade-in">
        <button
          onClick={() => {
            setMapCenter([10.2397, 122.8203])
            setMapZoom(14)
            setMapBounds(null)
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors shadow-sm flex-1"
          title="Reset map to Kabankalan City center"
        >
          <span role="img" aria-label="Reset">🔄</span> <span className="hidden sm:inline">Reset View</span>
        </button>
        {filteredReports.length > 1 && (
          <button
            onClick={() => {
              // Manually trigger bounds fitting for all filtered reports
              const validReports = filteredReports.filter(report => {
                const coords = report.location?.coordinates;
                if (Array.isArray(coords)) {
                  return !isNaN(coords[1]) && !isNaN(coords[0]);
                } else if (coords?.latitude && coords?.longitude) {
                  return !isNaN(coords.latitude) && !isNaN(coords.longitude);
                }
                return false;
              });

              if (validReports.length > 1) {
                let minLat = Infinity, maxLat = -Infinity;
                let minLng = Infinity, maxLng = -Infinity;
                
                validReports.forEach(report => {
                  const coords = report.location.coordinates;
                  let lat, lng;
                  
                  if (Array.isArray(coords)) {
                    lat = coords[1];
                    lng = coords[0];
                  } else {
                    lat = coords.latitude;
                    lng = coords.longitude;
                  }
                  
                  minLat = Math.min(minLat, lat);
                  maxLat = Math.max(maxLat, lat);
                  minLng = Math.min(minLng, lng);
                  maxLng = Math.max(maxLng, lng);
                });
                
                const bounds = [[minLat, minLng], [maxLat, maxLng]];
                setMapBounds(bounds);
                setMapCenter(null);
              }
            }}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors shadow-sm flex-1"
            title="Fit all filtered reports in view"
          >
            <span role="img" aria-label="Fit all">📍</span> <span className="hidden sm:inline">Fit All</span>
          </button>
        )}
        <button
          onClick={() => setMapZoom(mapZoom + 1)}
          className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors shadow-sm flex-1"
          title="Zoom In"
        >
          <span role="img" aria-label="Zoom in">➕</span> <span className="hidden sm:inline">Zoom In</span>
        </button>
        <button
          onClick={() => setMapZoom(mapZoom - 1)}
          className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors shadow-sm flex-1"
          title="Zoom Out"
        >
          <span role="img" aria-label="Zoom out">➖</span> <span className="hidden sm:inline">Zoom Out</span>
        </button>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .leaflet-popup-content-wrapper, .leaflet-popup-tip {
            max-width: 90vw !important;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s;
        }
        .animate-popup-fade-in {
          animation: popupFadeIn 0.4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popupFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default InteractiveMap
