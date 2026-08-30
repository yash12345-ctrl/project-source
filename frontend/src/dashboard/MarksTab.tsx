import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';

interface MarksTabProps {
  gradesData: any[] | null; // This is now an array of semesters
  setGradesData: (data: any[]) => void;
  cgpa: string | null;
  setCgpa: (cgpa: string) => void;
  savedUsername: string;
}

const MarksTab: React.FC<MarksTabProps> = ({ gradesData, setGradesData, cgpa, setCgpa, savedUsername }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [initialSyncStarted, setInitialSyncStarted] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');

  const netId = savedUsername?.split('@')[0] || '';

  useEffect(() => {
    if (!gradesData && !initialSyncStarted && netId) {
      setInitialSyncStarted(true);
      let savedPortalPwd = localStorage.getItem('portal_password');
      if (savedPortalPwd) {
        setPassword(savedPortalPwd);
        fetchGrades(savedPortalPwd);
      }
    }
  }, [gradesData, initialSyncStarted, netId]);

  const submitCaptcha = async () => {
    if (!captchaInput) return;
    try {
      await fetch('http://localhost:5000/api/grades/solve', {
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

  const fetchGrades = async (pwdToUse: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:5000/api/grades/status/${netId}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) {}
      }, 2000);

      const res = await fetch('http://localhost:5000/api/grades/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, password: pwdToUse })
      });
      
      clearInterval(pollInterval);
      setCaptchaStatus({ pending: false, base64: null });
      
      const data = await res.json();
      if (data.success) {
        setGradesData(data.semesters);
        setCgpa(data.cgpa);
        localStorage.setItem('academia_grades', JSON.stringify(data.semesters));
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

  if (gradesData) {
    return (
      <div className="data-grid full-width">
        {captchaModal}
        <section className="data-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>Grade / Mark Obtained</h2>
             {cgpa && (
               <div style={{ 
                 background: 'rgba(16, 185, 129, 0.1)', 
                 color: '#10b981', 
                 padding: '0.5rem 1rem', 
                 borderRadius: '8px', 
                 fontWeight: 'bold',
                 fontSize: '1.1rem'
               }}>
                 CGPA {cgpa}
               </div>
             )}
          </div>
          
          {gradesData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {gradesData.map((semesterBlock, sIdx) => (
                <div key={sIdx} className="semester-block">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>Semester {semesterBlock.semester}</h3>
                    {semesterBlock.sgpa && (
                      <span style={{ fontWeight: '600', color: '#0f172a', background: '#f1f5f9', padding: '4px 12px', borderRadius: '4px' }}>
                        SGPA: {semesterBlock.sgpa}
                      </span>
                    )}
                  </div>
                  <div className="table-responsive">
                     <table className="timetable-matrix">
                       <thead>
                         <tr>
                           <th>Month / Year</th>
                           <th>Course Details</th>
                           <th>Credit</th>
                           <th>Grade</th>
                         </tr>
                       </thead>
                       <tbody>
                          {semesterBlock.courses.map((row: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ textAlign: 'center', width: '120px' }}>{row.monthYear}</td>
                              <td>
                                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{row.description}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.code}</div>
                              </td>
                              <td style={{ textAlign: 'center', width: '80px' }}>{row.credit}</td>
                              <td style={{ textAlign: 'center', width: '80px' }}>
                                <span className="slot-badge success">{row.grade}</span>
                              </td>
                            </tr>
                          ))}
                       </tbody>
                     </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No grades found.</p>
              <button onClick={() => fetchGrades(password)} className="primary-btn mt-3" style={{ marginTop: '1rem' }} disabled={loading}>
                {loading ? 'Syncing...' : 'Retry Sync'}
              </button>
            </div>
          )}
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
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Student Portal Login</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingScreen message="Fetching your grades..." />
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

export default MarksTab;
