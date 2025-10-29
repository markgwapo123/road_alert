import React from 'react';

const ReminderPage = ({ onNext }) => {
  return (
    <div className="reminder-page">
      <div className="reminder-container">
        <div className="reminder-content">
          {/* Mockup Image */}
          <div className="reminder-image">
            <img 
              src="/mockup-laptop-phone.png" 
              alt="Road Alert Platform" 
              className="mockup-img"
            />
          </div>

          {/* Logo and Title */}
          <div className="reminder-logo">
            <span className="location-icon">📍</span>
            <h1 className="reminder-title">
              <span className="brand-name">Road</span> <span className="brand-suffix">Alert</span>
            </h1>
          </div>

          {/* Features List */}
          <div className="reminder-features">
            <div className="feature-item">
              <div className="feature-icon">📍</div>
              <div className="feature-text">
                <h3>1. Discover alert</h3>
                <p>Explore your location for instant road alerts</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">⚠️</div>
              <div className="feature-text">
                <h3>2. Alert</h3>
                <p>Quickly report any road hazard with photo</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🔔</div>
              <div className="feature-text">
                <h3>3. Stay updated</h3>
                <p>Get real-time updates on road conditions</p>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <button className="reminder-next-btn" onClick={onNext}>
            NEXT
          </button>

          {/* Skip Link */}
          <button className="reminder-skip-btn" onClick={onNext}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderPage;
