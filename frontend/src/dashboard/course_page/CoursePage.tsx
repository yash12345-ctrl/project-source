import React, { useMemo, useState } from 'react';
import './CoursePage.css';

interface Course {
    code?: string;
    title?: string;
    type?: string;
    faculty?: string;
    slot?: string;
    room?: string;
}

interface CoursePageProps {
    courses?: Course[];
}

interface Accent {
    main: string;
    soft: string;
}

// Accent color is derived from the course type, so color carries real
// meaning (what kind of course this is) rather than decorating at random.
const TYPE_ACCENTS: Record<string, Accent> = {
    lab: { main: '#fbbf24', soft: 'rgba(251, 191, 36, 0.14)' },
    elective: { main: '#a78bfa', soft: 'rgba(167, 139, 250, 0.14)' },
    project: { main: '#38bdf8', soft: 'rgba(56, 189, 248, 0.14)' },
    theory: { main: '#34d399', soft: 'rgba(52, 211, 153, 0.14)' },
    core: { main: '#34d399', soft: 'rgba(52, 211, 153, 0.14)' },
};
const DEFAULT_ACCENT: Accent = { main: '#34d399', soft: 'rgba(52, 211, 153, 0.14)' };

function getAccent(type?: string): Accent {
    if (!type) return DEFAULT_ACCENT;
    const key = type.trim().toLowerCase();
    const match = Object.keys(TYPE_ACCENTS).find((k) => key.includes(k));
    return match ? TYPE_ACCENTS[match] : DEFAULT_ACCENT;
}

function getInitials(course: Course): string {
    const src = course.code || course.title || '';
    const clean = src.replace(/[^a-zA-Z0-9]/g, '');
    return clean.slice(0, 2).toUpperCase() || '—';
}

const ClockIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 6v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const UserIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="7" r="3.1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4 16.2c0-2.9 2.7-4.6 6-4.6s6 1.7 6 4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);

const PinIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 17.5s5.5-4.7 5.5-9A5.5 5.5 0 1 0 4.5 8.5c0 4.3 5.5 9 5.5 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="10" cy="8.5" r="1.9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8.7" cy="8.7" r="5.7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16.5 16.5l-3.3-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

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

const CoursePage: React.FC<CoursePageProps> = ({ courses }) => {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        if (!courses) return [];
        const q = query.trim().toLowerCase();
        if (!q) return courses;
        return courses.filter((c) =>
            [c.code, c.title, c.faculty, c.room, c.type].some((v) => v?.toLowerCase().includes(q))
        );
    }, [courses, query]);

    const hasCourses = !!courses && courses.length > 0;

    return (
        <div className="cp-page">
            <header className="cp-header">
                <div className="cp-heading">
                    <span className="cp-eyebrow">Semester Schedule</span>
                    <h1 className="cp-title">Time Table Courses</h1>
                    <p className="cp-subtitle">
                        {hasCourses
                            ? query
                                ? `Showing ${filtered.length} of ${courses!.length} courses`
                                : `${courses!.length} course${courses!.length === 1 ? '' : 's'} enrolled this term`
                            : 'Your enrolled courses will appear here'}
                    </p>
                </div>

                {hasCourses && (
                    <div className="cp-search">
                        <span className="cp-search-icon"><SearchIcon /></span>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by code, title, or faculty"
                            aria-label="Search courses"
                            className="cp-search-input"
                        />
                    </div>
                )}
            </header>

            {hasCourses ? (
                filtered.length > 0 ? (
                    <div className="cp-grid">
                        {filtered.map((course, index) => {
                            const accent = getAccent(course.type);
                            return (
                                <article
                                    key={`${course.code || course.title}-${index}`}
                                    className="cp-card"
                                    style={
                                        {
                                            '--cp-accent': accent.main,
                                            '--cp-accent-soft': accent.soft,
                                            animationDelay: `${Math.min(index, 10) * 45}ms`,
                                        } as React.CSSProperties
                                    }
                                >
                                    <div className="cp-card-top">
                                        <div className="cp-monogram">{getInitials(course)}</div>
                                        <div className="cp-card-heading">
                                            <span className="cp-code">{course.code || 'No code'}</span>
                                            {course.type && <span className="cp-type-badge">{course.type}</span>}
                                        </div>
                                    </div>

                                    <h3 className="cp-course-title">{course.title || 'Untitled course'}</h3>

                                    <div className="cp-divider" />

                                    <dl className="cp-meta">
                                        <div className="cp-meta-item">
                                            <dt><ClockIcon /><span>Slot</span></dt>
                                            <dd>{course.slot || 'N/A'}</dd>
                                        </div>
                                        <div className="cp-meta-item cp-meta-item--wide">
                                            <dt><UserIcon /><span>Faculty</span></dt>
                                            <dd>{course.faculty || 'N/A'}</dd>
                                        </div>
                                        <div className="cp-meta-item">
                                            <dt><PinIcon /><span>Room</span></dt>
                                            <dd>{course.room || 'N/A'}</dd>
                                        </div>
                                    </dl>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="cp-empty">
                        <div className="cp-empty-icon"><SearchIcon /></div>
                        <h3>No courses match &ldquo;{query}&rdquo;</h3>
                        <p>Try a different code, title, or faculty name.</p>
                        <button type="button" className="cp-clear-btn" onClick={() => setQuery('')}>
                            Clear search
                        </button>
                    </div>
                )
            ) : (
                <div className="cp-empty">
                    <div className="cp-empty-icon"><CalendarIcon /></div>
                    <h3>No enrolled courses found</h3>
                    <p>Once your timetable syncs, your courses will show up here.</p>
                </div>
            )}
        </div>
    );
};

export default CoursePage;