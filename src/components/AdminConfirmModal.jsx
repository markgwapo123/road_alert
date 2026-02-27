import React from 'react';

const AdminConfirmModal = ({ isOpen, onClose, message, type = 'success' }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '✅';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      default:
        return 'Success';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {getTitle()}
          </h3>
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          <button
            onClick={onClose}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmModal;
