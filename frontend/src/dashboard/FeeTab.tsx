import React, { useState, useEffect } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';

interface FeeTabProps {
  feeData: any | null;
  setFeeData: (data: any) => void;
  savedUsername: string;
}

const FeeTab: React.FC<FeeTabProps> = ({ feeData, setFeeData, savedUsername }) => {
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
    if (!feeData && !initialSyncStarted && netId) {
      setInitialSyncStarted(true);
      let savedPortalPwd = localStorage.getItem('portal_password');
      if (savedPortalPwd) {
        fetchFees(savedPortalPwd);
      }
    }
  }, [feeData, initialSyncStarted, netId]);

  const submitCaptcha = async () => {
    if (!captchaInput) return;
    try {
      await fetch('http://localhost:5000/api/fees/solve', {
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

  const fetchFees = async (pwdToUse: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`http://localhost:5000/api/fees/status/${netId}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) {}
      }, 2000);

      const finalPwd = pwdToUse || localStorage.getItem('portal_password');
      
      const res = await fetch('http://localhost:5000/api/fees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: savedUsername, password: finalPwd })
      });
      
      clearInterval(pollInterval);
      setCaptchaStatus({ pending: false, base64: null });
      
      const data = await res.json();
      if (data.success) {
        setFeeData(data);
        localStorage.setItem('academia_fees', JSON.stringify(data));
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
    await fetchFees(password);
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

  if (feeData) {
    return (
      <div className="data-grid full-width">
        {captchaModal}
        <section className="data-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>Fee Payment Details</h2>
          </div>
          
          {error && <p className="error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Fee Details Table */}
            <div className="semester-block">
              <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>Fee Details</h3>
              {feeData.feeDetails && feeData.feeDetails.rows && feeData.feeDetails.rows.length > 0 ? (
                <div className="table-responsive">
                   <table className="timetable-matrix">
                     <thead>
                       <tr>
                         {feeData.feeDetails.headers.map((h: string, i: number) => (
                           <th key={i}>{h}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                        {feeData.feeDetails.rows.map((row: string[], idx: number) => (
                          <tr key={idx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              ) : (
                <p style={{ color: '#64748b' }}>No Fee Details available.</p>
              )}
            </div>

            {/* Payment Transaction Log Table */}
            <div className="semester-block">
              <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>Payment Transaction Log</h3>
              {feeData.paymentLog && feeData.paymentLog.rows && feeData.paymentLog.rows.length > 0 ? (
                <div className="table-responsive">
                   <table className="timetable-matrix">
                     <thead>
                       <tr>
                         {feeData.paymentLog.headers.map((h: string, i: number) => (
                           <th key={i}>{h}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                        {feeData.paymentLog.rows.map((row: string[], idx: number) => (
                          <tr key={idx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              ) : (
                <p style={{ color: '#64748b' }}>No Payment Transaction Log available.</p>
              )}
            </div>

            {/* Pending Exam Fee Status Table */}
            <div className="semester-block">
              <h3 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #f1f5f9' }}>Pending Exam Fee Status</h3>
              {feeData.pendingExam && feeData.pendingExam.rows && feeData.pendingExam.rows.length > 0 ? (
                <div className="table-responsive">
                   <table className="timetable-matrix">
                     <thead>
                       <tr>
                         {feeData.pendingExam.headers.map((h: string, i: number) => (
                           <th key={i}>{h}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                        {feeData.pendingExam.rows.map((row: string[], idx: number) => (
                          <tr key={idx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              ) : (
                <p style={{ color: '#64748b' }}>No Pending Exam Fee Status available.</p>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={() => fetchFees(password)} className="primary-btn mt-3" disabled={loading}>
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
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Student Portal Login</h2>
        
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

export default FeeTab;
