import { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ReportsPDF = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get('http://localhost:3001/api/reports', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReports(res.data.data || res.data.reports || res.data || []);
      } catch (err) {
        setError('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Helper: fetch image as base64
  const fetchImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };
  // Helper: Generate realistic map image using Google Maps Static API
  const generateMapImage = async (lat, lng) => {
    try {
      // Using Google Maps Static API without API key (has usage limits but works for basic use)
      // For production, you should get a Google Maps API key and add it as &key=YOUR_API_KEY
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300&maptype=roadmap&markers=color:red%7Clabel:A%7C${lat},${lng}&format=png`;
      
      // Fetch the map image and convert to base64
      const response = await fetch(mapUrl);
      if (response.ok) {
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        throw new Error('Failed to fetch map');
      }
    } catch (error) {
      console.warn('Failed to fetch Google Maps image, falling back to OpenStreetMap');
      
      // Fallback to OpenStreetMap Static API
      try {
        const osmUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-a+ff0000(${lng},${lat})/${lng},${lat},15/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
        
        const response = await fetch(osmUrl);
        if (response.ok) {
          const blob = await response.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (osmError) {
        console.warn('OpenStreetMap fallback also failed, using simple map');
      }
      
      // Final fallback to simple canvas map
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 400;
        canvas.height = 300;

        // Create a simple map with marker
        ctx.fillStyle = '#e6f3ff';
        ctx.fillRect(0, 0, 400, 300);
        
        // Add grid lines to simulate map
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        for (let i = 0; i < 400; i += 50) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 300);
          ctx.stroke();
        }
        for (let i = 0; i < 300; i += 50) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(400, i);
          ctx.stroke();
        }

        // Add marker in center
        const markerX = 200;
        const markerY = 150;
        
        // Draw marker pin
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add coordinates text
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`Lat: ${lat.toFixed(4)}`, 10, 20);
        ctx.fillText(`Lng: ${lng.toFixed(4)}`, 10, 35);
        ctx.fillText('Map Location', 10, 280);

        // Convert canvas to base64
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      });
    }
  };

  // Helper for PDF: format a single report's details with map image
  const addReportToPDF = async (doc, r, y) => {
    let cursor = y;
    doc.setFontSize(13);
    doc.text(`Type: ${r.type || ''}`, 14, cursor); cursor += 8;
    doc.text(`Status: ${r.status || ''}`, 14, cursor); cursor += 8;
    doc.text(`Severity: ${r.severity || ''}`, 14, cursor); cursor += 8;
    doc.text(`Location: ${r.location?.address || '-'}`, 14, cursor); cursor += 8;
    if (r.location?.coordinates) {
      doc.text(`Coordinates: ${r.location.coordinates.latitude}, ${r.location.coordinates.longitude}`, 14, cursor); cursor += 8;
    }
    doc.text(`Date/Time: ${new Date(r.createdAt).toLocaleString()}`, 14, cursor); cursor += 8;
    doc.text(`Description:`, 14, cursor); cursor += 7;
    doc.setFontSize(11);
    doc.text(r.description || '-', 18, cursor, { maxWidth: 170 }); cursor += 12;
    doc.setFontSize(13);
    
    // Reporter info
    let reporter = r.reportedBy?.username || r.reportedBy?.name || 'Anonymous';
    if (r.reportedBy?.username && r.reportedBy?.name) {
      reporter += ` (${r.reportedBy.name})`;
    }
    doc.text(`Reporter: ${reporter}`, 14, cursor); cursor += 8;
    if (r.reportedBy?.email) {
      doc.text(`Email: ${r.reportedBy.email}`, 14, cursor); cursor += 8;
    }
    if (r.reportedBy?.phone) {
      doc.text(`Phone: ${r.reportedBy.phone}`, 14, cursor); cursor += 8;
    }

    // Add uploaded images
    if (r.images && r.images.length > 0) {
      doc.text(`Images:`, 14, cursor); cursor += 7;
      for (const img of r.images) {
        doc.setFontSize(10);
        doc.text(`- ${img.originalName || img.filename}`, 18, cursor); cursor += 6;
        // Try to embed the image itself (first image only, for brevity)
        if (img.filename && cursor < 200) {
          const imgUrl = `http://localhost:3001/uploads/${img.filename}`;
          const base64 = await fetchImageAsBase64(imgUrl);
          if (base64) {
            doc.addImage(base64, 'JPEG', 18, cursor, 60, 40);
            cursor += 45;
          }
        }
        doc.setFontSize(13);
        break; // Only show one image for brevity
      }
    }

    // Add map image if coordinates exist
    if (r.location?.coordinates) {
      const { latitude, longitude } = r.location.coordinates;
      doc.text('Map:', 14, cursor); cursor += 6;
      
      try {
        const mapImage = await generateMapImage(latitude, longitude);
        if (mapImage) {
          doc.addImage(mapImage, 'PNG', 18, cursor, 80, 60);
          cursor += 65;
        }
      } catch (e) {
        doc.text('Map: (Could not generate map image)', 18, cursor); cursor += 8;
      }
    }

    return cursor;
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('BantayDalan - Detailed Report List', 14, 16);
    let y = 26;
    
    for (let idx = 0; idx < reports.length; idx++) {
      const r = reports[idx];
      if (idx > 0) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(14);
      doc.text(`Report #${idx + 1}`, 14, y); y += 8;
      y = await addReportToPDF(doc, r, y + 2);
    }
    doc.save('bantaydalan-detailed-reports.pdf');
  };

  // Helper: Card UI for each report
  const ReportCard = ({ r, idx }) => (
    <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-200">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold capitalize">{r.type}</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${r.status === 'verified' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
          <span className={`text-sm font-medium capitalize ${r.severity === 'high' ? 'text-red-600' : r.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`}>{r.severity} severity</span>
        </div>
        <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
            <p className="text-gray-900 bg-gray-50 p-2 rounded-lg">{r.location?.address || 'No address provided'}</p>
            {r.location?.coordinates && (
              <p className="text-xs text-gray-500 mt-1">Lat: {r.location.coordinates.latitude}, Lng: {r.location.coordinates.longitude}</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
            <p className="text-gray-900 bg-gray-50 p-2 rounded-lg">{r.description}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Reporter Information</h4>
            <div className="text-gray-900">
              <p className="font-medium">
                {r.reportedBy?.username || r.reportedBy?.name || 'Anonymous Reporter'}
                {r.reportedBy?.username && r.reportedBy?.name && (
                  <span className="text-sm text-gray-600 ml-2">({r.reportedBy.name})</span>
                )}
              </p>
              {r.reportedBy?.email && <p className="text-sm text-gray-600 mt-1">📧 {r.reportedBy.email}</p>}
              {r.reportedBy?.phone && <p className="text-sm text-gray-600 mt-1">📱 {r.reportedBy.phone}</p>}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Quick Info</h5>
            <div className="space-y-1 text-sm text-blue-800">
              <p>Report ID: {r._id || r.id}</p>
              <p>Priority: {r.severity} severity</p>
              <p>Status: {r.status}</p>
              {r.verifiedAt && <p>Verified: {new Date(r.verifiedAt).toLocaleDateString()}</p>}
              {r.location?.coordinates && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="font-medium">Coordinates:</p>
                  <p>Lat: {r.location.coordinates.latitude}</p>
                  <p>Lng: {r.location.coordinates.longitude}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Images Section + Map below */}
        <div className="space-y-3">
          {r.images && r.images.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Uploaded Images ({r.images.length})</h4>
              <div className="grid grid-cols-1 gap-3">
                {r.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`http://localhost:3001/uploads/${image.filename}`}
                      alt={`Report image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg shadow-sm border border-gray-200"
                      onError={e => { e.target.src = 'https://via.placeholder.com/400x200/e5e7eb/6b7280?text=Image+Not+Found'; }}
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {image.originalName || `Image ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">No images uploaded</div>
          )}
          {/* Map Embed below images */}
          {r.location?.coordinates && (
            <div style={{marginTop: '10px'}}>
              <strong>Location Map:</strong>
              <div style={{width: '100%', maxWidth: 400, height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid #bbb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 5}}>
                <iframe
                  src={`https://maps.google.com/maps?q=${r.location.coordinates.latitude},${r.location.coordinates.longitude}&z=15&output=embed`}
                  width="100%"
                  height="220"
                  style={{border: 0}}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map for report ${r._id || idx}`}
                ></iframe>
              </div>
              <div style={{fontSize: 12, color: '#555', marginTop: 2}}>Lat: {r.location.coordinates.latitude}, Lng: {r.location.coordinates.longitude}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Report List (Detailed)</h1>
      <button
        onClick={downloadPDF}
        className="mb-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
      >
        Download as PDF
      </button>
      {loading ? (
        <div>Loading reports...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500">No reports found.</div>
      ) : (
        <div>
          {reports.map((r, idx) => (
            <ReportCard r={r} idx={idx} key={r._id || idx} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPDF;
