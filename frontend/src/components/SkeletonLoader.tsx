import React from 'react';
import '../dashboard/Dashboard.css';

interface SkeletonLoaderProps {
  type?: 'profile' | 'table' | 'card' | 'attendance';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'card' }) => {
  if (type === 'profile') {
    return (
      <div className="skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-title pulse"></div>
          <div className="skeleton-subtitle pulse"></div>
        </div>
        <div className="profile-grid">
          <div className="profile-card skeleton-card">
            <div className="skeleton-avatar pulse"></div>
            <div className="skeleton-line pulse" style={{ width: '60%', marginTop: '0.5rem' }}></div>
            <div className="skeleton-line pulse" style={{ width: '45%' }}></div>
            <div className="skeleton-line pulse" style={{ width: '55%' }}></div>
          </div>
          <div className="profile-card skeleton-card">
            {[80, 65, 75, 50, 90, 60].map((w, i) => (
              <div key={i} className="skeleton-line pulse" style={{ width: `${w}%` }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'attendance') {
    return (
      <div className="skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-title pulse"></div>
          <div className="skeleton-subtitle pulse"></div>
        </div>
        <div className="skeleton-table">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton-table-row pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-title pulse"></div>
        </div>
        <div className="skeleton-table">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-table-row pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Default card grid
  return (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-title pulse"></div>
      </div>
      <div className="profile-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="profile-card skeleton-card" style={{ height: '120px' }}>
            <div className="skeleton-line pulse" style={{ width: '70%' }}></div>
            <div className="skeleton-line pulse" style={{ width: '40%' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};
