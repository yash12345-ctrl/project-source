import React from 'react';
import './ComingSoon.css';

interface ComingSoonProps {
  featureName?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ featureName }) => {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-content">
        <div className="coming-soon-icon-wrapper">
          <svg
            className="coming-soon-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21 16-4 4-4-4" />
            <path d="M17 20V4" />
            <path d="m3 8 4-4 4 4" />
            <path d="M7 4v16" />
          </svg>
          <div className="coming-soon-glow"></div>
        </div>
        
        <h1 className="coming-soon-title">
          {featureName ? featureName : 'Feature'} <span className="highlight-text">Coming Soon</span>
        </h1>
        
        <p className="coming-soon-description">
          We're working hard to bring you this feature. It will be available in an upcoming update. 
          Stay tuned for something extraordinary!
        </p>

        <div className="coming-soon-badge">
          <span className="badge-dot"></span>
          In Development
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
