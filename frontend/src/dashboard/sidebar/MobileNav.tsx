import React, { useEffect, useState } from 'react';
import {
    User,
    BookOpen,
    CalendarDays,
    ClipboardCheck,
    LayoutGrid,
    FileText,
    Layers,
    Wallet,
    Calendar,
    Calculator,
    Users,
    Coffee,
    Library,
    LogOut,
    X
} from 'lucide-react';
import './MobileNav.css';

interface MobileNavProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    handleLogout: () => void;
}

type NavEntry = { id: string; label: string; icon: React.ReactNode };

const ICON = 20;

// Always visible in the bottom bar
const PRIMARY: NavEntry[] = [
    { id: 'profile', label: 'Profile', icon: <User size={ICON} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen size={ICON} /> },
    { id: 'timetable', label: 'Timetable', icon: <CalendarDays size={ICON} /> },
    { id: 'attendance', label: 'Attendance', icon: <ClipboardCheck size={ICON} /> }
];

// Shown inside the "More" sheet
const SECONDARY: NavEntry[] = [
    { id: 'internal-marks', label: 'Internal Marks', icon: <FileText size={22} /> },
    { id: 'marks', label: 'Grade & Credit', icon: <Layers size={22} /> },
    { id: 'fees', label: 'Fees', icon: <Wallet size={22} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={22} /> },
    { id: 'calculator', label: 'GPA Calc', icon: <Calculator size={22} /> },
    { id: 'faculty-finder', label: 'Faculty', icon: <Users size={22} /> },
    { id: 'mess', label: 'Mess Menu', icon: <Coffee size={22} /> },
    { id: 'study', label: 'Study', icon: <Library size={22} /> }
];

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, handleLogout }) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    // 'sem1' lives under Study
    const normalizedTab = activeTab === 'sem1' ? 'study' : activeTab;
    const moreActive = SECONDARY.some((s) => s.id === normalizedTab);

    useEffect(() => {
        if (!sheetOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSheetOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [sheetOpen]);

    const go = (id: string) => {
        setActiveTab(id);
        setSheetOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <div
                className={`mnav-backdrop ${sheetOpen ? 'open' : ''}`}
                onClick={() => setSheetOpen(false)}
                aria-hidden="true"
            />

            <section
                className={`mnav-sheet ${sheetOpen ? 'open' : ''}`}
                role="dialog"
                aria-label="More options"
                aria-hidden={!sheetOpen}
            >
                <div className="mnav-grabber" />
                <div className="mnav-sheet-header">
                    <h2>Explore</h2>
                    <button className="mnav-close" onClick={() => setSheetOpen(false)} aria-label="Close menu">
                        <X size={18} />
                    </button>
                </div>

                <div className="mnav-grid">
                    {SECONDARY.map((item) => (
                        <button
                            key={item.id}
                            className={`mnav-tile ${normalizedTab === item.id ? 'active' : ''}`}
                            onClick={() => go(item.id)}
                            tabIndex={sheetOpen ? 0 : -1}
                        >
                            <span className="mnav-tile-icon">{item.icon}</span>
                            <span className="mnav-tile-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                <button className="mnav-logout" onClick={handleLogout} tabIndex={sheetOpen ? 0 : -1}>
                    <LogOut size={18} />
                    Log out
                </button>
            </section>

            <nav className="mnav-bar" aria-label="Primary navigation">
                {PRIMARY.map((item) => (
                    <button
                        key={item.id}
                        className={`mnav-item ${normalizedTab === item.id ? 'active' : ''}`}
                        onClick={() => go(item.id)}
                        aria-current={normalizedTab === item.id ? 'page' : undefined}
                    >
                        <span className="mnav-icon">{item.icon}</span>
                        <span className="mnav-label">{item.label}</span>
                    </button>
                ))}

                <button
                    className={`mnav-item ${moreActive || sheetOpen ? 'active' : ''}`}
                    onClick={() => setSheetOpen((o) => !o)}
                    aria-expanded={sheetOpen}
                >
                    <span className="mnav-icon"><LayoutGrid size={ICON} /></span>
                    <span className="mnav-label">More</span>
                </button>
            </nav>
        </>
    );
};

export default MobileNav;
