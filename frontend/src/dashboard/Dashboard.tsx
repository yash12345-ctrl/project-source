import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AttendanceTab from './AttendanceTab';
import MarksTab from './MarksTab';
import FeeTab from './FeeTab';
import CalendarTab from './CalendarTab';
import CalculatorTab from './CalculatorTab';
import FacultyFinderTab from './FacultyFinderTab';
import MessTab from './MessTab';
import Study from './Study';
import Sem1 from './Sem1';


import { SkeletonLoader } from '../components/SkeletonLoader';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [data, setData] = useState<any>(() => {
    if (location.state?.data) {
      localStorage.setItem('academia_data', JSON.stringify(location.state.data));
      return location.state.data;
    }
    const cached = localStorage.getItem('academia_data');
    return cached ? JSON.parse(cached) : null;
  });
  
  const [attendanceData, setAttendanceData] = useState<any[] | null>(() => {
    const cached = localStorage.getItem('academia_attendance');
    const cachedUser = localStorage.getItem('academia_attendance_user');
    const creds = localStorage.getItem('academia_credentials');
    
    if (cached && cachedUser && creds) {
      try {
        const { username } = JSON.parse(creds);
        if (username === cachedUser) {
          return JSON.parse(cached);
        }
      } catch (e) {}
    }
    return null;
  });
  
  const [gradesData, setGradesData] = useState<any[] | null>(() => {
    const cached = localStorage.getItem('academia_grades');
    const cachedUser = localStorage.getItem('academia_attendance_user');
    const creds = localStorage.getItem('academia_credentials');
    if (cached && cachedUser && creds) {
      try {
        const { username } = JSON.parse(creds);
        if (username === cachedUser) {
          const parsed = JSON.parse(cached);
          // Check if it's the new schema with grouped courses
          if (parsed.length > 0 && !parsed[0].courses) {
             return null;
          }
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [cgpa, setCgpa] = useState<string | null>(() => {
    return localStorage.getItem('academia_cgpa') || null;
  });

  const [feeData, setFeeData] = useState<any | null>(() => {
    const cached = localStorage.getItem('academia_fees');
    const cachedUser = localStorage.getItem('academia_attendance_user');
    const creds = localStorage.getItem('academia_credentials');
    if (cached && cachedUser && creds) {
      try {
        const { username } = JSON.parse(creds);
        if (username === cachedUser) {
          return JSON.parse(cached);
        }
      } catch (e) {}
    }
    return null;
  });
  
  const [calendarData, setCalendarData] = useState<any | null>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'courses' | 'timetable' | 'attendance' | 'internal-marks' | 'marks' | 'fees' | 'calendar' | 'calculator' | 'faculty-finder' | 'mess' | 'study' | 'sem1'>('profile');
  const [refreshing, setRefreshing] = useState(false);
  // Default to true if we don't have data, so we show skeletons immediately
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(!location.state?.data && !localStorage.getItem('academia_data'));
  const [syncError, setSyncError] = useState<string | null>(null);
  // Track if a background scrape is still in progress (pending: true from login)
  const [isPendingScrape, setIsPendingScrape] = useState<boolean>(location.state?.pending === true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll backend for fresh data when a background scrape is in progress
  useEffect(() => {
    if (!isPendingScrape) return;
    const creds = localStorage.getItem('academia_credentials');
    if (!creds) return;
    const { username } = JSON.parse(creds);

    console.log('[Dashboard] Background scrape in progress, polling for fresh data...');
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/academia/cached/${encodeURIComponent(username)}`);
        if (res.ok) {
          const freshData = await res.json();
          if (freshData.success) {
            console.log('[Dashboard] Fresh data arrived! Updating dashboard.');
            setData(freshData);
            localStorage.setItem('academia_data', JSON.stringify(freshData));
            setIsPendingScrape(false);
            setIsBackgroundSyncing(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          }
        }
      } catch (e) { /* ignore poll errors */ }
    }, 3000);

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [isPendingScrape]);

  useEffect(() => {
    if (!location.state?.data && !location.state?.pending) {
      handleBackgroundSync();
    }
  }, []);

  const handleBackgroundSync = async () => {
    const savedCreds = localStorage.getItem('academia_credentials');
    if (!savedCreds) {
      setIsBackgroundSyncing(false);
      return;
    }
    
    try {
      setIsBackgroundSyncing(true);
      const { username, password } = JSON.parse(savedCreds);
      const response = await fetch('http://localhost:5000/api/academia/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (result.success) {
        setData(result);
        localStorage.setItem('academia_data', JSON.stringify(result));
        setSyncError(null);
      } else {
        setSyncError(result.error || 'Failed to sync data.');
        return; // Don't proceed to sync portal data if main login failed
      }

      // 2. Fetch Portal Password
      let portalPwd = localStorage.getItem('portal_password');

      // 3. Sequentially sync Portal Data (Attendance, Grades, Fees, Calendar) ONLY if portal password is known
      if (portalPwd) {
        // Attendance
      try {
        const attRes = await fetch('http://localhost:5000/api/attendance/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: portalPwd })
        });
        const attData = await attRes.json();
        if (attData.success) {
          setAttendanceData(attData.attendance);
          localStorage.setItem('academia_attendance', JSON.stringify(attData.attendance));
          localStorage.setItem('academia_attendance_user', username);
          localStorage.setItem('portal_password', portalPwd);
        }
      } catch (e) { console.error('Bg sync attendance failed', e); }

      // Grades
      try {
        const gradeRes = await fetch('http://localhost:5000/api/grades/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: portalPwd })
        });
        const gradeData = await gradeRes.json();
        if (gradeData.success) {
          setGradesData(gradeData.semesters);
          setCgpa(gradeData.cgpa);
          localStorage.setItem('academia_grades', JSON.stringify(gradeData.semesters));
          if (gradeData.cgpa) localStorage.setItem('academia_cgpa', gradeData.cgpa);
        }
      } catch (e) { console.error('Bg sync grades failed', e); }

      // Fees
      try {
        const feeRes = await fetch('http://localhost:5000/api/fee/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: portalPwd })
        });
        const feeData = await feeRes.json();
        if (feeData.success) {
          setFeeData(feeData.feeData);
          localStorage.setItem('academia_fees', JSON.stringify(feeData.feeData));
        }
      } catch (e) { console.error('Bg sync fees failed', e); }

      // Calendar
      try {
        const calRes = await fetch('http://localhost:5000/api/calendar/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password: portalPwd })
        });
        const calData = await calRes.json();
        if (calData.success) {
          setCalendarData(calData.calendar);
          // Calendar isn't cached in localStorage currently, but setting state makes it instant
        }
      } catch (e) { console.error('Bg sync calendar failed', e); }
      }

    } catch (err: any) {
      console.error('Background sync failed:', err);
      setSyncError(`Network or server error: ${err.message || 'Check console'}`);
    } finally {
      setIsBackgroundSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('academia_credentials');
    localStorage.removeItem('academia_data');
    localStorage.removeItem('academia_attendance');
    localStorage.removeItem('academia_grades');
    localStorage.removeItem('academia_sgpa');
    localStorage.removeItem('portal_password');
    navigate('/');
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const savedCreds = localStorage.getItem('academia_credentials');
      if (savedCreds) {
        const { username, password } = JSON.parse(savedCreds);
        const response = await fetch('http://localhost:5000/api/academia/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (result.success) {
          setData(result);
          localStorage.setItem('academia_data', JSON.stringify(result));
        } else {
          alert('Failed to refresh data: ' + result.message);
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      alert('Error refreshing data');
    } finally {
      setRefreshing(false);
    }
  };

  if (!data) {
    // If still syncing show the skeleton inside the proper dashboard layout
    if (isBackgroundSyncing || isPendingScrape || refreshing) {
      return (
        <div className="dashboard-container">
          <aside className="sidebar">
            <div className="brand-logo sidebar-logo">
              <div className="logo-mark"></div>
              <span>BrainMint</span>
            </div>
            {/* Ghost nav items */}
            <nav className="sidebar-nav">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ margin: '0.4rem 1rem', height: '40px', borderRadius: '8px' }} className="pulse"></div>
              ))}
            </nav>
          </aside>
          <main className="main-content">
            <SkeletonLoader type="profile" />
          </main>
        </div>
      );
    }
    
    // Not syncing and no data — show error/empty state
    return (
      <div className="dashboard-container">
        <aside className="sidebar">
          <div className="brand-logo sidebar-logo">
            <div className="logo-mark"></div>
            <span>BrainMint</span>
          </div>
        </aside>
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <p>{syncError || 'No academic data found. Please log in again.'}</p>
            <button onClick={handleLogout} className="primary-btn">Go to Login</button>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand-logo sidebar-logo">
          <div className="logo-mark"></div>
          <span>BrainMint</span>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Student Profile
          </button>
          <button 
            className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Course Page
          </button>
          <button 
            className={`nav-item ${activeTab === 'timetable' ? 'active' : ''}`}
            onClick={() => setActiveTab('timetable')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            My Time Table
          </button>
          <button 
            className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Attendance
          </button>
          <button 
            className={`nav-item ${activeTab === 'internal-marks' ? 'active' : ''}`}
            onClick={() => setActiveTab('internal-marks')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            Internal Marks
          </button>
          <button 
            className={`nav-item ${activeTab === 'marks' ? 'active' : ''}`}
            onClick={() => setActiveTab('marks')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Grade and Credit
          </button>
          <button 
            className={`nav-item ${activeTab === 'fees' ? 'active' : ''}`}
            onClick={() => setActiveTab('fees')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Fees structure
          </button>
          <button 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            Academic Calendar
          </button>
          <button 
            className={`nav-item ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="8" y1="6" x2="16" y2="6"></line>
              <line x1="16" y1="14" x2="16" y2="14"></line>
              <line x1="16" y1="10" x2="16" y2="10"></line>
              <line x1="16" y1="18" x2="16" y2="18"></line>
              <line x1="12" y1="14" x2="12" y2="14"></line>
              <line x1="12" y1="10" x2="12" y2="10"></line>
              <line x1="12" y1="18" x2="12" y2="18"></line>
              <line x1="8" y1="14" x2="8" y2="14"></line>
              <line x1="8" y1="10" x2="8" y2="10"></line>
              <line x1="8" y1="18" x2="8" y2="18"></line>
            </svg>
            GPA Calculator
          </button>
          <button 
            className={`nav-item ${activeTab === 'faculty-finder' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty-finder')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <circle cx="18" cy="11" r="3"></circle>
              <line x1="20" y1="13" x2="22" y2="15"></line>
            </svg>
            Faculty Finder
          </button>
          <button 
            className={`nav-item ${activeTab === 'mess' ? 'active' : ''}`}
            onClick={() => setActiveTab('mess')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
              <line x1="6" y1="1" x2="6" y2="4"/>
              <line x1="10" y1="1" x2="10" y2="4"/>
              <line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
            Mess Menu
          </button>
          <button 
            className={`nav-item ${activeTab === 'study' ? 'active' : ''}`}
            onClick={() => setActiveTab('study')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Study Material
          </button>
        </nav>
        
        <div className="sidebar-footer">
          
          <button onClick={handleLogout} className="logout-btn sidebar-logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="welcome-text">
            <h1>{activeTab === 'profile' ? 'Student Profile' : activeTab === 'courses' ? 'Course Page' : activeTab === 'attendance' ? 'Attendance' : activeTab === 'internal-marks' ? 'Internal Marks' : activeTab === 'marks' ? 'Grade and Credit' : activeTab === 'fees' ? 'Fees structure' : activeTab === 'calculator' ? 'GPA Calculator' : activeTab === 'faculty-finder' ? 'Faculty Finder' : activeTab === 'mess' ? 'Mess Menu' : activeTab === 'study' ? 'Study Material' : activeTab === 'sem1' ? 'Semester 1 Resources' : 'My Time Table'}</h1>
            <p className="subtitle">Welcome back, {data?.profile?.name || data?.username || 'Student'}</p>
          </div>
          {activeTab !== 'calculator' && activeTab !== 'internal-marks' && activeTab !== 'faculty-finder' && activeTab !== 'mess' && activeTab !== 'study' && activeTab !== 'sem1' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {isBackgroundSyncing && (
                <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="spinner" style={{ width: '12px', height: '12px', borderTopColor: '#10b981' }}></div> 
                  Syncing in background...
                </span>
              )}
              <button 
                className={`refresh-btn ${refreshing || isBackgroundSyncing ? 'spinning' : ''}`} 
                onClick={handleRefresh}
                disabled={refreshing || isBackgroundSyncing}
              >
                {refreshing || isBackgroundSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}
        </header>
        
        <div className="content-area">
          {activeTab === 'profile' ? (
            <div className="profile-section">
              <div className="profile-card">
                <div className="profile-avatar">
                  <span>{data?.profile?.name?.charAt(0).toUpperCase() || data?.username?.charAt(0).toUpperCase() || 'S'}</span>
                </div>
                <div className="profile-info">
                  <h2>{data?.profile?.name || data?.username}</h2>
                  <p className="profile-email">{data?.profile?.registrationNumber || data?.username}</p>
                  
                  <div className="profile-details-grid">
                    {data.profile && (
                      <>
                        <div className="detail-item">
                          <span className="detail-label">Program</span>
                          <span className="detail-value">{data.profile.program}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Department</span>
                          <span className="detail-value">{data.profile.department}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Semester</span>
                          <span className="detail-value">{data.profile.semester} (Batch {data.profile.batch})</span>
                        </div>
                      </>
                    )}
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className="detail-value success">Active Student</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Platform</span>
                      <span className="detail-value">SRM Academia</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Synced</span>
                      <span className="detail-value">
                        {data?.scrapedAt ? new Date(data.scrapedAt).toLocaleString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'courses' ? (
            <div className="data-grid full-width">
              <section className="data-card">
                <h2>Time Table Courses</h2>
                {data.courses && data.courses.length > 0 ? (
                  <ul className="course-list">
                    {data.courses.map((course: any, index: number) => (
                      <li key={index} className="course-item detailed-course">
                        <div className="course-main-info">
                          <span className="course-code">{course.code}</span>
                          <div className="course-title-row">
                            <span className="course-name">{course.title}</span>
                            {course.type && <span className="course-type-badge">{course.type}</span>}
                          </div>
                        </div>
                        <div className="course-stats-group extended-stats">
                          <div className="stat-pill"><span className="stat-label">Faculty:</span> {course.faculty || 'N/A'}</div>
                          <div className="stat-pill"><span className="stat-label">Slot:</span> {course.slot || 'N/A'}</div>
                          <div className="stat-pill"><span className="stat-label">Room:</span> {course.room || 'N/A'}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-data">
                    <p>No enrolled courses found.</p>
                  </div>
                )}
              </section>
            </div>
          ) : activeTab === 'timetable' ? (
            <div className="timetable-container full-width">
              <section className="data-card timetable-card">
                <h2>My Unified Time Table</h2>
                {data.timetableGrid && Object.keys(data.timetableGrid).length > 0 ? (
                  <div className="table-responsive">
                    <table className="timetable-matrix">
                      <thead>
                        <tr>
                          <th>Day / Time</th>
                          {data.timetableGrid[Object.keys(data.timetableGrid)[0]].map((cell: any, idx: number) => (
                            <th key={idx}>{cell.time}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(data.timetableGrid).map(([day, cells]: [string, any]) => (
                          <tr key={day}>
                            <td className="day-label"><strong>{day}</strong></td>
                            {cells.map((cell: any, idx: number) => {
                              const baseSlot = cell.slot ? cell.slot.split('/')[0].trim() : '';
                              const matchedCourse = baseSlot ? data.courses?.find((c: any) => c.slot && c.slot.split('-').some((s: string) => s.trim() === baseSlot)) : null;
                              
                              return (
                                <td key={idx} className={`slot-cell ${matchedCourse ? 'has-course' : 'free-slot'}`}>
                                  {matchedCourse ? (
                                    <div className="course-block">
                                      <div className="course-code-small" title={matchedCourse.code}>{matchedCourse.title}</div>
                                      <div className="course-room-small">{matchedCourse.room}</div>
                                      <div className="slot-badge">{cell.slot}</div>
                                    </div>
                                  ) : (
                                    <div className="free-block">
                                      {cell.slot ? cell.slot : '-'}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No timetable grid found. Please try syncing again.</p>
                  </div>
                )}
              </section>
            </div>
          ) : activeTab === 'attendance' ? (
            <AttendanceTab 
              attendanceData={attendanceData} 
              setAttendanceData={setAttendanceData} 
              savedUsername={data?.username} 
            />
          ) : activeTab === 'internal-marks' ? (
            <div className="data-grid full-width" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" style={{ marginBottom: '1rem' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <h2 style={{ color: '#475569', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Internal Marks Coming Soon!</h2>
                <p style={{ color: '#64748b' }}>We are working on bringing your internal assessment marks here.</p>
              </div>
            </div>
          ) : activeTab === 'faculty-finder' ? (
            <FacultyFinderTab courses={data?.courses || []} />
          ) : activeTab === 'mess' ? (
            <MessTab />
          ) : activeTab === 'study' ? (
            <Study onSelectSemester={(sem) => {
              if (sem === 1) setActiveTab('sem1');
            }} />
          ) : activeTab === 'sem1' ? (
            <Sem1 onBack={() => setActiveTab('study')} />
          ) : activeTab === 'marks' ? (
            <MarksTab 
              gradesData={gradesData} 
              setGradesData={setGradesData}
              cgpa={cgpa}
              setCgpa={setCgpa}
              savedUsername={data?.username}
            />
          ) : activeTab === 'fees' ? (
            <FeeTab 
              feeData={feeData}
              setFeeData={setFeeData}
              savedUsername={data?.username}
            />
          ) : null}
          {activeTab === 'calendar' && (
            <CalendarTab 
              calendarData={calendarData} 
              setCalendarData={setCalendarData} 
              savedUsername={data?.username || ''} 
            />
          )}
          {activeTab === 'calculator' && (
            <CalculatorTab />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
