import React, { useEffect } from 'react';

const ConfirmationModal = ({ isOpen, onClose, message, type = 'success', autoCloseDelay = 2000 }) => {
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '✅';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-icon">
          {getIcon()}
        </div>
        <div className="confirmation-message">
          {message}
        </div>
        <button className="confirmation-close-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;
