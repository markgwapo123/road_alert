import React from 'react';

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-icon">
          🚪
        </div>
        <div className="logout-title">
          Confirm Logout
        </div>
        <div className="logout-message">
          Are you sure you want to log out?
        </div>
        <div className="logout-actions">
          <button className="logout-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="logout-confirm-btn" onClick={onConfirm}>
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
