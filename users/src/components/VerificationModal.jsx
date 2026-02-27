import React from 'react';

const VerificationModal = ({ isOpen, onClose, onVerify }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="verification-modal">
        <div className="modal-header">
          <h2>⚠️ Account Verification Required</h2>
        </div>
        
        <div className="modal-content">
          <p>You need to verify your account before you can view your personal reports.</p>
          <p>Please complete the verification process to access this feature.</p>
        </div>
        
        <div className="modal-actions">
          <button className="verify-btn" onClick={onVerify}>
            Verify Account
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
