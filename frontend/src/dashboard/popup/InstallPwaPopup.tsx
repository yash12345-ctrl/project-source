import React, { useState, useEffect } from 'react';
import './InstallPwaPopup.css';

const InstallPwaPopup: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on mobile (screen width < 768px)
    if (window.innerWidth >= 768) {
      return; // Only show on mobile
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return; // Already installed, don't show
    }

    // Has user dismissed recently?
    const dismissed = localStorage.getItem('pwa_popup_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) {
      return; // Dismissed within the last week
    }

    // Android/Desktop PWA prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Slight delay to not interrupt initial dashboard load animation
      setTimeout(() => setShowPopup(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, just show it
    if (isIosDevice && !isStandalone) {
      setTimeout(() => setShowPopup(true), 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPopup(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Show iOS instruction
      alert('To install: tap the Share button at the bottom of Safari, then select "Add to Home Screen".');
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    localStorage.setItem('pwa_popup_dismissed', Date.now().toString());
  };

  if (!showPopup) return null;

  return (
    <div className="pwa-popup-overlay">
      <div className="pwa-popup-card">
        <button className="pwa-popup-close" onClick={handleDismiss} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="pwa-popup-content">
          <div className="pwa-popup-logo-wrapper">
            <img src="/logo.jpeg" alt="Academia App" className="pwa-popup-logo" />
            <div className="pwa-popup-logo-glow"></div>
          </div>
          
          <div className="pwa-popup-text">
            <h3>Premium App Experience</h3>
            <p>Install Academia to your home screen for instant access and a seamless native feel.</p>
          </div>
          
          <button className="pwa-popup-install-btn" onClick={handleInstallClick}>
            <span>Download Web App</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaPopup;
