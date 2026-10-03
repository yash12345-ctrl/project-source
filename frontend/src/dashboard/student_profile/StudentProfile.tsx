import React, { useState } from 'react';
import './StudentProfile.css';

interface StudentProfileProps {
    data: any;
    cgpa?: string | null;
    attendancePercent?: number | null;
    totalAttended?: number | null;
    totalClasses?: number | null;
    todayDayOrder?: string | null;
}

const ledgerIcons: Record<string, React.ReactElement> = {
    Program: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 10L12 5 2 10l10 5 10-5z" />
            <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
    ),

    Department: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 9h1M9 13h1M14 9h1M14 13h1" />
        </svg>
    ),

    Semester: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    ),

    Platform: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
        </svg>
    ),

    'Last Synced': (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    ),

    Mobile: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
    ),

    Status: (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
};

const StudentProfile: React.FC<StudentProfileProps> = ({
    data,
    cgpa,
    attendancePercent,
    totalAttended,
    totalClasses,
    todayDayOrder
}) => {
    const [copied, setCopied] = useState(false);

    // =========================
    // STUDENT INFORMATION
    // =========================

    const name =
        data?.profile?.name ||
        data?.username ||
        'Student';

    const regNo =
        data?.profile?.registrationNumber ||
        data?.username ||
        '—';

    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word: string) => word[0])
        .join('')
        .toUpperCase();

    // =========================
    // LAST SYNCED
    // =========================

    const lastSynced = data?.scrapedAt
        ? new Date(data.scrapedAt).toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : 'Just now';

    // =========================
    // PROFILE INFORMATION
    // =========================

    const rows = [
        {
            label: 'Program',
            value: data?.profile?.program,
        },
        {
            label: 'Department',
            value: data?.profile?.department,
        },
        {
            label: 'Semester',
            value: data?.profile?.semester
                ? `${data.profile.semester} (Batch ${data.profile.batch})`
                : undefined,
        },
        {
            label: 'Mobile',
            value: data?.profile?.mobile,
        },
        {
            label: 'Status',
            value: data?.profile?.enrollmentStatus,
        },
        {
            label: 'Last Synced',
            value: lastSynced,
        },
    ].filter((row) => row.value);

    // =========================
    // SAFE ATTENDANCE VALUES
    // =========================

    const attendanceValue = Number(attendancePercent);

    const hasValidAttendance =
        attendancePercent !== undefined &&
        attendancePercent !== null &&
        Number.isFinite(attendanceValue);

    const attendanceSafe = hasValidAttendance
        ? Math.max(0, Math.min(100, attendanceValue))
        : 0;

    // =========================
    // CGPA
    // =========================

    const hasValidCgpa =
        cgpa !== undefined &&
        cgpa !== null &&
        cgpa !== '';

    const hasStats =
        hasValidAttendance ||
        hasValidCgpa;

    // =========================
    // ATTENDANCE GAUGE
    // =========================

    const circumference = 2 * Math.PI * 40;

    const dashOffset =
        circumference -
        (attendanceSafe / 100) * circumference;

    const attendanceTone =
        attendanceSafe >= 75
            ? 'good'
            : attendanceSafe >= 65
                ? 'warn'
                : 'low';

    // =========================
    // COPY REGISTRATION NUMBER
    // =========================

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(regNo);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1600);
        } catch {
            // Clipboard unavailable
        }
    };

    return (
        <div className="student-profile">

            <div className="profile-hero">

                {/* AVATAR */}

                <div className="profile-avatar-ring">
                    <div className="profile-avatar">
                        {initials}
                    </div>
                </div>

                {/* STUDENT DETAILS */}

                <div className="profile-heading">

                    <span className="profile-eyebrow">
                        Student Record
                    </span>

                    <h2 className="profile-name">
                        {name}
                    </h2>

                    <button
                        className="profile-regno"
                        onClick={handleCopy}
                        title="Click to copy"
                    >
                        {regNo}

                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                            />

                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>

                        <span
                            className={`copy-toast ${copied ? 'show' : ''}`}
                        >
                            Copied
                        </span>
                    </button>

                    <div className="profile-badges">
                        <span className="status-pill">
                            <span className="status-dot" />
                            Active Student
                        </span>

                        {todayDayOrder && (
                            <span className="status-pill day-order-pill">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                Day Order {todayDayOrder.replace(/day/i, '').trim()}
                            </span>
                        )}
                    </div>

                </div>

                {/* STATS */}

                {hasStats && (
                    <div className="profile-stats">

                        {/* ATTENDANCE */}

                        {hasValidAttendance && (
                            <div className="attendance-card">
                            <div
                                className={`stat-gauge tone-${attendanceTone}`}
                            >
                                <svg
                                    width="92"
                                    height="92"
                                    viewBox="0 0 92 92"
                                >
                                    <circle
                                        cx="46"
                                        cy="46"
                                        r="40"
                                        className="gauge-track"
                                    />

                                    <circle
                                        cx="46"
                                        cy="46"
                                        r="40"
                                        className="gauge-fill"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                    />
                                </svg>

                                <div className="gauge-label">

                                    <span className="gauge-value">
                                        {attendanceSafe.toFixed(1)}
                                        <span className="gauge-percent-sign">%</span>
                                    </span>

                                    <span className="gauge-caption">
                                        Attendance
                                    </span>

                                </div>
                            </div>

                            <div className={`attendance-meta tone-${attendanceTone}`}>
                                <span className="attendance-meta-title">
                                    {attendanceTone === 'good'
                                        ? 'On track'
                                        : attendanceTone === 'warn'
                                            ? 'Near the limit'
                                            : 'Below 65%'}
                                </span>
                                {Number(totalClasses) > 0 && (
                                    <span className="attendance-meta-line">
                                        {totalAttended} of {totalClasses} classes attended
                                    </span>
                                )}
                                <span className="attendance-meta-hint">
                                    {attendanceTone === 'good'
                                        ? 'Above the 75% requirement'
                                        : 'Minimum required is 75%'}
                                </span>
                            </div>
                            </div>
                        )}

                        {/* CGPA */}

                        {hasValidCgpa && (
                            <div className="stat-chip">

                                <span className="stat-chip-value">
                                    {cgpa}
                                </span>

                                <span className="stat-chip-caption">
                                    CGPA
                                </span>

                            </div>
                        )}

                    </div>
                )}

            </div>

            {/* PROFILE LEDGER */}

            <div className="profile-ledger">

                {rows.map((row, i) => (
                    <div
                        className={`ledger-row ${['Program', 'Department', 'Last Synced'].includes(row.label) ? 'wide' : ''}`}
                        key={i}
                        style={{
                            animationDelay: `${i * 60}ms`,
                        }}
                    >
                        <span className="ledger-label">

                            <span className="ledger-icon">
                                {ledgerIcons[row.label]}
                            </span>

                            {row.label}

                        </span>

                        <span className="ledger-value">
                            {row.value}
                        </span>
                    </div>
                ))}

            </div>

        </div>
    );
};

export default StudentProfile;