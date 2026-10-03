import React, { useState, useEffect, useMemo } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';
import './CalenderTab.css';

interface CalendarTabProps {
  calendarData: any | null;
  setCalendarData: (data: any) => void;
  savedUsername?: string;
  isBackgroundSyncing?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

// =========================
// FLEXIBLE DATE PARSER
// Handles: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YYYY, "1 Aug 2026"
// =========================

const parseCalendarDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const s = dateStr.trim();

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
  if (m) {
    const idx = MONTH_NAMES.findIndex(mo => m![2].toLowerCase().startsWith(mo));
    if (idx >= 0) return new Date(Number(m[3]), idx, Number(m[1]));
  }

  const native = new Date(s);
  return isNaN(native.getTime()) ? null : native;
};

const statusTone = (status?: string): 'working' | 'holiday' | 'exam' | 'default' => {
  const s = (status || '').toLowerCase();
  if (s.includes('holiday')) return 'holiday';
  if (s.includes('exam')) return 'exam';
  if (s.includes('working')) return 'working';
  return 'default';
};

// A remark is only worth flagging on the grid if it carries real content —
// filters out placeholder values like "-", "N/A", or an empty string so the
// gold marker means something instead of appearing on every single day.
const hasMeaningfulRemark = (remarks?: string): boolean => {
  if (!remarks) return false;
  const trimmed = remarks.trim();
  if (trimmed === '') return false;
  const placeholder = ['-', '--', 'n/a', 'na', 'none'];
  return !placeholder.includes(trimmed.toLowerCase());
};

interface DayCell {
  dayNum: number | null;
  row: any | null;
}

const buildMonthGrid = (year: number, month: number, rows: any[]): DayCell[][] => {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ dayNum: null, row: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const row = rows.find(r => r._date.getDate() === d) || null;
    cells.push({ dayNum: d, row });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dayNum: null, row: null });
  }

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
};

const CalendarTab: React.FC<CalendarTabProps> = ({ calendarData, setCalendarData, savedUsername, isBackgroundSyncing }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [captchaStatus, setCaptchaStatus] = useState<{ pending: boolean; base64: string | null }>({ pending: false, base64: null });
  const [captchaInput, setCaptchaInput] = useState('');
  const [activeMonthIdx, setActiveMonthIdx] = useState(0);

  const username = savedUsername || '';

  useEffect(() => {
    // Handled by backend
  }, []);

  // Auto-fetch is handled in background by Dashboard.tsx.

  const submitCaptcha = async () => {
    if (!captchaInput || !username) return;
    try {
      await fetch('/api/calendar/captcha/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, captchaText: captchaInput })
      });
      setCaptchaStatus({ pending: false, base64: null });
      setCaptchaInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCalendar = async (pwdToUse: string) => {
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
          const pollRes = await fetch(`/api/calendar/status/${encodeURIComponent(username)}`);
          const pollData = await pollRes.json();
          if (pollData.pending) {
            setCaptchaStatus({ pending: true, base64: pollData.base64 });
          } else {
            setCaptchaStatus({ pending: false, base64: null });
          }
        } catch (e) { }
      }, 2000);

      const finalPwd = pwdToUse || localStorage.getItem('portal_password') || '';

      const res = await fetch('/api/calendar/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: finalPwd })
      });

      if (pollInterval) clearInterval(pollInterval);
      pollInterval = null;
      setCaptchaStatus({ pending: false, base64: null });

      const data = await res.json();
      if (data.success) {
        setCalendarData(data);
        localStorage.setItem('academia_calendar', JSON.stringify(data));
        localStorage.setItem('academia_calendar_user', username);
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
      if (pollInterval) clearInterval(pollInterval);
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    await fetchCalendar('');
  };

  // =========================
  // GROUP ROWS INTO MONTHS
  // =========================

  const monthGroups = useMemo(() => {
    if (!calendarData?.rows) return [];

    const map = new Map<string, { label: string; year: number; month: number; rows: any[] }>();

    calendarData.rows.forEach((row: any) => {
      const d = parseCalendarDate(row.date);
      if (!d) return;

      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!map.has(key)) {
        map.set(key, {
          label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          rows: [],
        });
      }

      map.get(key)!.rows.push({ ...row, _date: d });
    });

    return Array.from(map.values()).sort((a, b) => a.year - b.year || a.month - b.month);
  }, [calendarData]);

  // Default to the month containing today, if present, else the first month
  useEffect(() => {
    if (monthGroups.length === 0) return;

    const today = new Date();
    const todayIdx = monthGroups.findIndex(
      g => g.year === today.getFullYear() && g.month === today.getMonth()
    );

    setActiveMonthIdx(todayIdx >= 0 ? todayIdx : 0);
  }, [monthGroups.length]);

  const activeGroup = monthGroups[activeMonthIdx];

  const activeGrid = useMemo(() => {
    if (!activeGroup) return [];
    return buildMonthGrid(activeGroup.year, activeGroup.month, activeGroup.rows);
  }, [activeGroup]);

  const monthStats = useMemo(() => {
    if (!activeGroup) return { working: 0, holiday: 0, total: 0 };

    let working = 0;
    let holiday = 0;

    activeGroup.rows.forEach(r => {
      const tone = statusTone(r.status);
      if (tone === 'working') working++;
      if (tone === 'holiday') holiday++;
    });

    return { working, holiday, total: activeGroup.rows.length };
  }, [activeGroup]);

  const today = new Date();
  const isToday = (dayNum: number | null) =>
    !!activeGroup &&
    dayNum !== null &&
    activeGroup.year === today.getFullYear() &&
    activeGroup.month === today.getMonth() &&
    dayNum === today.getDate();

  // =========================
  // CAPTCHA MODAL
  // =========================

  const captchaModal = captchaStatus.pending && captchaStatus.base64 ? (
    <div className="cal-modal-overlay">
      <div className="cal-modal">
        <span className="cal-modal-eyebrow">Verification Required</span>
        <h3 className="cal-modal-title">Manual Captcha</h3>
        <p className="cal-modal-copy">
          Our automatic solver couldn't read this one. Enter the text shown below to continue.
        </p>

        <div className="cal-captcha-image">
          <img src={`data:image/png;base64,${captchaStatus.base64}`} alt="Captcha" />
        </div>

        <input
          type="text"
          className="cal-login-input"
          placeholder="Enter captcha text"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitCaptcha(); }}
          autoFocus
        />

        <button className="cal-primary-btn" onClick={submitCaptcha}>
          Submit
        </button>
      </div>
    </div>
  ) : null;

  // =========================
  // CALENDAR LOADED
  // =========================

  if (calendarData ) {
    return (
      <div className="cal-tab">
        {captchaModal}

        <div className="cal-header">
          <div className="cal-header-heading">
            <span className="cal-eyebrow">Student Portal</span>
            <h2 className="cal-title">Academic Calendar</h2>
          </div>

          <div className="cal-header-stats">
            <div className="cal-stat">
              <span className="cal-stat-value cal-stat-working">
                {calendarData.stats?.workingDays ?? '0'}
              </span>
              <span className="cal-stat-caption">Working</span>
            </div>

            <div className="cal-stat">
              <span className="cal-stat-value cal-stat-holiday">
                {calendarData.stats?.holidays ?? '0'}
              </span>
              <span className="cal-stat-caption">Holidays</span>
            </div>

            <div className="cal-stat">
              <span className="cal-stat-value cal-stat-total">
                {calendarData.stats?.totalDays ?? '0'}
              </span>
              <span className="cal-stat-caption">Total</span>
            </div>
          </div>

          <button
            onClick={() => fetchCalendar('')}
            className="cal-sync-btn"
            disabled={loading}
          >
            {loading ? 'Syncing…' : 'Sync Again'}
          </button>
        </div>

        {error && <p className="cal-error">{error}</p>}

        {monthGroups.length > 0 ? (
          <>
            {/* MONTH TABS */}

            {monthGroups.length > 1 && (
              <div className="cal-month-tabs" role="tablist">
                {monthGroups.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={activeMonthIdx === i}
                    className={`cal-month-tab ${activeMonthIdx === i ? 'active' : ''}`}
                    onClick={() => setActiveMonthIdx(i)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

            {activeGroup && (
              <div className="cal-grid-card">

                <div className="cal-grid-header">
                  <h3 className="cal-grid-title">{activeGroup.label}</h3>

                  <div className="cal-grid-mini-stats">
                    <span><span className="dot tone-working" /> {monthStats.working} working</span>
                    <span><span className="dot tone-holiday" /> {monthStats.holiday} holiday</span>
                  </div>
                </div>

                <div className="cal-weekday-row">
                  {WEEKDAYS.map(d => (
                    <span key={d} className="cal-weekday-label">{d}</span>
                  ))}
                </div>

                <div className="cal-grid">
                  {activeGrid.flat().map((cell, idx) => {
                    if (cell.dayNum === null) {
                      return <div key={idx} className="cal-cell cal-cell-empty" />;
                    }

                    const tone = cell.row ? statusTone(cell.row.status) : 'nodata';
                    const remarkIsMeaningful = hasMeaningfulRemark(cell.row?.remarks);
                    const tooltip = cell.row
                      ? `${cell.row.status || ''}${remarkIsMeaningful ? ' — ' + cell.row.remarks : ''}`
                      : undefined;

                    return (
                      <div
                        key={idx}
                        className={`cal-cell tone-${tone} ${isToday(cell.dayNum) ? 'is-today' : ''}`}
                        title={tooltip}
                      >
                        <span className="cal-cell-daynum">{cell.dayNum}</span>

                        {cell.row?.dayOrder && cell.row.dayOrder !== '-' && (
                          <span className="cal-cell-dayorder">{cell.row.dayOrder}</span>
                        )}

                        {remarkIsMeaningful && <span className="cal-cell-dot" />}
                      </div>
                    );
                  })}
                </div>

                <div className="cal-legend">
                  <span className="cal-legend-item">
                    <span className="dot tone-working" /> Working Day
                  </span>
                  <span className="cal-legend-item">
                    <span className="dot tone-holiday" /> Holiday
                  </span>
                  <span className="cal-legend-item">
                    <span className="dot tone-exam" /> Exam / Event
                  </span>
                  <span className="cal-legend-item">
                    <span className="cal-legend-dayorder">3</span> Day Order
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="cal-empty-state">
            <p>No calendar data available for the current term.</p>
            <button
              onClick={() => fetchCalendar('')}
              className="cal-primary-btn"
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

  if (isBackgroundSyncing) {
    return <SkeletonLoader type="table" />;
  }

  // =========================
  // DATA NOT FOUND SCREEN
  // =========================

  return (
    <div className="cal-tab cal-tab-centered">
      {captchaModal}

      <section className="cal-login-card">
        <h2 className="cal-login-title">Data Not Found</h2>

        {loading ? (
          <div className="cal-loading-wrap">
            <LoadingScreen message="Fetching your calendar..." />
          </div>
        ) : (
          <>
            <p className="cal-login-copy">
              Your academic calendar couldn't be loaded automatically. Click below to try fetching it again.
            </p>

            {error && (
              <div className="cal-error cal-error-centered">
                {error}
              </div>
            )}

            <button type="button" className="cal-primary-btn cal-login-submit" onClick={handleManualSync}>
              Sync Now
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default CalendarTab;