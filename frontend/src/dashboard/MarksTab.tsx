import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';
import './MarksTab.css';

interface MarksTabProps {
  gradesData: any[] | null; // This is now an array of semesters
  setGradesData: (data: any[]) => void;
  cgpa: string | null;
  setCgpa: (cgpa: string) => void;
  savedUsername?: string;
  isBackgroundSyncing?: boolean;
}

// =========================
// GRADE → TONE MAPPING
// =========================

const gradeTone = (grade: string): 'good' | 'warn' | 'low' => {
  const g = (grade || '').trim().toUpperCase();

  if (['O', 'A+', 'A', 'S'].includes(g)) return 'good';
  if (['B+', 'B', 'C+', 'C'].includes(g)) return 'warn';
  return 'low';
};

const MarksTab: React.FC<MarksTabProps> = ({ gradesData, setGradesData, cgpa, setCgpa, savedUsername, isBackgroundSyncing }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');

  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const username = savedUsername || '';

  // =========================
  // ACTIVE SEMESTER (TAB) STATE
  // =========================

  const [activeSemIdx, setActiveSemIdx] = useState(0);

  // Keep the selected tab valid whenever gradesData changes (e.g. after a sync)
  useEffect(() => {
    if (gradesData && gradesData.length > 0) {
      setActiveSemIdx(prev => (prev < gradesData.length ? prev : gradesData.length - 1));
    }
  }, [gradesData]);

  // Auto-fetch is handled in background by Dashboard.tsx.

  const submitCaptcha = async () => {
    if (!captchaInput || !username) return;
    try {
      await fetch('/api/grades/solve', {
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

  const fetchGrades = async (pwdToUse: string, isManual: boolean = false) => {
    if (!username) {
      setError('Username is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/grades/status/${encodeURIComponent(username)}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) { }
      }, 2000);

      const res = await fetch('/api/grades/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password: pwdToUse,
          forceSync: isManual,
          manual: isManual
        })
      });

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setCaptchaStatus({ pending: false, base64: null });

      const data = await res.json();
      if (data.success) {
        const semesters = Array.isArray(data.semesters) ? data.semesters : [];
        setGradesData(semesters);
        setCgpa(data.cgpa || '');
        localStorage.setItem('academia_grades', JSON.stringify(semesters));
        localStorage.setItem('academia_grades_user', username);
        if (data.cgpa) localStorage.setItem('academia_cgpa', data.cgpa);
        localStorage.setItem('portal_password', pwdToUse);
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

  // We no longer need the password field here.
  const handleManualSync = async () => {
    await fetchGrades('', true);
  };

  // =========================
  // CAPTCHA MODAL
  // =========================

  const captchaModal = captchaStatus.pending && captchaStatus.base64 ? (
    <div className="marks-modal-overlay">
      <div className="marks-modal">
        <span className="marks-modal-eyebrow">Verification Required</span>
        <h3 className="marks-modal-title">Manual Captcha</h3>
        <p className="marks-modal-copy">
          Our automatic solver couldn't read this one. Enter the text shown below to continue.
        </p>

        <div className="marks-captcha-image">
          <img src={`data:image/png;base64,${captchaStatus.base64}`} alt="Captcha" />
        </div>

        <input
          type="text"
          className="marks-login-input"
          placeholder="Enter captcha text"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitCaptcha(); }}
          autoFocus
        />

        <button className="marks-primary-btn" onClick={submitCaptcha}>
          Submit
        </button>
      </div>
    </div>
  ) : null;

  // =========================
  // GRADES LOADED
  // =========================

  const isAuthError = error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('credential'));

  if (gradesData && !isAuthError) {
    return (
      <div className="marks-tab">
        {captchaModal}

        <div className="marks-header">
          <div className="marks-header-heading">
            <span className="marks-eyebrow">Academic Record</span>
            <h2 className="marks-title">Grades &amp; Marks</h2>
          </div>

          {cgpa && (
            <div className="marks-cgpa-chip">
              <span className="marks-cgpa-value">{cgpa}</span>
              <span className="marks-cgpa-caption">CGPA</span>
            </div>
          )}
        </div>

        {gradesData.length > 0 ? (
          <>
            {/* SEMESTER TABS — pick a semester instead of scrolling through all */}

            {gradesData.length > 1 && (
              <div className="marks-sem-tabs" role="tablist">
                {gradesData.map((semesterBlock, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    role="tab"
                    aria-selected={activeSemIdx === sIdx}
                    className={`marks-sem-tab ${activeSemIdx === sIdx ? 'active' : ''}`}
                    onClick={() => setActiveSemIdx(sIdx)}
                  >
                    <span className="marks-sem-tab-label">
                      Sem {semesterBlock.semester}
                    </span>

                    {semesterBlock.sgpa && (
                      <span className="marks-sem-tab-sgpa">
                        {semesterBlock.sgpa}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {gradesData[activeSemIdx] && (
              <div
                key={activeSemIdx}
                className="marks-semester-card"
              >
                <div className="marks-semester-header">
                  <h3 className="marks-semester-title">
                    Semester {gradesData[activeSemIdx].semester}
                  </h3>

                  {gradesData[activeSemIdx].sgpa && (
                    <span className="marks-sgpa-badge">
                      SGPA {gradesData[activeSemIdx].sgpa}
                    </span>
                  )}
                </div>

                <div className="marks-list">
                  {gradesData[activeSemIdx].courses.map((row: any, idx: number) => (
                    <div key={idx} className="marks-row">
                      <div className="marks-row-info">
                        <span className="marks-row-title">{row.description}</span>
                        <div className="marks-row-meta">
                          <span className="marks-row-code">{row.code}</span>
                          <span className="marks-row-credit">{row.credit} Credits</span>
                        </div>
                      </div>

                      <div className="marks-row-side">
                        <span className="marks-row-month">{row.monthYear}</span>
                        <span className={`marks-grade-badge tone-${gradeTone(row.grade)}`}>
                          {row.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="marks-empty-state">
            <p>No grades found.</p>
            <button
              onClick={() => fetchGrades('', true)}
              className="marks-primary-btn"
              disabled={loading}
            >
              {loading ? 'Syncing…' : 'Retry Sync'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================
  // NO DATA YET — SKELETON
  // =========================

  if (loading) {
    return <SkeletonLoader type="table" />;
  }

  if (!gradesData || gradesData.length === 0) {
    if (isBackgroundSyncing) {
      return (
        <div className="marks-tab marks-tab-centered">
          <SkeletonLoader type="table" />
        </div>
      );
    }
    return (
      <div className="marks-tab marks-tab-centered">
        {captchaModal}
        <section className="marks-login-card">
          <h2 className="marks-login-title">Data Not Found</h2>
          {loading ? (
            <div className="marks-loading-wrap">
              <LoadingScreen message="Fetching your grades..." />
            </div>
          ) : (
            <>
              <p className="marks-login-copy">
                Your grades couldn't be loaded automatically. Click below to try fetching them again.
              </p>
              {error && (
                <div className="marks-error">
                  {error}
                </div>
              )}
              <button type="button" className="marks-primary-btn marks-login-submit" onClick={handleManualSync}>
                Sync Now
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  // =========================
  // LOGIN SCREEN (Removed, only "Data Not Found" block above remains for empty data)
  // =========================

  return null;
};

export default MarksTab;