import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';
import './MarksTab.css';

interface InternalMarksTabProps {
  internalMarksData: any[] | null;
  setInternalMarksData: (data: any[]) => void;
  savedUsername?: string;
  isBackgroundSyncing?: boolean;
}

const InternalMarksTab: React.FC<InternalMarksTabProps> = ({ internalMarksData, setInternalMarksData, savedUsername, isBackgroundSyncing }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const username = savedUsername || '';

  const fetchInternalMarks = async (pwdToUse: string, manual: boolean = false) => {
    if (!username) {
      setError('Username is missing. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/internal-marks/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pwdToUse, manual })
      });

      const data = await res.json();
      if (data.success) {
        const marks = Array.isArray(data.marks) ? data.marks : [];
        setInternalMarksData(marks);
        localStorage.setItem('academia_internalmarks', JSON.stringify(marks));
        localStorage.setItem('academia_internalmarks_user', username);
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

  const handleSyncNow = async () => {
    try {
      setLoading(true);
      setError(null);
      setInfoMsg(null);

      const token = localStorage.getItem('session_token');
      const res = await fetch('/api/sync_now/internal-marks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.status === 429) {
        setInfoMsg('Data is already up to date!');
        setLoading(false);
        return;
      }

      if (data.success) {
        const marks = Array.isArray(data.marks) ? data.marks : [];
        setInternalMarksData(marks);
        localStorage.setItem('academia_internalmarks', JSON.stringify(marks));
        localStorage.setItem('academia_internalmarks_user', username);
      } else {
        setError(data.error || 'Failed to connect to Student Portal');
      }
    } catch (err) {
      setError('Network error connecting to Student Portal');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    await fetchInternalMarks('', true);
  };

  const groupedData: Record<string, { subject: string; title: string; marks: any[]; chartData: any[] }> = {};

  if (internalMarksData && internalMarksData.length > 0) {
    internalMarksData.forEach((row: any) => {
      const code = row.code || 'UNKNOWN';
      if (!groupedData[code]) {
        groupedData[code] = {
          subject: code,
          // Extract base title if description contains hyphen (e.g. "DISCRETE MATHEMATICS - CT 1")
          title: row.description.includes('-') ? row.description.split('-')[0].trim() : row.description,
          marks: [],
          chartData: [
            {
              name: 'Start',
              shortName: '',
              percentage: 0,
              obtained: 0,
              max: 0,
              label: '0/0',
              tone: 'tone-low'
            }
          ]
        };
      }

      const obtained = parseFloat(row.markObtained);
      const max = parseFloat(row.maxMark);
      let percentage = 0;
      let tone = 'tone-good';
      if (!isNaN(obtained) && !isNaN(max) && max > 0) {
        percentage = (obtained / max) * 100;
        if (percentage < 50) tone = 'tone-low';
        else if (percentage < 75) tone = 'tone-warn';
      }

      const chartPoint = {
        name: row.description,
        shortName: row.description.includes('-') ? row.description.split('-').slice(1).join('-').trim() : 'Total',
        percentage: parseFloat(percentage.toFixed(2)),
        obtained,
        max,
        label: `${row.markObtained}/${row.maxMark}`,
        tone
      };

      groupedData[code].marks.push({ ...row, percentage, tone });
      groupedData[code].chartData.push(chartPoint);
    });
  }

  const subjects = Object.values(groupedData);

  const isAuthError = error && (error.toLowerCase().includes('password') || error.toLowerCase().includes('credential'));

  if (internalMarksData && !isAuthError) {
    return (
      <div className="marks-tab">
        <header className="att-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="att-heading">
            <span className="att-eyebrow">Academic Standing</span>
            <h1 className="att-title">Internal Marks</h1>
          </div>

          {!loading && !infoMsg && (
            <button
              className="att-sync-btn"
              onClick={handleManualSync}
              disabled={loading}
              style={{
                background: 'var(--brass, #C9A227)',
                color: '#14110A',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Sync again
            </button>
          )}
          {loading && (
            <span className="att-sync-btn" style={{ opacity: 0.7, padding: '8px 16px', fontSize: '13px', color: 'var(--text-primary)' }}>
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

        {subjects.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem', width: '100%' }}>
            {subjects.map((subject, idx) => (
              <div key={idx} className="marks-semester-card" style={{ padding: '1.25rem 1.5rem', overflow: 'visible' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontFamily: 'Newsreader', fontSize: '18px', color: 'var(--text-primary)' }}>{subject.title}</h3>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px', color: 'var(--text-muted)' }}>{subject.subject}</span>
                </div>

                <div style={{ width: '100%', height: 140, marginBottom: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subject.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="none" stroke="var(--hairline)" vertical={true} horizontal={true} />
                      <XAxis
                        dataKey="shortName"
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        tickMargin={8}
                        axisLine={{ stroke: 'var(--text-muted)' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        domain={[0, 100]}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                        tickMargin={8}
                        axisLine={{ stroke: 'var(--text-muted)' }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--ink-panel)', borderColor: 'var(--hairline)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'Inter' }}
                        itemStyle={{ color: '#d32f2f' }}
                        formatter={(value: any, _name: any, props: any) => [`${value}% (${props.payload.label})`, 'Score']}
                        labelFormatter={(label: any, payload: any) => payload && payload[0] ? payload[0].payload.name : label}
                      />
                      <Line
                        type="linear"
                        dataKey="percentage"
                        stroke="#d32f2f"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#0d47a1', strokeWidth: 0 }}
                        activeDot={{ r: 7, fill: '#0d47a1', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {subject.marks.map((row: any, i: number) => (
                    <div key={i} className="marks-row" style={{ padding: '1rem 1.25rem' }}>
                      <div className="marks-row-info">
                        <span className="marks-row-title">{row.description}</span>
                      </div>
                      <div className="marks-row-side">
                        <span className={`marks-grade-badge ${row.tone}`}>
                          {row.markObtained} / {row.maxMark}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="marks-empty-state">
            <p>No internal marks found.</p>
            <button
              onClick={handleSyncNow}
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

  if (isBackgroundSyncing) {
    return <SkeletonLoader type="table" />;
  }

  return (
    <div className="marks-tab marks-tab-centered">
      <section className="marks-login-card">
        <h2 className="marks-login-title">Data Not Found</h2>

        {loading ? (
          <div className="marks-loading-wrap">
            <LoadingScreen message="Fetching your internal marks..." />
          </div>
        ) : (
          <>
            <p className="marks-login-copy">
              Internal marks couldn't be loaded automatically. Click below to try fetching them again.
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
};

export default InternalMarksTab;
