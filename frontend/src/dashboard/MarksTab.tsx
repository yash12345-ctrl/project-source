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

const MarksTab: React.FC<MarksTabProps> = ({ gradesData, setGradesData, cgpa, setCgpa, savedUsername }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialSyncStarted, setInitialSyncStarted] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const username = savedUsername || '';
  const netId = username.split('@')[0] || '';

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

  useEffect(() => {
    if (!initialSyncStarted && netId) {
      setInitialSyncStarted(true);
      let savedPortalPwd = localStorage.getItem('portal_password');
      if (savedPortalPwd) {
        setPassword(savedPortalPwd);
        fetchGrades(savedPortalPwd);
      }
    }
  }, [initialSyncStarted, netId]);

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

  const fetchGrades = async (pwdToUse: string) => {
    if (!username) {
      setError('Username is missing. Please log in again.');
      return;
    }

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      setLoading(true);
      setError(null);

      pollInterval = setInterval(async () => {
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
        body: JSON.stringify({ username, password: pwdToUse })
      });

      if (pollInterval) clearInterval(pollInterval);
      pollInterval = null;
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
      if (pollInterval) clearInterval(pollInterval);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your portal password.');
      return;
    }
    await fetchGrades(password);
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

  if (gradesData ) {
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
              onClick={() => fetchGrades(password)}
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

  // =========================
  // LOGIN SCREEN
  // =========================

  return (
    <div className="marks-tab marks-tab-centered">
      {captchaModal}

      <section className="marks-login-card">
        <span className="marks-eyebrow marks-login-eyebrow">Student Portal</span>
        <h2 className="marks-login-title">Portal Login</h2>

        {loading ? (
          <div className="marks-loading-wrap">
            <LoadingScreen message="Fetching your grades..." />
          </div>
        ) : (
          <>
            <p className="marks-login-copy">
              Grades are hosted on the SRM Student Portal.
              <br />
              Enter your password to fetch your marks.
            </p>

            {error && (
              <div className="marks-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="marks-input-group">
                <label>NetID</label>
                <input
                  type="text"
                  className="marks-login-input marks-login-input-disabled"
                  value={netId}
                  disabled
                />
              </div>

              <div className="marks-input-group">
                <label>Portal Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="marks-login-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoFocus
                    style={{ paddingRight: '40px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted, #757D8F)', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="marks-primary-btn marks-login-submit">
                Login to Portal
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

export default MarksTab;