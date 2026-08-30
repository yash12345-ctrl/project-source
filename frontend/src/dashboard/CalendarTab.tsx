import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';

interface CalendarTabProps {
  calendarData: any | null;
  setCalendarData: (data: any) => void;
  savedUsername: string;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ calendarData, setCalendarData, savedUsername }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialSyncStarted, setInitialSyncStarted] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');

  const netId = savedUsername?.split('@')[0] || '';

  useEffect(() => {
    let savedPortalPwd = localStorage.getItem('portal_password');
    if (savedPortalPwd) {
      setPassword(savedPortalPwd);
    }
  }, []);

  useEffect(() => {
    if (!calendarData && !initialSyncStarted && netId) {
      setInitialSyncStarted(true);
      let savedPortalPwd = localStorage.getItem('portal_password');
      if (savedPortalPwd) {
        fetchCalendar(savedPortalPwd);
      }
    }
  }, [calendarData, initialSyncStarted, netId]);

  const submitCaptcha = async () => {
    if (!captchaInput) return;
    try {
      await fetch('http://localhost:5000/api/calendar/captcha/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: netId, captchaText: captchaInput })
      });
      setCaptchaStatus({ pending: false, base64: null });
      setCaptchaInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async (pwdToUse: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:5000/api/calendar/status/${netId}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) {}
      }, 2000);

      const finalPwd = pwdToUse || localStorage.getItem('portal_password') || '';
      
      const res = await fetch('http://localhost:5000/api/calendar/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, password: finalPwd })
      });
      
      clearInterval(pollInterval);
      setCaptchaStatus({ pending: false, base64: null });
      
      const data = await res.json();
      if (data.success) {
        setCalendarData(data);
        localStorage.setItem('academia_calendar', JSON.stringify(data));
        localStorage.setItem('portal_password', finalPwd);
      } else {
        setError(data.error || 'Failed to connect to Student Portal');
        if (data.error && data.error.includes('Password')) {
          localStorage.removeItem('portal_password');
        }
      }
    } catch (err) {
      setError('Network error connecting to Student Portal');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your portal password.');
      return;
    }
    await fetchCalendar(password);
  };

  const captchaModal = captchaStatus.pending && captchaStatus.base64 ? (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '400px', width: '90%'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e293b' }}>Manual Captcha Required</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Our automatic solver couldn't read this one. Please enter the text below to continue.
        </p>
        <div style={{ textAlign: 'center', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
          <img src={`data:image/png;base64,${captchaStatus.base64}`} alt="Captcha" style={{ maxWidth: '100%' }} />
        </div>
        <input 
          type="text" 
          className="login-input" 
          placeholder="Enter captcha"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitCaptcha(); }}
          autoFocus
        />
        <button className="primary-btn" onClick={submitCaptcha} style={{ width: '100%', marginTop: '1rem' }}>
          Submit
        </button>
      </div>
    </div>
  ) : null;

  if (calendarData) {
    return (
      <div className="data-grid full-width">
        <section className="data-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>Academic Calendar</h2>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
              <h3>Working Days</h3>
              <div className="stat-value" style={{ color: '#1e40af' }}>{calendarData.stats?.workingDays || '0'}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: '1px solid #fecaca' }}>
              <h3>Holidays</h3>
              <div className="stat-value" style={{ color: '#991b1b' }}>{calendarData.stats?.holidays || '0'}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
              <h3>Total Days</h3>
              <div className="stat-value" style={{ color: '#166534' }}>{calendarData.stats?.totalDays || '0'}</div>
            </div>
          </div>
          
          <div className="table-responsive" style={{ marginTop: '2rem' }}>
            <table className="timetable-matrix">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Week</th>
                  <th>Day Order</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {calendarData.rows && calendarData.rows.length > 0 ? (
                  calendarData.rows.map((row: any, idx: number) => {
                    const isHoliday = row.status?.toLowerCase().includes('holiday');
                    const isWorkingDay = row.status?.toLowerCase().includes('working day');
                    
                    let statusBadgeColor = '#e2e8f0';
                    let statusTextColor = '#475569';
                    if (isHoliday) {
                      statusBadgeColor = '#fee2e2';
                      statusTextColor = '#ef4444';
                    } else if (isWorkingDay) {
                      statusBadgeColor = '#dbeafe';
                      statusTextColor = '#3b82f6';
                    }

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 500, color: '#0f172a' }}>{row.date}</td>
                        <td>{row.day}</td>
                        <td>
                          <span style={{ 
                            background: statusBadgeColor, 
                            color: statusTextColor, 
                            padding: '4px 10px', 
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontSize: '0.9rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                            {row.week}
                          </span>
                        </td>
                        <td>
                          {row.dayOrder && row.dayOrder !== '-' ? (
                            <span style={{ color: '#10b981', fontWeight: 600, background: '#d1fae5', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>
                              {row.dayOrder}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.95rem' }}>{row.remarks || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No calendar data available for the current term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={() => fetchCalendar(password)} className="primary-btn mt-3" disabled={loading}>
              {loading ? 'Syncing...' : 'Sync Again'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // No data yet — show skeleton while loading
  if (loading) {
    return <SkeletonLoader type="table" />;
  }

  return (
    <div className="data-grid full-width" style={{ justifyContent: 'center', display: 'flex', marginTop: '2rem' }}>
      {captchaModal}
      <section className="data-card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Academic Calendar</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingScreen message="Connecting & Auto-solving Captcha..." />
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Grades are hosted on the SRM Student Portal.<br/>
              Enter your password to fetch your marks.
            </p>
            
            {error && (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>NetID</label>
                <input 
                  type="text" 
                  className="login-input"
                  value={netId} 
                  disabled 
                  style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
              
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Portal Password</label>
                <input 
                  type="password" 
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoFocus
                />
              </div>
              
              <button type="submit" className="primary-btn" style={{ width: '100%', marginTop: '1rem' }}>
                Login to Portal
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

export default CalendarTab;
