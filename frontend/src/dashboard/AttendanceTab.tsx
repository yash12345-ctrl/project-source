import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css'; // Reuse dashboard styles

interface AttendanceTabProps {
  attendanceData: any[] | null;
  setAttendanceData: (data: any[]) => void;
  savedUsername: string; // Used to auto-fill the netId
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ attendanceData, setAttendanceData, savedUsername }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialSyncStarted, setInitialSyncStarted] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');

  const netId = savedUsername.split('@')[0];

  useEffect(() => {
    let savedPortalPwd = localStorage.getItem('portal_password');
    if (savedPortalPwd) {
      setPassword(savedPortalPwd);
    }
  }, []);

  useEffect(() => {
    if (!attendanceData && !initialSyncStarted) {
      setInitialSyncStarted(true);
      let savedPortalPwd = localStorage.getItem('portal_password');
      if (savedPortalPwd) {
        fetchAttendance(savedPortalPwd);
      }
    }
  }, [attendanceData, initialSyncStarted]);

  const submitCaptcha = async () => {
    if (!captchaInput) return;
    try {
      await fetch('http://localhost:5000/api/attendance/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: netId, text: captchaInput })
      });
      setCaptchaStatus({ pending: false, base64: null });
      setCaptchaInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async (pwdToUse: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:5000/api/attendance/status/${netId}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) {}
      }, 2000);

      const finalPwd = pwdToUse || localStorage.getItem('portal_password') || '';
      const res = await fetch('http://localhost:5000/api/attendance/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, password: finalPwd })
      });
      
      clearInterval(pollInterval);
      setCaptchaStatus({ pending: false, base64: null });
      
      const data = await res.json();
      if (data.success) {
        setAttendanceData(data.attendance);
        localStorage.setItem('academia_attendance', JSON.stringify(data.attendance));
        localStorage.setItem('academia_attendance_user', savedUsername);
        localStorage.setItem('portal_password', pwdToUse);
      } else {
        setError(data.error || 'Failed to connect to Student Portal');
        // Clear saved password if invalid
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
    await fetchAttendance(password);
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

  if (attendanceData) {
    return (
      <div className="data-grid full-width">
        {captchaModal}
        <section className="data-card">
          <h2>My Attendance</h2>
          {error && (
            <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {attendanceData.length > 0 ? (
            <div className="table-responsive">
               <table className="timetable-matrix">
                 <thead>
                   <tr>
                     <th>Subject</th>
                     <th>Total Classes</th>
                     <th>Attended</th>
                     <th>Percentage</th>
                     <th>Status</th>
                   </tr>
                 </thead>
                 <tbody>
                    {attendanceData.map((row, idx) => {
                      const present = parseInt(row.attended) || 0;
                      const total = parseInt(row.maxHours) || 0;
                      const percentage = total > 0 ? (present / total) * 100 : 0;
                      const isLow = percentage < 75;

                      let statusText = '';
                      let statusColor = '';

                      if (isLow) {
                        const required = Math.ceil((0.75 * total - present) / 0.25);
                        statusText = `Need ${required} class${required !== 1 ? 'es' : ''}`;
                        statusColor = '#ef4444'; // Red
                      } else {
                        const margin = Math.floor(present / 0.75 - total);
                        statusText = `Can bunk ${margin} class${margin !== 1 ? 'es' : ''}`;
                        statusColor = '#10b981'; // Green
                      }

                      return (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{row.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.code}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>{row.maxHours}</td>
                          <td style={{ textAlign: 'center' }}>{row.attended}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`slot-badge ${isLow ? '' : 'success'}`} style={isLow ? { background: '#fee2e2', color: '#ef4444' } : {}}>
                              {row.percentage}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: statusColor, fontWeight: '500', fontSize: '0.9rem' }}>
                            {statusText}
                          </td>
                        </tr>
                      );
                    })}
                 </tbody>
               </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Attendance data is currently empty.</p>
            </div>
          )}
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={() => fetchAttendance(password)} className="primary-btn mt-3" disabled={loading}>
              {loading ? 'Syncing...' : 'Sync Again'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // No attendance data yet — show skeleton if we are actively fetching
  if (loading) {
    return <SkeletonLoader type="attendance" />;  
  }

  return (
    <div className="data-grid full-width" style={{ justifyContent: 'center', display: 'flex', marginTop: '2rem' }}>
      {captchaModal}
      <section className="data-card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Student Portal Login</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingScreen message="Connecting & Auto-solving Captcha..." />
          </div>
        ) : (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Attendance is hosted on the SRM Student Portal.<br/>
              Enter your password once to enable automatic background syncs.
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
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="primary-btn" 
                style={{ width: '100%', marginTop: '1.5rem', opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                Fetch Attendance
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

export default AttendanceTab;
