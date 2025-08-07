import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserVerifications = () => {
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('submitted');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

  useEffect(() => {
    fetchVerifications();
    fetchStats();
  }, [selectedStatus]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://192.168.1.150:3001/api/admin/verifications?status=${selectedStatus}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }
      );
      setVerifications(response.data.verifications || []);
    } catch (err) {
      setError('Failed to fetch verifications');
      console.error('Fetch verifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        'http://192.168.1.150:3001/api/admin/verification-stats',
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }
      );
      setStats(response.data.stats || {});
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(
        `http://192.168.1.150:3001/api/admin/verifications/${userId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }
      );
      setSelectedUser(response.data.user);
      setShowDetails(true);
    } catch (err) {
      setError('Failed to fetch user details');
      console.error('Fetch user details error:', err);
    }
  };

  const handleVerificationAction = async (userId, status, notes = '') => {
    setProcessing(true);
    try {
      await axios.put(
        `http://192.168.1.150:3001/api/admin/verifications/${userId}`,
        { status, notes },
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        }
      );
      
      setShowDetails(false);
      setSelectedUser(null);
      fetchVerifications();
      fetchStats();
      
    } catch (err) {
      setError(`Failed to ${status} verification`);
      console.error('Verification action error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) {
      setError('Please select users first');
      return;
    }
    setBulkAction(action);
    setShowBulkConfirm(true);
  };

  const confirmBulkAction = async () => {
    setProcessing(true);
    try {
      const promises = selectedUsers.map(userId => 
        axios.put(
          `http://192.168.1.150:3001/api/admin/verifications/${userId}`,
          { status: bulkAction },
          {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          }
        )
      );
      
      await Promise.all(promises);
      
      setSelectedUsers([]);
      setShowBulkConfirm(false);
      setBulkAction(null);
      fetchVerifications();
      fetchStats();
      
    } catch (err) {
      setError(`Failed to ${bulkAction} selected verifications`);
      console.error('Bulk action error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === verifications.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(verifications.map(user => user._id));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User Verifications</h1>
        <p className="text-gray-600">Manage user verification requests and status</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards - Aligned with Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Submitted</div>
          <div className="text-2xl font-bold text-blue-600">{stats.submitted || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="text-sm font-medium text-gray-500">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
        </div>
      </div>

      {/* Filter Tabs - Aligned with Stats Cards */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px grid grid-cols-4 gap-4">
            {['pending', 'submitted', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`py-3 px-4 border-b-2 font-medium text-sm text-center transition-all duration-200 ${
                  selectedStatus === status
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="capitalize">{status}</span>
                  <span className={`text-lg font-bold mt-1 ${
                    status === 'pending' ? 'text-yellow-600' :
                    status === 'submitted' ? 'text-blue-600' :
                    status === 'approved' ? 'text-green-600' :
                    'text-red-600'
                  }`}>
                    ({stats[status] || 0})
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Status-specific action buttons */}
        <div className="mt-4 flex gap-2">
          {selectedStatus === 'pending' && (
            <button
              onClick={() => setError('Pending users haven\'t submitted documents yet')}
              className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
            >
              📋 Manage Pending Requests ({selectedUsers.length} selected)
            </button>
          )}
          
          {selectedStatus === 'submitted' && (
            <>
              <button
                onClick={() => handleBulkAction('approved')}
                disabled={selectedUsers.length === 0 || processing}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                ✅ Bulk Approve ({selectedUsers.length})
              </button>
              <button
                onClick={() => handleBulkAction('rejected')}
                disabled={selectedUsers.length === 0 || processing}
                className="px-4 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                ❌ Bulk Reject ({selectedUsers.length})
              </button>
            </>
          )}
          
          {selectedStatus === 'approved' && (
            <button
              onClick={() => {
                const approvedData = verifications.filter(user => selectedUsers.includes(user._id));
                console.log('Exporting approved users:', approvedData);
                setError('Export functionality coming soon!');
              }}
              disabled={selectedUsers.length === 0}
              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              📊 Export Approved List ({selectedUsers.length})
            </button>
          )}
          
          {selectedStatus === 'rejected' && (
            <button
              onClick={() => handleBulkAction('approved')}
              disabled={selectedUsers.length === 0 || processing}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              🔄 Review Rejected ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      {/* Verifications Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Verifications
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading verifications...</p>
          </div>
        ) : verifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No {selectedStatus} verifications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === verifications.length && verifications.length > 0}
                      onChange={selectAllUsers}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {verifications.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => toggleUserSelection(user._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.verification?.status || 'pending')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.verification?.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => fetchUserDetails(user._id)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          👁️ View Details
                        </button>
                        
                        {/* Status-specific quick actions */}
                        {selectedStatus === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleVerificationAction(user._id, 'approved')}
                              disabled={processing}
                              className="text-green-600 hover:text-green-900 px-3 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleVerificationAction(user._id, 'rejected')}
                              disabled={processing}
                              className="text-red-600 hover:text-red-900 px-3 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        
                        {selectedStatus === 'rejected' && (
                          <button
                            onClick={() => handleVerificationAction(user._id, 'approved')}
                            disabled={processing}
                            className="text-yellow-600 hover:text-yellow-900 px-3 py-1 rounded bg-yellow-50 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                          >
                            🔄 Reconsider
                          </button>
                        )}
                        
                        {selectedStatus === 'approved' && (
                          <button
                            onClick={() => handleVerificationAction(user._id, 'rejected', 'Account flagged for review')}
                            disabled={processing}
                            className="text-orange-600 hover:text-orange-900 px-3 py-1 rounded bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
                          >
                            🚫 Revoke
                          </button>
                        )}
                        
                        {selectedStatus === 'pending' && (
                          <button
                            onClick={() => fetchUserDetails(user._id)}
                            className="text-purple-600 hover:text-purple-900 px-3 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                          >
                            📝 Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Verification Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                </div>

                {selectedUser.verification?.documents && (
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Submitted Documents</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.firstName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.lastName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Type</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.idType}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">ID Number</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.idNumber}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.verification.documents.address}</p>
                    </div>
                  </div>
                )}

                {selectedUser.verification?.status === 'submitted' && (
                  <div className="border-t pt-4">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleVerificationAction(selectedUser._id, 'approved')}
                        disabled={processing}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleVerificationAction(selectedUser._id, 'rejected')}
                        disabled={processing}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {processing ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Confirm Bulk Action</h3>
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to <strong className={bulkAction === 'approved' ? 'text-green-600' : 'text-red-600'}>
                    {bulkAction}
                  </strong> <strong>{selectedUsers.length}</strong> user verification{selectedUsers.length > 1 ? 's' : ''}?
                </p>
                <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={confirmBulkAction}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                    bulkAction === 'approved' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {processing ? 'Processing...' : `Confirm ${bulkAction === 'approved' ? 'Approve' : 'Reject'}`}
                </button>
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  disabled={processing}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerifications;
