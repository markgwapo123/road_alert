import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Animation timeline (extended by 3 seconds)
    const timers = [
      // 3.3s - Pin drop and ripple
      setTimeout(() => setAnimationPhase(1), 3300),
      // 3.8s - Text slide in
      setTimeout(() => setAnimationPhase(2), 3800),
      // 4.5s - Mockup fade in
      setTimeout(() => setAnimationPhase(3), 4500),
      // 5.2s - Map background
      setTimeout(() => setAnimationPhase(4), 5200),
      // 5.5s - Tagline
      setTimeout(() => setAnimationPhase(5), 5500),
      // 5.8s - Fade out and transition
      setTimeout(() => {
        setAnimationPhase(6);
        setTimeout(onComplete, 500); // Wait for fade out to complete
      }, 5800),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [onComplete]);

  return (
    <div className={`splash-screen ${animationPhase === 6 ? 'fade-out' : ''}`}>
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
          <span className="brand-part brand-dalan">Dalan</span>
          <span className="brand-part brand-ph">Ph</span>
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
      </div>
    </div>
  );
};

export default SplashScreen;
