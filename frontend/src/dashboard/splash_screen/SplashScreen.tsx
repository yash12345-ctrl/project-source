import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  theme?: 'light' | 'dark';
}

const SplashScreen: React.FC<SplashScreenProps> = ({ theme = 'dark' }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    "Initializing Secure Environment...",
    "Establishing secure connection...",
    "Bypassing portal security...",
    "Fetching profile data...",
    "Syncing courses and timetable...",
    "Almost there, finalizing data..."
  ];

  useEffect(() => {
    // Simulate progress that slows down as it approaches 99
    const interval = setInterval(() => {
      setProgress((prev) => {
        let increment = 0;
        if (prev < 30) increment = Math.random() * 12;
        else if (prev < 60) increment = Math.random() * 6;
        else if (prev < 85) increment = Math.random() * 2;
        else if (prev < 95) increment = Math.random() * 0.8;
        else if (prev < 99.5) increment = Math.random() * 0.2;
        
        return Math.min(prev + increment, 99.9);
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Cycle through messages while waiting
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, 2500);

    return () => clearInterval(msgInterval);
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
        <div className="splash-subtitle-wrapper">
          <p className="splash-subtitle" style={{ animation: 'fadeInOut 2.5s ease-in-out infinite alternate' }}>
            {messages[messageIndex]}
          </p>
        </div>

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
          {progress >= 99 ? '99' : Math.floor(progress)}%
        </div>
      </div>
      
      {/* Background Orbs for Premium feel */}
      <div className="splash-orb splash-orb-1"></div>
      <div className="splash-orb splash-orb-2"></div>
    </div>
  );
};

export default SplashScreen;
