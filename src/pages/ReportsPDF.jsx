import { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../config/index.js';

const ReportsPDF = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`${config.API_BASE_URL}/reports`, {
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

  const filteredReports = reports.filter(report => {
    const matchesSearch =
      report.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;

    let matchesDate = true;
    if (startDate || endDate) {
      const reportDate = new Date(report.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        if (reportDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (reportDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Print-specific style overrides to print nice tables without navbar and filters */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            font-size: 11px !important;
            text-align: left !important;
          }
          th {
            background-color: #f3f4f6 !important;
          }
        }
      `}</style>

      {/* Header Controls */}
      <div className="no-print mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BantayDalan - Print Reports</h1>
            <p className="text-sm text-gray-600">Filter hazard reports and print them as a clean table.</p>
          </div>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search reports..."
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {(startDate || endDate) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-3 py-2 bg-gray-100 text-red-600 hover:bg-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                Clear Date
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Report View (Clean Table) */}
      <div className="print-container">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Loading reports...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-600 font-medium">{error}</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-white rounded-lg border border-gray-200">No reports found matching your criteria.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            {/* Display on printed page */}
            <div className="hidden print:block p-4 border-b">
              <h2 className="text-xl font-bold text-center">BantayDalan Hazard Reports Report</h2>
              <p className="text-xs text-center text-gray-600 mt-1">Generated on {new Date().toLocaleString()}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date & Time</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Severity</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Reporter</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((r, idx) => (
                    <tr key={r._id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 capitalize">{r.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.location?.address || r.location || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                          r.status === 'verified' ? 'bg-green-100 text-green-700' :
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm capitalize font-medium">
                        <span className={`${
                          r.severity === 'high' ? 'text-red-600' :
                          r.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{r.reportedBy?.username || r.reportedBy?.name || 'Anonymous'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 break-words max-w-xs">{r.description || 'No description'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPDF;
