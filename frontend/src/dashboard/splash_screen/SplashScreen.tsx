import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  theme?: 'light' | 'dark';
}

const SplashScreen: React.FC<SplashScreenProps> = ({ theme = 'dark' }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress for the splash screen
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Random increment to make it feel "real"
        const increment = Math.random() * 15;
        return Math.min(prev + increment, 99); // max 99 until actually done
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`splash-screen-container ${theme}`}>
      <div className="splash-screen-content">
        {/* Source Code Logo */}
        <div className="splash-logo-container">
          <svg
            className="splash-logo"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Hexagon / Shape */}
            <path
              d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinejoin="round"
              className="logo-outline"
            />
            {/* Inner < / > */}
            <path
              d="M40 35L25 50L40 65M60 35L75 50L60 65M55 25L45 75"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="logo-code"
            />
          </svg>
          <div className="logo-glow"></div>
        </div>

        <h1 className="splash-title">
          <span className="gradient-text">Academia</span>
        </h1>
        <p className="splash-subtitle">Initializing Secure Environment...</p>

        {/* Premium Progress Bar */}
        <div className="splash-progress-container">
          <div 
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          >
            <div className="splash-progress-glow"></div>
          </div>
        </div>
        <div className="splash-progress-text">
          {Math.floor(progress)}%
        </div>
      </div>
      
      {/* Background Orbs for Premium feel */}
      <div className="splash-orb splash-orb-1"></div>
      <div className="splash-orb splash-orb-2"></div>
    </div>
  );
};

export default SplashScreen;
