import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Animation timeline (extended by 3 seconds + loading phase + initial white screen)
    const timers = [
      // 0.5s - Start white screen (already white by default)
      // 2.0s - Pin drop and ripple (after 1.5s white screen)
      setTimeout(() => setAnimationPhase(1), 2000),
      // 2.5s - Text slide in
      setTimeout(() => setAnimationPhase(2), 2500),
      // 3.2s - Mockup fade in
      setTimeout(() => setAnimationPhase(3), 3200),
      // 3.9s - Map background
      setTimeout(() => setAnimationPhase(4), 3900),
      // 4.2s - Tagline
      setTimeout(() => setAnimationPhase(5), 4200),
      // 4.5s - Loading phase
      setTimeout(() => setAnimationPhase(6), 4500),
      // 6.2s - Fade out and transition (after 1.7s loading)
      setTimeout(() => {
        setAnimationPhase(7);
        setTimeout(onComplete, 500); // Wait for fade out to complete
      }, 6200),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [onComplete]);

  return (
    <div className={`splash-screen ${animationPhase === 7 ? 'fade-out' : ''}`}>
      {/* Map Background */}
      <div className={`map-background ${animationPhase >= 4 ? 'visible' : ''}`}>
        <div className="map-grid"></div>
        <div className="route-lines">
          <div className="route-line route-line-1"></div>
          <div className="route-line route-line-2"></div>
          <div className="route-line route-line-3"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="splash-content">
        {/* Location Pin */}
        <div className={`pin-container ${animationPhase >= 1 ? 'drop' : ''}`}>
          <div className={`ripple ${animationPhase >= 1 ? 'expand' : ''}`}></div>
          <img 
            src="/locationfinal.png" 
            alt="Location Pin" 
            className="location-pin"
          />
        </div>

        {/* DalanPh Text */}
        <div className={`brand-text ${animationPhase >= 2 ? 'visible' : ''}`}>
          <span className="brand-part brand-dalan">Dalan</span><span className="brand-part brand-ph">Ph</span>
        </div>

        {/* Mockup */}
        <div className={`mockup-container ${animationPhase >= 3 ? 'visible' : ''}`}>
          <img 
            src="/mockup-laptop-phone.png" 
            alt="DalanPh App" 
            className="mockup-image"
          />
        </div>

        {/* Tagline */}
        <div className={`tagline ${animationPhase >= 5 ? 'visible' : ''}`}>
          <p className="tagline-text">
            Smart <span className="highlight">Mapping</span>.
            Better <span className="highlight">Decisions</span>.
          </p>
        </div>

        {/* Loading Indicator */}
        <div className={`loading-indicator ${animationPhase >= 6 ? 'visible' : ''}`}>
          <div className="loading-dot loading-dot-1"></div>
          <div className="loading-dot loading-dot-2"></div>
          <div className="loading-dot loading-dot-3"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
