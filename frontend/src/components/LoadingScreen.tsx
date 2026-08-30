import React from 'react';
import { Lottie } from 'lottie-react';
import loadingAnimation from '../assets/loading.json';

interface LoadingScreenProps {
  message?: string;
  overlay?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...', overlay = false }) => {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      width: '100%'
    }}>
      <div style={{ width: 150, height: 150 }}>
        <Lottie 
          src={loadingAnimation} 
          loop={true} 
          autoplay={true} 
        />
      </div>
      {message && (
        <p style={{ 
          marginTop: '1rem', 
          color: 'var(--text)', 
          fontSize: '1.1rem',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-card)',
        opacity: 0.9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        borderRadius: '12px'
      }}>
        {content}
      </div>
    );
  }

  return content;
};
