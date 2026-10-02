import React, { useMemo, useState } from 'react';
import './TimetablePage.css';

interface TimetableCell {
    time: string;
    slot?: string;
}

interface Course {
    code?: string;
    title?: string;
    type?: string;
    faculty?: string;
    slot?: string;
    room?: string;
}

interface TimetablePageProps {
    timetableGrid?: Record<string, TimetableCell[]>;
    courses?: Course[];
    todayDayOrder?: string | null;
}

interface Accent {
    main: string;
    soft: string;
}

type ViewMode = 'fit' | 'scroll';

// Same accent logic as CoursePage: color is derived from course type so it
// carries real meaning, and the two tabs read as one consistent language.
const TYPE_ACCENTS: Record<string, Accent> = {
    lab: { main: '#fbbf24', soft: 'rgba(251, 191, 36, 0.16)' },
    elective: { main: '#a78bfa', soft: 'rgba(167, 139, 250, 0.16)' },
    project: { main: '#38bdf8', soft: 'rgba(56, 189, 248, 0.16)' },
    theory: { main: '#34d399', soft: 'rgba(52, 211, 153, 0.16)' },
    core: { main: '#34d399', soft: 'rgba(52, 211, 153, 0.16)' },
};
const DEFAULT_ACCENT: Accent = { main: '#34d399', soft: 'rgba(52, 211, 153, 0.16)' };

function getAccent(type?: string): Accent {
    if (!type) return DEFAULT_ACCENT;
    const key = type.trim().toLowerCase();
    const match = Object.keys(TYPE_ACCENTS).find((k) => key.includes(k));
    return match ? TYPE_ACCENTS[match] : DEFAULT_ACCENT;
}

function findMatchedCourse(cell: TimetableCell, courses?: Course[]): Course | undefined {
    const baseSlot = cell.slot ? cell.slot.split('/')[0].trim() : '';
    if (!baseSlot || !courses) return undefined;
    return courses.find((c) => c.slot && c.slot.split('-').some((s) => s.trim() === baseSlot));
}

// A short label for tight grid cells — prefer the course title, fall back to
// the code so we show exactly what the user wants.
function shortLabel(course: Course): string {
    return course.title || course.code || 'Class';
}

/**
 * Timetable time strings in this app arrive without an AM/PM marker
 * (e.g. "08:00 - 08:50", "01:25 - 02:15"). Since academic days run
 * 08:00 -> ~18:10, any hour below 8 that isn't part of an AM slot is
 * afternoon. This lets us light up "now" without needing the data
 * source to change format.
 */
function parseTimeToken(token: string): { hour: number; minute: number } | null {
    const match = token.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem === 'PM' && hour !== 12) hour += 12;
    else if (meridiem === 'AM' && hour === 12) hour = 0;
    else if (!meridiem && hour >= 1 && hour < 8) hour += 12;

    return { hour, minute };
}

function parseRangeMinutes(range: string): { start: number; end: number } | null {
    const parts = range.split(/[-–—]/);
    if (parts.length < 2) return null;
    const start = parseTimeToken(parts[0]);
    const end = parseTimeToken(parts[1]);
    if (!start || !end) return null;
    return { start: start.hour * 60 + start.minute, end: end.hour * 60 + end.minute };
}

function getSlotProgress(range: string): number {
    const parsed = parseRangeMinutes(range);
    if (!parsed) return 0;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    if (nowMinutes < parsed.start) return 0;
    if (nowMinutes > parsed.end) return 100;
    return ((nowMinutes - parsed.start) / (parsed.end - parsed.start)) * 100;
}

function isSlotNow(range: string): boolean {
    const parsed = parseRangeMinutes(range);
    if (!parsed) return false;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return nowMinutes >= parsed.start && nowMinutes < parsed.end;
}

function isSlotPast(range: string): boolean {
    const parsed = parseRangeMinutes(range);
    if (!parsed) return false;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    return nowMinutes >= parsed.end;
}

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

const GridIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
);

const ListIcon = () => (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="2.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1.5" y="6.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="1.5" y="10.5" width="13" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
);

const ChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TimetablePage: React.FC<TimetablePageProps> = ({ timetableGrid, courses, todayDayOrder }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('fit');

    const days = useMemo(() => (timetableGrid ? Object.keys(timetableGrid) : []), [timetableGrid]);
    const hasGrid = days.length > 0;

    const times = useMemo(
        () => (hasGrid ? (timetableGrid![days[0]] || []).map((c) => c.time) : []),
        [hasGrid, timetableGrid, days]
    );

    const todayName = useMemo(
        () => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        []
    );

    const isToday = (day: string) => {
        const d = day.trim().toLowerCase();
        
        if (todayDayOrder) {
            const tdo = todayDayOrder.toString().trim().toLowerCase();
            // Match cases: tdo="3" (d="day 3"), tdo="day 3" (d="day 3")
            if (d === `day ${tdo}` || d === tdo || d.replace('day ', '') === tdo.replace('day ', '')) {
                return true;
            }
        }

        return todayName.startsWith(d) || d.startsWith(todayName.slice(0, 3));
    };

    const { rows, filledCount, legend } = useMemo(() => {
        const legendMap = new Map<string, Accent>();
        let filled = 0;

        const builtRows = days.map((day) => {
            const cells = timetableGrid![day] || [];
            const builtCells = cells.map((cell) => {
                const matchedCourse = findMatchedCourse(cell, courses);
                if (matchedCourse) {
                    filled += 1;
                    const label = matchedCourse.type?.trim() || 'Class';
                    if (!legendMap.has(label)) legendMap.set(label, getAccent(matchedCourse.type));
                }
                return { cell, matchedCourse };
            });
            return { day, cells: builtCells };
        });

        return { rows: builtRows, filledCount: filled, legend: Array.from(legendMap.entries()) };
    }, [days, timetableGrid, courses]);

    const formatDayName = (day: string) => {
        const lower = day.trim().toLowerCase();
        if (lower.startsWith('day ') && !lower.includes('order')) {
            return day.replace(/day/i, 'Day Order');
        }
        return day;
    };

    // Day view (list) navigation state — default to today if it's in the grid.
    const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
        const idx = days.findIndex(isToday);
        return idx >= 0 ? idx : 0;
    });

    React.useEffect(() => {
        const idx = days.findIndex(isToday);
        if (idx >= 0) {
            setSelectedDayIdx(idx);
        }
    }, [days, todayDayOrder]);

    const [dayProgress, setDayProgress] = useState(0);

    React.useEffect(() => {
        const calculateProgress = () => {
            const now = new Date();
            const startMinutes = 8 * 60;
            const endMinutes = 18 * 60 + 10;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            if (currentMinutes < startMinutes) return 0;
            if (currentMinutes > endMinutes) return 100;
            
            return ((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
        };
        
        setDayProgress(calculateProgress());
        const interval = setInterval(() => setDayProgress(calculateProgress()), 60000);
        return () => clearInterval(interval);
    }, []);

    const safeIdx = days.length > 0 ? Math.min(selectedDayIdx, days.length - 1) : 0;
    const currentDay = days[safeIdx];
    const currentDayCells = rows.find((r) => r.day === currentDay)?.cells || [];

    const goPrevDay = () => setSelectedDayIdx((i) => (days.length ? (i - 1 + days.length) % days.length : 0));
    const goNextDay = () => setSelectedDayIdx((i) => (days.length ? (i + 1) % days.length : 0));

    return (
        <div className="tt-page">
            <header className="tt-header">
                <div className="tt-heading">
                    <span className="tt-eyebrow">
                        Weekly Overview
                        {todayDayOrder && (
                            <span style={{ marginLeft: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontWeight: 600 }}>
                                Day Order {todayDayOrder.replace(/day/i, '').trim()}
                            </span>
                        )}
                    </span>
                    <h1 className="tt-title">My Unified Time Table</h1>
                    <p className="tt-subtitle">
                        {hasGrid
                            ? `${filledCount} class${filledCount === 1 ? '' : 'es'} scheduled across ${days.length} day${days.length === 1 ? '' : 's'}`
                            : 'Your weekly schedule will appear here'}
                    </p>
                </div>

                <div className="tt-header-controls">
                    {legend.length > 0 && (
                        <ul className="tt-legend">
                            {legend.map(([label, accent]) => (
                                <li key={label} className="tt-legend-item">
                                    <span className="tt-legend-dot" style={{ background: accent.main }} />
                                    {label}
                                </li>
                            ))}
                        </ul>
                    )}

                    {hasGrid && (
                        <div className="tt-view-toggle" role="group" aria-label="Timetable layout">
                            <button
                                type="button"
                                className={`tt-toggle-btn ${viewMode === 'fit' ? 'tt-toggle-active' : ''}`}
                                aria-pressed={viewMode === 'fit'}
                                onClick={() => setViewMode('fit')}
                            >
                                <GridIcon />
                                Fit to screen
                            </button>
                            <button
                                type="button"
                                className={`tt-toggle-btn ${viewMode === 'scroll' ? 'tt-toggle-active' : ''}`}
                                aria-pressed={viewMode === 'scroll'}
                                onClick={() => setViewMode('scroll')}
                            >
                                <ListIcon />
                                Day view
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {!hasGrid && (
                <div className="tt-empty">
                    <div className="tt-empty-icon">
                        <CalendarIcon />
                    </div>
                    <h3>No timetable grid found</h3>
                    <p>Please try syncing again to pull in your weekly schedule.</p>
                </div>
            )}

            {hasGrid && viewMode === 'fit' && (
                <div className="tt-card">
                    <div className="tt-table-scroll tt-mode-fit">
                        <table className="tt-matrix">
                            <thead>
                                <tr>
                                    <th className="tt-corner">Day</th>
                                    {times.map((time, idx) => (
                                        <th key={idx}>
                                            <span className="tt-slot-num">Slot {idx + 1}</span>
                                            <span className="tt-slot-time">{time}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ day, cells }) => (
                                    <tr key={day} className={isToday(day) ? 'tt-row-today' : ''}>
                                        <td className="tt-day-label">
                                            <span className="tt-day-name">{formatDayName(day)}</span>
                                            {isToday(day) && <span className="tt-today-badge">Today</span>}
                                        </td>
                                        {cells.map(({ cell, matchedCourse }, idx) => {
                                            const accent = getAccent(matchedCourse?.type);
                                            const fullLabel = matchedCourse
                                                ? [matchedCourse.title || matchedCourse.code, matchedCourse.room]
                                                    .filter(Boolean)
                                                    .join(' · ')
                                                : undefined;
                                            const nowActive = isToday(day) && matchedCourse && isSlotNow(cell.time);

                                            return (
                                                <td
                                                    key={idx}
                                                    className={`tt-slot ${matchedCourse ? 'tt-slot-filled' : 'tt-slot-free'} ${nowActive ? 'tt-slot-now' : ''}`}
                                                    style={
                                                        matchedCourse
                                                            ? ({ '--tt-accent': accent.main, '--tt-accent-soft': accent.soft } as React.CSSProperties)
                                                            : undefined
                                                    }
                                                    title={fullLabel}
                                                >
                                                    {matchedCourse ? (
                                                        <div className="tt-slot-content">
                                                            <span className="tt-slot-code">{shortLabel(matchedCourse)}</span>
                                                            {matchedCourse.room && <span className="tt-slot-room">{matchedCourse.room}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="tt-visually-hidden">Free period</span>
                                                    )}
                                                    {nowActive && <span className="tt-now-dot" aria-hidden="true" />}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasGrid && viewMode === 'scroll' && (
                <div className="tt-card">
                    <div className="tt-daylist">
                        <div className="tt-daylist-nav">
                            <button
                                type="button"
                                className="tt-daylist-nav-btn"
                                onClick={goPrevDay}
                                aria-label="Previous day"
                            >
                                <ChevronLeft />
                            </button>

                            <div className="tt-daylist-current">
                                <span className="tt-daylist-current-name">{formatDayName(currentDay)}</span>
                                {isToday(currentDay) && <span className="tt-daylist-current-badge">Today</span>}
                            </div>

                            <button
                                type="button"
                                className="tt-daylist-nav-btn"
                                onClick={goNextDay}
                                aria-label="Next day"
                            >
                                <ChevronRight />
                            </button>
                        </div>

                        {days.length > 1 && (
                            <div className="tt-daylist-pills">
                                {days.map((day, idx) => (
                                    <button
                                        key={day}
                                        type="button"
                                        className={`tt-daylist-pill ${idx === safeIdx ? 'tt-daylist-pill-active' : ''}`}
                                        onClick={() => setSelectedDayIdx(idx)}
                                    >
                                        {formatDayName(day)}
                                    </button>
                                ))}
                            </div>
                        )}

                        {isToday(currentDay) && (
                            <div className="tt-day-progress" title={`${Math.round(dayProgress)}% of academic day completed`}>
                                <div className="tt-day-progress-fill" style={{ width: `${dayProgress}%` }} />
                            </div>
                        )}

                        <div className="tt-daylist-body">
                            {currentDayCells.map(({ cell, matchedCourse }, idx) => {
                                const accent = getAccent(matchedCourse?.type);
                                const dayIsToday = isToday(currentDay);
                                const nowActive = dayIsToday && !!matchedCourse && isSlotNow(cell.time);
                                const pastActive = dayIsToday && isSlotPast(cell.time);

                                const rowClass = [
                                    'tt-daylist-row',
                                    matchedCourse ? 'tt-daylist-row-filled' : '',
                                    nowActive ? 'tt-daylist-row-now' : '',
                                    pastActive && !nowActive ? 'tt-daylist-row-past' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ');
                                    
                                const slotProgress = nowActive ? getSlotProgress(cell.time) : 0;

                                return (
                                    <div
                                        key={idx}
                                        className={rowClass}
                                        style={
                                            matchedCourse
                                                ? ({ '--tt-accent': accent.main, '--tt-accent-soft': accent.soft } as React.CSSProperties)
                                                : undefined
                                        }
                                    >
                                        {nowActive && (
                                            <div className="tt-slot-progress" style={{ width: `${slotProgress}%` }} />
                                        )}
                                        <div className="tt-daylist-time">
                                            <span className="tt-daylist-time-range">{cell.time}</span>
                                            {nowActive && <span className="tt-now-badge">Now</span>}
                                        </div>

                                        <div className="tt-daylist-info">
                                            {matchedCourse ? (
                                                <>
                                                    <span className="tt-daylist-title">
                                                        {matchedCourse.title || matchedCourse.code}
                                                    </span>
                                                    <span className="tt-daylist-meta">
                                                        {[matchedCourse.type, matchedCourse.room].filter(Boolean).join(' · ')}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="tt-daylist-free">Free hour</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetablePage;