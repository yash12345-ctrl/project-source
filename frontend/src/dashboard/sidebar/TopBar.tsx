import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './Sidebar.css';

interface TopBarProps {
    activeTab: string;
    userName: string;
    isBackgroundSyncing: boolean;
}

const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const TopBar: React.FC<TopBarProps> = ({
    activeTab,
    userName,
    isBackgroundSyncing
}) => {
    const { theme, toggleTheme } = useTheme();

    const getPageTitle = (tab: string) => {
        switch (tab) {
            case 'profile': return 'Student Profile';
            case 'courses': return 'Course Page';
            case 'attendance': return 'Attendance';
            case 'internal-marks': return 'Internal Marks';
            case 'marks': return 'Grade and Credit';
            case 'fees': return 'Fees structure';
            case 'calendar': return 'Academic Calendar';
            case 'calculator': return 'GPA Calculator';
            case 'faculty-finder': return 'Faculty Finder';
            case 'mess': return 'Mess Menu';
            case 'study': return 'Study Material';
            case 'sem1': return 'Semester 1 Resources';
            case 'timetable': default: return 'My Time Table';
        }
    };

    const initials = userName
        ? userName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : 'S';

    return (
        <header className="top-header">
            <div className="topbar-brand" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="topbar-gold" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FEF3C7" />
                            <stop offset="0.45" stopColor="#FBBF24" />
                            <stop offset="1" stopColor="#B45309" />
                        </linearGradient>
                    </defs>
                    <path d="M2.5 8.5L7 12L12 5L17 12L21.5 8.5L19.5 17H4.5L2.5 8.5Z" fill="url(#topbar-gold)" />
                    <rect x="4.5" y="18.5" width="15" height="2" rx="1" fill="url(#topbar-gold)" />
                </svg>
            </div>

            <div className="welcome-text">
                <span className="eyebrow">{activeTab.toUpperCase().replace('-', ' ')}</span>
                <h1>{getPageTitle(activeTab)}</h1>
            </div>

            <div className="header-actions">
                        {isBackgroundSyncing && (
                            <>
                                <span className="sync-status">
                                    <span className="sync-dot"></span>
                                    Syncing
                                </span>
                                <div className="header-divider"></div>
                            </>
                        )}

                {/* Theme Toggle */}
                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                >
                    <span className="theme-toggle-track">
                        <span className="theme-toggle-thumb">
                            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                        </span>
                    </span>
                </button>

                <div className="header-divider"></div>

                <button className="user-chip">
                    <span className="user-avatar">{initials}</span>
                    <span className="user-name">{userName}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
        </header>
    );
};

export default TopBar;