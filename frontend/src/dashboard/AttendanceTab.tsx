import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './AttendanceTab.css';

interface AttendanceTabProps {
  attendanceData: any[] | null;
  setAttendanceData: (data: any[]) => void;
  savedUsername?: string; // Used to auto-fill the netId
}

const RISK_THRESHOLD = 75;

const CalendarIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="10" width="34" height="30" rx="4" stroke="currentColor" strokeWidth="2" />
    <path d="M7 18h34" stroke="currentColor" strokeWidth="2" />
    <path d="M15 6v8M33 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="26" r="1.6" fill="currentColor" />
    <circle cx="24" cy="26" r="1.6" fill="currentColor" />
    <circle cx="32" cy="26" r="1.6" fill="currentColor" />
    <circle cx="16" cy="33" r="1.6" fill="currentColor" />
    <circle cx="24" cy="33" r="1.6" fill="currentColor" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="11" y="21" width="26" height="19" rx="4" stroke="currentColor" strokeWidth="2" />
    <path d="M16 21v-6a8 8 0 0 1 16 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="24" cy="30" r="2.4" fill="currentColor" />
  </svg>
);

const SyncIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    className={spinning ? 'att-spin' : ''}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3.2h-3.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData, setAttendanceData, savedUsername }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [initialSyncStarted, setInitialSyncStarted] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const username = savedUsername || '';
  const netId = username.split('@')[0] || '';

  useEffect(() => {
    // Password is now fetched securely from the backend DB.
  }, []);

  useEffect(() => {
    if (!initialSyncStarted && username) {
      setInitialSyncStarted(true);
      // Always try to auto-fetch. The backend will use the password securely from the DB.
      fetchAttendance();
    }
  }, [initialSyncStarted, username]);

  const submitCaptcha = async () => {
    if (!captchaInput || !username) return;
    try {
      await fetch('/api/attendance/solve', {
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

  const fetchAttendance = async () => {
    if (!username) {
      setError('Username is missing. Please log in again.');
      return;
    }

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      setLoading(true);
      setError(null);
      setInfoMsg(null);

      pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/attendance/status/${encodeURIComponent(username)}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) { }
      }, 2000);

      const token = localStorage.getItem('session_token');
      const res = await fetch('/api/sync_now/attendance', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
      });

      if (pollInterval) clearInterval(pollInterval);
      pollInterval = null;
      setCaptchaStatus({ pending: false, base64: null });

      const data = await res.json();
      if (res.status === 429) {
        setInfoMsg('Data is already up to date!');
        return;
      }
      
      if (data.success) {
        const attendance = Array.isArray(data.attendance) ? data.attendance : [];
        setAttendanceData(attendance);
        localStorage.setItem('academia_attendance', JSON.stringify(attendance));
        localStorage.setItem('academia_attendance_user', username);
        // Password is now securely stored in backend DB, do not save in localStorage
      } else {
        setError(data.error || 'Failed to connect to Student Portal');
        // Clear saved password if invalid
        if (data.error && data.error.includes('Password')) {
          // Password in DB is invalid
        }
      }
    } catch (err) {
      if (pollInterval) clearInterval(pollInterval);
      setCaptchaStatus({ pending: false, base64: null });
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
    await fetchAttendance();
  };

  const captchaModal = captchaStatus.pending && captchaStatus.base64 ? (
    <div className="att-modal-overlay">
      <div className="att-modal">
        <h3>Manual Captcha Required</h3>
        <p>Our automatic solver couldn't read this one. Please enter the text below to continue.</p>
        <div className="att-captcha-image">
          <img src={`data:image/png;base64,${captchaStatus.base64}`} alt="Captcha" />
        </div>
        <input
          type="text"
          className="att-input"
          placeholder="Enter captcha"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitCaptcha(); }}
          autoFocus
        />
        <button className="att-submit-btn" onClick={submitCaptcha} style={{ marginTop: '1rem' }}>
          Submit
        </button>
      </div>
    </div>
  ) : null;

  if (attendanceData ) {
    // Derived per-subject + overall stats
    const enriched = attendanceData.map((row) => {
      const attended = parseInt(row.attended) || 0;
      const total = parseInt(row.maxHours) || 0;
      const percentage = total > 0 ? (attended / total) * 100 : 0;
      const isRisk = percentage < RISK_THRESHOLD;

      let statusText = '';
      if (total === 0) {
        statusText = 'No classes yet';
      } else if (isRisk) {
        const required = Math.ceil((0.75 * total - attended) / 0.25);
        statusText = `Need ${required} class${required !== 1 ? 'es' : ''}`;
      } else {
        const margin = Math.floor(attended / 0.75 - total);
        statusText = `Can bunk ${margin} class${margin !== 1 ? 'es' : ''}`;
      }

      return { ...row, attended, total, percentage, isRisk, statusText };
    });

    const totalAttended = enriched.reduce((sum, r) => sum + r.attended, 0);
    const totalClasses = enriched.reduce((sum, r) => sum + r.total, 0);
    const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;
    const riskCount = enriched.filter((r) => r.isRisk).length;

    return (
      <div className="att-page">
        {captchaModal}

        <header className="att-header">
          <div className="att-heading">
            <span className="att-eyebrow">Academic Standing</span>
            <h1 className="att-title">My Attendance</h1>
            <p className="att-subtitle">
              {enriched.length} subject{enriched.length === 1 ? '' : 's'} tracked
              {riskCount > 0 ? ` · ${riskCount} need${riskCount === 1 ? 's' : ''} attention` : ' · all subjects in good standing'}
            </p>
          </div>

          {!loading && !infoMsg && (
            <button
              className="att-sync-btn"
              onClick={() => fetchAttendance()}
              disabled={loading}
            >
              <SyncIcon spinning={loading} />
              Sync again
            </button>
          )}
          {loading && (
             <span className="att-sync-btn" style={{opacity: 0.7}}>
                <SyncIcon spinning={true} />
                Syncing…
             </span>
          )}
        </header>

        {error && <div className="att-error">{error}</div>}
        {infoMsg && <div className="att-info" style={{
          background: 'rgba(45, 212, 191, 0.1)',
          border: '1px solid rgba(45, 212, 191, 0.3)',
          color: 'var(--teal, #2DD4BF)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {infoMsg}
        </div>}

        {enriched.length > 0 ? (
          <>
            <div className="att-stats">
              <div className="att-stat-card">
                <span className="att-stat-label">Overall</span>
                <span className={`att-stat-value ${overallPercentage < RISK_THRESHOLD ? 'att-stat-bad' : 'att-stat-good'}`}>
                  {overallPercentage.toFixed(1)}%
                </span>
                <span className="att-stat-hint">{totalAttended} present • {totalClasses - totalAttended} absent</span>
              </div>
              <div className="att-stat-card">
                <span className="att-stat-label">Subjects</span>
                <span className="att-stat-value">{enriched.length}</span>
                <span className="att-stat-hint">tracked this term</span>
              </div>
              <div className="att-stat-card">
                <span className="att-stat-label">At risk</span>
                <span className={`att-stat-value ${riskCount > 0 ? 'att-stat-bad' : 'att-stat-good'}`}>{riskCount}</span>
                <span className="att-stat-hint">below {RISK_THRESHOLD}%</span>
              </div>
              <div className="att-stat-card">
                <span className="att-stat-label">Safe</span>
                <span className="att-stat-value att-stat-good">{enriched.length - riskCount}</span>
                <span className="att-stat-hint">on track</span>
              </div>
            </div>

            <div className="att-card">
              <div className={`att-list ${loading ? 'att-list-syncing' : ''}`}>
                {enriched.map((row, idx) => (
                  <div key={idx} className={`att-row ${row.isRisk ? 'att-row-risk' : 'att-row-safe'}`}>
                    <div className="att-row-info">
                      <span className="att-row-title" title={row.title}>{row.title}</span>
                      <span className="att-row-code">{row.code}</span>
                    </div>

                    <div className="att-row-progress">
                      <div className="att-progress-track">
                        <div
                          className={`att-progress-fill ${row.isRisk ? 'att-fill-bad' : 'att-fill-good'}`}
                          style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                        />
                      </div>
                      <div className="att-progress-meta">
                        <div className="att-meta-stats">
                          <span className="att-stat-pill att-present">
                            <span className="att-pill-val">{row.attended}</span> Present
                          </span>
                          <span className="att-stat-pill att-absent">
                            <span className="att-pill-val">{row.total - row.attended}</span> Absent
                          </span>
                        </div>
                        <span className="att-req-text">{RISK_THRESHOLD}% required</span>
                      </div>
                    </div>

                    <div className="att-row-side">
                      <span className={`att-badge ${row.isRisk ? 'att-badge-bad' : 'att-badge-good'}`}>
                        {row.percentage.toFixed(1)}%
                      </span>
                      <span className={`att-row-status ${row.isRisk ? 'att-status-bad' : 'att-status-good'}`}>
                        {row.statusText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="att-empty">
            <div className="att-empty-icon">
              <CalendarIcon />
            </div>
            <h3>Attendance data is currently empty</h3>
            <p>Sync with the Student Portal to pull in your records.</p>
          </div>
        )}
      </div>
    );
  }

  // No attendance data yet — show skeleton if we are actively fetching
  if (loading) {
    return <SkeletonLoader type="attendance" />;
  }

  return (
    <div className="att-page">
      {captchaModal}
      <div className="att-login-wrap">
        <section className="att-login-card">
          <div className="att-login-icon">
            <LockIcon />
          </div>
          <h2 className="att-login-title">Student Portal Login</h2>

          {loading ? (
            <div className="att-loading-wrap">
              <LoadingScreen message="Connecting & Auto-solving Captcha..." />
            </div>
          ) : (
            <>
              <p className="att-login-copy">
                Attendance is hosted on the SRM Student Portal.<br />
                Enter your password once to enable automatic background syncs.
              </p>

              {error && <div className="att-error">{error}</div>}

              <form onSubmit={handleLogin}>
                <div className="att-input-group">
                  <label>NetID</label>
                  <input
                    type="text"
                    className="att-input"
                    value={netId}
                    disabled
                  />
                </div>

                <div className="att-input-group">
                  <label>Portal Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="att-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
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

                <button
                  type="submit"
                  className="att-submit-btn"
                  disabled={loading}
                >
                  Fetch Attendance
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AttendanceTab;