import React from 'react';

const MaintenancePage = ({ message, scheduledEnd }) => {
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  const estimatedEnd = formatDate(scheduledEnd);

  return (
    <div className="maintenance-page">
      <div className="maintenance-container">
        <div className="maintenance-icon">
          🔧
        </div>
        <h1 className="maintenance-title">Under Maintenance</h1>
        <p className="maintenance-message">
          {message || 'We are currently performing scheduled maintenance. Please check back soon.'}
        </p>
        {estimatedEnd && (
          <div className="maintenance-schedule">
            <span className="schedule-label">Estimated completion:</span>
            <span className="schedule-time">{estimatedEnd}</span>
          </div>
        )}
        <div className="maintenance-info">
          <p>We apologize for the inconvenience. Our team is working hard to improve your experience.</p>
        </div>
        <button 
          className="maintenance-refresh-btn"
          onClick={() => window.location.reload()}
        >
          🔄 Check Again
        </button>
      </div>

      <style>{`
        .maintenance-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .maintenance-container {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          max-width: 450px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .maintenance-icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(-10px);
          }
        }

        .maintenance-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 15px;
        }

        .maintenance-message {
          font-size: 16px;
          color: #4a4a4a;
          line-height: 1.6;
          margin-bottom: 25px;
        }

        .maintenance-schedule {
          background: #f0f4ff;
          border-radius: 12px;
          padding: 15px 20px;
          margin-bottom: 20px;
        }

        .schedule-label {
          display: block;
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }

        .schedule-time {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #667eea;
        }

        .maintenance-info {
          background: #fff9e6;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 25px;
          text-align: left;
        }

        .maintenance-info p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .maintenance-refresh-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 30px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 50px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .maintenance-refresh-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .maintenance-refresh-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 480px) {
          .maintenance-container {
            padding: 30px 20px;
          }

          .maintenance-icon {
            font-size: 60px;
          }

          .maintenance-title {
            font-size: 24px;
          }

          .maintenance-message {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
