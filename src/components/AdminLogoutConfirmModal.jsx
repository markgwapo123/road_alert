import React from 'react';

const AdminLogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">
            🚪
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Confirm Logout
          </h3>
          <p className="text-gray-600 mb-6 text-lg">
            Are you sure you want to log out?
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogoutConfirmModal;
