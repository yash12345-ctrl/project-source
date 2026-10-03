import React, { useState, useEffect, useMemo } from 'react';

import { LoadingScreen } from '../../components/LoadingScreen';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import '../Dashboard.css';
import './FeeTab.css';

interface FeeTabProps {
  feeData: any | null;
  setFeeData: (data: any) => void;
  savedUsername?: string;
  isBackgroundSyncing?: boolean;
}

type FeeSectionKey = 'feeDetails' | 'paymentLog' | 'pendingExam';

const SECTION_META: Record<FeeSectionKey, { label: string; short: string }> = {
  feeDetails: { label: 'Fee Details', short: 'Fees' },
  paymentLog: { label: 'Payment Transaction Log', short: 'Payments' },
  pendingExam: { label: 'Pending Exam Fee Status', short: 'Pending' },
};

const FeeTab: React.FC<FeeTabProps> = ({ feeData, setFeeData, savedUsername, isBackgroundSyncing }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');
  const [activeSection, setActiveSection] = useState<FeeSectionKey>('feeDetails');

  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const username = savedUsername || '';

  useEffect(() => {
    // Handled by backend
  }, []);

  // Auto-fetch is handled in background by Dashboard.tsx.

  // Land on the first section that actually has data once it arrives
  useEffect(() => {
    if (!feeData) return;

    const order: FeeSectionKey[] = ['feeDetails', 'paymentLog', 'pendingExam'];
    const firstWithData = order.find(
      key => feeData[key]?.rows && feeData[key].rows.length > 0
    );

    if (firstWithData) {
      setActiveSection(firstWithData);
    }
  }, [feeData]);

  const submitCaptcha = async () => {
    if (!captchaInput || !username) return;
    try {
      await fetch('/api/fees/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, text: captchaInput })
      });
      setCaptchaStatus({ pending: false, base64: null });
      setCaptchaInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFees = async (pwdToUse: string, isManual: boolean = false) => {
    if (!username) {
      setError('Username is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/fees/status/${encodeURIComponent(username)}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) { }
      }, 2000);

      const finalPwd = pwdToUse || localStorage.getItem('portal_password');

      const res = await fetch('/api/fees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password: finalPwd,
          forceSync: isManual,
          manual: isManual
        })
      });

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setCaptchaStatus({ pending: false, base64: null });

      const data = await res.json();
      if (data.success) {
        setFeeData(data);
        localStorage.setItem('academia_fees', JSON.stringify(data));
        localStorage.setItem('academia_fees_user', username);
        localStorage.setItem('portal_password', finalPwd || '');
      } else {
        setError(data.error || 'Failed to connect to Student Portal');
        if (data.error && data.error.includes('Password')) {
          localStorage.removeItem('portal_password');
        }
      }
    } catch (err) {
      setError('Network error connecting to Student Portal');
    } finally {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    await fetchFees('', true);
  };

  // =========================
  // CAPTCHA MODAL
  // =========================

  const captchaModal = captchaStatus.pending && captchaStatus.base64 ? (
    <div className="fee-modal-overlay">
      <div className="fee-modal">
        <span className="fee-modal-eyebrow">Verification Required</span>
        <h3 className="fee-modal-title">Manual Captcha</h3>
        <p className="fee-modal-copy">
          Our automatic solver couldn't read this one. Enter the text shown below to continue.
        </p>

        <div className="fee-captcha-image">
          <img src={`data:image/png;base64,${captchaStatus.base64}`} alt="Captcha" />
        </div>

        <input
          type="text"
          className="fee-login-input"
          placeholder="Enter captcha text"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitCaptcha(); }}
          autoFocus
        />

        <button className="fee-primary-btn" onClick={submitCaptcha}>
          Submit
        </button>
      </div>
    </div>
  ) : null;

  // =========================
  // SECTIONS WITH COUNTS (for tab badges)
  // =========================

  const sectionCounts = useMemo(() => {
    if (!feeData) return { feeDetails: 0, paymentLog: 0, pendingExam: 0 };

    return {
      feeDetails: feeData.feeDetails?.rows?.length || 0,
      paymentLog: feeData.paymentLog?.rows?.length || 0,
      pendingExam: feeData.pendingExam?.rows?.length || 0,
    };
  }, [feeData]);

  const renderReceiptTable = (key: FeeSectionKey) => {
    const section = feeData?.[key];

    if (!section || !section.rows || section.rows.length === 0) {
      return (
        <div className="fee-empty-section">
          No {SECTION_META[key].label.toLowerCase()} available.
        </div>
      );
    }

    return (
      <div className="fee-cards-container">
        {section.rows.map((row: string[], idx: number) => (
          <div key={idx} className="fee-receipt-card">
            <div className="fee-receipt-notch fee-receipt-notch-top" />
            
            <div className="fee-card-content">
              {row.map((cell, cIdx) => {
                const header = section.headers[cIdx];
                if (!header || !cell || cell.trim() === '') return null;
                
                return (
                  <div key={cIdx} className="fee-data-row">
                    <div className="fee-data-label">{header}</div>
                    <div className="fee-data-value">{cell}</div>
                  </div>
                );
              })}
            </div>

            <div className="fee-receipt-notch fee-receipt-notch-bottom" />
          </div>
        ))}
      </div>
    );
  };

  // =========================
  // FEE DATA LOADED
  // =========================

  const isAuthError = error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('credential'));

  if (feeData && !isAuthError) {
    return (
      <div className="fee-tab">
        {captchaModal}

        <div className="fee-header">
          <div className="fee-header-heading">
            <span className="fee-eyebrow">Student Portal</span>
            <h2 className="fee-title">Fee Payment Details</h2>
          </div>

          <button
            onClick={() => fetchFees('', true)}
            className="fee-sync-btn"
            disabled={loading}
          >
            {loading ? 'Syncing…' : 'Sync Again'}
          </button>
        </div>

        {error && <p className="fee-error">{error}</p>}

        {/* SECTION TABS — pick a section instead of scrolling through all three */}

        <div className="fee-section-tabs" role="tablist">
          {(Object.keys(SECTION_META) as FeeSectionKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeSection === key}
              className={`fee-section-tab ${activeSection === key ? 'active' : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <span className="fee-section-tab-label">
                {SECTION_META[key].short}
              </span>

              <span className="fee-section-tab-count">
                {sectionCounts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="fee-section-panel">
          <h3 className="fee-section-title">
            {SECTION_META[activeSection].label}
          </h3>

          {renderReceiptTable(activeSection)}
        </div>
      </div>
    );
  }

  // =========================
  // NO DATA YET — SKELETON
  // =========================

  if (isBackgroundSyncing) {
    return <SkeletonLoader type="table" />;
  }

  // =========================
  // DATA NOT FOUND SCREEN
  // =========================

  return (
    <div className="fee-tab fee-tab-centered">
      {captchaModal}

      <section className="fee-login-card">
        <h2 className="fee-login-title">Data Not Found</h2>

        {loading ? (
          <div className="fee-loading-wrap">
            <LoadingScreen message="Fetching your fees..." />
          </div>
        ) : (
          <>
            <p className="fee-login-copy">
              Fee records couldn't be loaded automatically. Click below to try fetching them again.
            </p>

            {error && (
              <div className="fee-error fee-error-centered">
                {error}
              </div>
            )}

            <button type="button" className="fee-primary-btn fee-login-submit" onClick={handleManualSync}>
              Sync Now
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default FeeTab;