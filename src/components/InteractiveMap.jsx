import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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
const MapController = ({ center, zoom }) => {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom)
    }
  }, [center, zoom, map])
  
  return null
}

const InteractiveMap = ({ reports = [], filters = {}, onReportClick, focusReportId }) => {
  const [mapCenter, setMapCenter] = useState([10.2397, 122.8203]) // Kabankalan City center, Negros Occidental
  const [mapZoom, setMapZoom] = useState(14) // Balanced zoom for city view
  const [filteredReports, setFilteredReports] = useState([])
  const [activePopupId, setActivePopupId] = useState(null)

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
        <MapController center={mapCenter} zoom={mapZoom} />
        {/* Base map layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Report markers */}
        {filteredReports.length === 0 && (
          <div className="absolute top-1/2 left-1/2 z-20 bg-white bg-opacity-90 rounded-lg px-6 py-4 shadow-lg text-center transform -translate-x-1/2 -translate-y-1/2 animate-fade-in">
            <p className="text-gray-700 font-semibold">No reports found for the selected filters.</p>
          </div>
        )}
        {filteredReports.map((report) => {
          let lat, lng;
          if (Array.isArray(report.location.coordinates)) {
            // GeoJSON: [lng, lat]
            lng = report.location.coordinates[0];
            lat = report.location.coordinates[1];
          } else if (
            typeof report.location.coordinates === 'object' &&
            'latitude' in report.location.coordinates &&
            'longitude' in report.location.coordinates
          ) {
            lat = report.location.coordinates.latitude;
            lng = report.location.coordinates.longitude;
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
                  {report.imageUrl && (
                    <div className="mb-2 flex justify-center">
                      <img src={report.imageUrl} alt="Report" className="rounded-md max-h-28 object-cover border max-w-full" />
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
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors shadow-sm flex-1"
          title="Reset map to Kabankalan City center"
        >
          <span role="img" aria-label="Reset">🔄</span> <span className="hidden sm:inline">Reset View</span>
        </button>
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
