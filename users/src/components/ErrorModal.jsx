import React from 'react';

const ErrorModal = ({ isOpen, onClose, message, title = 'Error' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="error-modal" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal-icon">
          ❌
        </div>
        <div className="error-modal-title">
          {title}
        </div>
        <div className="error-modal-message">
          {message}
        </div>
        <button className="error-modal-close-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
