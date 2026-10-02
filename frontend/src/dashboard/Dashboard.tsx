import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Import newly created sidebar components
import Sidebar from './sidebar/Sidebar';
import TopBar from './sidebar/TopBar';

import StudentProfile from './student_profile/StudentProfile';
import CoursePage from './course_page/CoursePage';
import TimetablePage from './timetable/TimetablePage';
import AttendanceTab from './AttendanceTab';
import MarksTab from './MarksTab';
import InternalMarksTab from './InternalMarksTab';
import FeeTab from './fees/FeeTab';
import CalendarTab from './CalendarTab';
import CalculatorTab from './CalculatorTab';
import ComingSoon from './coming_soon/ComingSoon';
import SplashScreen from './splash_screen/SplashScreen';
import Study from './Study';
import Sem1 from './Sem1';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

const BackgroundVideo = ({ theme }: { theme: 'light' | 'dark' }) => {
  if (theme === 'light') {
    return (
      <div className="bg-light-premium">
        <div className="bg-light-orb bg-light-orb-1" />
        <div className="bg-light-orb bg-light-orb-2" />
        <div className="bg-light-orb bg-light-orb-3" />
        <div className="bg-light-grid" />
      </div>
    );
  }
  return (
    <>
      <video
        className="bg-video"
        autoPlay
        loop
        muted
        playsInline
        src="/v2.mp4"
      />
      <div className="bg-video-overlay" />
    </>
  );
};

const DashboardInner: React.FC<{sessionUsername: string}> = ({ sessionUsername }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [data, _setData] = useState<any>(() => {
    if (location.state?.data) {
      localStorage.setItem(
        'academia_data',
        JSON.stringify(location.state.data)
      );

      return location.state.data;
    }

    const cached = localStorage.getItem('academia_data');

    return cached
      ? JSON.parse(cached)
      : null;
  });

  // ==========================================
  // ATTENDANCE DATA
  // ==========================================

  const [attendanceData, setAttendanceData] =
    useState<any[] | null>(() => {

      const cached =
        localStorage.getItem('academia_attendance');

      const cachedUser =
        localStorage.getItem('academia_attendance_user');

      const creds =
        JSON.stringify({ username: sessionUsername });

      if (cached && cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);

          if (username === cachedUser) {
            return JSON.parse(cached);
          }
        } catch (e) {
          // Ignore invalid cached data
        }
      }

      return null;
    });

  // ==========================================
  // GRADES DATA
  // ==========================================

  const [gradesData, setGradesData] =
    useState<any[] | null>(() => {

      const cached =
        localStorage.getItem('academia_grades');

      const cachedUser =
        localStorage.getItem('academia_grades_user');

      const creds =
        JSON.stringify({ username: sessionUsername });

      if (cached && cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);

          if (username === cachedUser) {
            const parsed = JSON.parse(cached);

            if (
              parsed.length > 0 &&
              !parsed[0].courses
            ) {
              return null;
            }

            return parsed;
          }
        } catch (e) {
          // Ignore invalid cached data
        }
      }

      return null;
    });

  // ==========================================
  // INTERNAL MARKS DATA
  // ==========================================

  const [internalMarksData, setInternalMarksData] =
    useState<any[] | null>(() => {
      const cached = localStorage.getItem('academia_internalmarks');
      const cachedUser = localStorage.getItem('academia_internalmarks_user');
      const creds = JSON.stringify({ username: sessionUsername });

      if (cached && cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);
          if (username === cachedUser) {
            return JSON.parse(cached);
          }
        } catch (e) {
          // Ignore
        }
      }
      return null;
    });

  // ==========================================
  // CGPA
  // ==========================================

  const [cgpa, setCgpa] =
    useState<string | null>(() => {

      const cachedUser =
        localStorage.getItem('academia_grades_user');

      const creds =
        JSON.stringify({ username: sessionUsername });

      if (cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);

          if (username === cachedUser) {
            return (
              localStorage.getItem('academia_cgpa') ||
              null
            );
          }
        } catch (e) {
          // Ignore invalid cached data
        }
      }

      return null;
    });

  // ==========================================
  // FEES DATA
  // ==========================================

  const [feeData, setFeeData] =
    useState<any | null>(() => {

      const cached =
        localStorage.getItem('academia_fees');

      const cachedUser =
        localStorage.getItem('academia_fees_user');

      const creds =
        JSON.stringify({ username: sessionUsername });

      if (cached && cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);

          if (username === cachedUser) {
            return JSON.parse(cached);
          }
        } catch (e) {
          // Ignore invalid cached data
        }
      }

      return null;
    });

  // ==========================================
  // CALENDAR DATA
  // ==========================================

  const [calendarData, setCalendarData] =
    useState<any | null>(() => {

      const cached =
        localStorage.getItem('academia_calendar');

      const cachedUser =
        localStorage.getItem('academia_calendar_user');

      const creds =
        JSON.stringify({ username: sessionUsername });

      if (cached && cachedUser && creds) {
        try {
          const { username } = JSON.parse(creds);

          if (username === cachedUser) {
            return JSON.parse(cached);
          }
        } catch (e) {
          // Ignore invalid cached data
        }
      }

      return null;
    });

  // ==========================================
  // TODAY'S DAY ORDER
  // ==========================================
  const todayDayOrder = useMemo(() => {
    if (!calendarData?.rows) return null;
    
    const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const parseDate = (s: string) => {
      const clean = s.replace(/today/i, '').trim();
      let m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      m = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      m = clean.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/);
      if (m) {
        const idx = MONTH_NAMES.findIndex(mo => m![2].toLowerCase().startsWith(mo));
        if (idx >= 0) return new Date(Number(m[3]), idx, Number(m[1]));
      }
      return new Date(clean);
    };

    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    const row = calendarData.rows.find((r: any) => {
      if (!r.date) return false;
      const d = parseDate(r.date.trim());
      if (!d || isNaN(d.getTime())) return false;
      return d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD;
    });

    return (row?.dayOrder && row.dayOrder !== '-') ? row.dayOrder : null;
  }, [calendarData]);

  // ==========================================
  // UI STATE
  // ==========================================

  const [
    activeTab,
    setActiveTab
  ] = useState<
    'profile' |
    'courses' |
    'timetable' |
    'attendance' |
    'internal-marks' |
    'marks' |
    'fees' |
    'calendar' |
    'calculator' |
    'faculty-finder' |
    'mess' |
    'study' |
    'sem1'
  >(() => {
    return (localStorage.getItem('dashboard_active_tab') as any) || 'profile';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_active_tab', activeTab);
  }, [activeTab]);



  const [
    isBackgroundSyncing,
    setIsBackgroundSyncing
  ] = useState<boolean>(
    !location.state?.data &&
    !localStorage.getItem('academia_data')
  );

  const [syncError, _setSyncError] =
    useState<string | null>(null);

  const [isPendingScrape, _setIsPendingScrape] =
    useState<boolean>(
      location.state?.pending === true
    );

  const [portalError, setPortalError] =
    useState<string | null>(null);

  const pollIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  // ==========================================
  // POLL SYNC STATUS
  // ==========================================

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/academia/sync-status');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const isSyncing = data.status === 'queued' || data.status === 'running';
            setIsBackgroundSyncing(isSyncing);
            
            // If it just finished syncing, we could refetch cached data, but
            // for now, just updating the UI is enough.
          }
        }
      } catch (e) {
        // Ignore polling error
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    syncPortalTabs();
  }, []);

  const handlePortalError = (error: string) => {
    setPortalError(error);
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('invalid') || lowerError.includes('incorrect') || lowerError.includes('password') || lowerError.includes('credentials')) {
      // Clear portal password, but DO NOT log out of Academia
      localStorage.removeItem('portal_password');
      // The tabs will show the manual login form
    } else if (lowerError.includes('temporarily locked')) {
      setTimeout(() => {
        setPortalError(null);
        syncPortalTabs(true);
      }, 6 * 60 * 1000); // 6 minutes
    }
  };

  // ==========================================
  // SYNC PORTAL TABS
  // ==========================================

  const syncPortalTabs = async (
    forceSync: boolean = false
  ) => {
    const savedCreds =
      JSON.stringify({ username: sessionUsername });

    const portalPwd = undefined;

    if (!savedCreds) {
      return;
    }

    const { username } =
      JSON.parse(savedCreds);

    await Promise.allSettled([

      // ATTENDANCE

      (async () => {
        try {
          const attRes = await fetch(
            '/api/attendance/login',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json'
              },
              body: JSON.stringify({
                username,
                password: portalPwd,
                forceSync
              })
            }
          );

          const attData =
            await attRes.json();

          if (attData.success) {
            const attendance =
              Array.isArray(
                attData.attendance
              )
                ? attData.attendance
                : [];

            setAttendanceData(
              attendance
            );

            localStorage.setItem(
              'academia_attendance',
              JSON.stringify(attendance)
            );

            localStorage.setItem(
              'academia_attendance_user',
              username
            );
            setPortalError(null);
          } else if (attData.error) {
             handlePortalError(attData.error);
          }
        } catch (e) {
          // Ignore attendance sync error
        }
      })(),

      // GRADES

      (async () => {
        try {
          const gradeRes =
            await fetch(
              '/api/grades/login',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json'
                },
                body: JSON.stringify({
                  username,
                  password: portalPwd,
                  forceSync
                })
              }
            );

          const gradeData =
            await gradeRes.json();

          if (gradeData.success) {
            const semesters =
              Array.isArray(
                gradeData.semesters
              )
                ? gradeData.semesters
                : [];

            setGradesData(
              semesters
            );

            setCgpa(
              gradeData.cgpa || null
            );

            localStorage.setItem(
              'academia_grades',
              JSON.stringify(semesters)
            );
            localStorage.setItem(
              'academia_cgpa',
              String(gradeData.cgpa || '')
            );
            localStorage.setItem(
              'academia_grades_user',
              username
            );
          } else if (gradeData.error && !portalError) { // avoid overwriting the error if attendance already set it
             handlePortalError(gradeData.error);
          }
        } catch (e) {
          // Ignore grade sync error
        }
      })(),

      // FEES

      (async () => {
        try {
          const feeRes =
            await fetch(
              '/api/fees/login',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json'
                },
                body: JSON.stringify({
                  username,
                  password: portalPwd,
                  forceSync
                })
              }
            );

          const nextFeeData =
            await feeRes.json();

          if (nextFeeData.success) {
            setFeeData(
              nextFeeData
            );

            localStorage.setItem(
              'academia_fees',
              JSON.stringify(nextFeeData)
            );

            localStorage.setItem(
              'academia_fees_user',
              username
            );
          } else if (nextFeeData.error && !portalError) {
             handlePortalError(nextFeeData.error);
          }
        } catch (e) {
          // Ignore fees sync error
        }
      })(),

      // CALENDAR

      (async () => {
        try {
          const calRes =
            await fetch(
              '/api/calendar/login',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json'
                },
                body: JSON.stringify({
                  username,
                  password: portalPwd,
                  forceSync
                })
              }
            );

          const calData =
            await calRes.json();

          if (calData.success) {
            setCalendarData(
              calData
            );

            localStorage.setItem(
              'academia_calendar',
              JSON.stringify(calData)
            );

            localStorage.setItem(
              'academia_calendar_user',
              username
            );
          } else if (calData.error && !portalError) {
             handlePortalError(calData.error);
          }
        } catch (e) {
          // Ignore calendar sync error
        }
      })(),

      // INTERNAL MARKS

      (async () => {
        try {
          const internalRes = await fetch('/api/internal-marks/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: portalPwd, forceSync })
          });

          const internalData = await internalRes.json();
          if (internalData.success) {
            const marks = Array.isArray(internalData.marks) ? internalData.marks : [];
            setInternalMarksData(marks);
            localStorage.setItem('academia_internalmarks', JSON.stringify(marks));
            localStorage.setItem('academia_internalmarks_user', username);
          } else if (internalData.error && !portalError) {
             handlePortalError(internalData.error);
          }
        } catch (e) {
          // Ignore internal marks error
        }
      })()
    ]);
  };

  // ==========================================
  // BACKGROUND SYNC
  // ==========================================



  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem(
      'session_token'
    );

    localStorage.removeItem(
      'academia_credentials'
    );

    localStorage.removeItem(
      'academia_data'
    );

    localStorage.removeItem(
      'academia_attendance'
    );

    localStorage.removeItem(
      'academia_attendance_user'
    );

    localStorage.removeItem(
      'academia_grades'
    );

    localStorage.removeItem(
      'academia_grades_user'
    );

    localStorage.removeItem(
      'academia_cgpa'
    );

    localStorage.removeItem(
      'academia_fees'
    );

    localStorage.removeItem(
      'academia_fees_user'
    );

    localStorage.removeItem(
      'academia_calendar'
    );

    localStorage.removeItem(
      'academia_calendar_user'
    );

    localStorage.removeItem(
      'portal_password'
    );

    localStorage.removeItem(
      'dashboard_active_tab'
    );

    navigate('/');
  };



  // ==========================================
  // BACKGROUND VIDEO (shared across all render branches)
  // ==========================================


  // ==========================================
  // LOADING / EMPTY STATE
  // ==========================================

  // Global empty state if NO data exists and NO sync is happening
  const isGlobalLoading = !data && (isBackgroundSyncing || isPendingScrape);
  const isCompletelyEmpty = !data && !attendanceData && !gradesData && !isGlobalLoading;

  if (isGlobalLoading) {
    return <SplashScreen theme={theme} />;
  }

  if (isCompletelyEmpty) {
    return (
      <div className="dashboard-container">
        <BackgroundVideo theme={theme} />

        <Sidebar
          isMinimal={true}
          handleLogout={handleLogout}
        />

        <main
          className="main-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="empty-state">

            <p>
              {syncError ||
                'No academic data found. Please log in again.'}
            </p>

            <button
              onClick={handleLogout}
              className="primary-btn"
            >
              Go to Login
            </button>

          </div>
        </main>

      </div>
    );
  }

  // ==========================================
  // OVERALL ATTENDANCE CALCULATION
  // ==========================================

  const attendanceRows =
    Array.isArray(attendanceData)
      ? attendanceData
      : [];

  const totalAttended =
    attendanceRows.reduce(
      (
        sum: number,
        subject: any
      ) => {
        const attended =
          Number(
            subject?.attended ?? 0
          );

        return (
          sum +
          (
            Number.isFinite(attended)
              ? attended
              : 0
          )
        );
      },
      0
    );

  const totalClasses =
    attendanceRows.reduce(
      (
        sum: number,
        subject: any
      ) => {
        const total =
          Number(
            subject?.maxHours ?? 0
          );

        return (
          sum +
          (
            Number.isFinite(total)
              ? total
              : 0
          )
        );
      },
      0
    );

  const attendancePercent =
    totalClasses > 0
      ? (
        totalAttended /
        totalClasses
      ) * 100
      : undefined;

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="dashboard-container">

      <BackgroundVideo theme={theme} />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
      />

      <main className="main-content">

        <TopBar
          activeTab={activeTab}
          userName={
            data?.profile?.name ||
            data?.username ||
            'Student'
          }
          isBackgroundSyncing={
            isBackgroundSyncing
          }
        />


        <div className="content-area">

          {activeTab === 'attendance' && portalError && (
            <div className="portal-alert-card premium-alert">
              <svg className="portal-alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="portal-alert-content">
                <span className="portal-alert-title">Student Portal Alert</span>
                <p className="portal-alert-message">{portalError}</p>
                {portalError.toLowerCase().includes('temporarily locked') && (
                  <div className="portal-alert-subtext">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    The system will automatically try again in 6 minutes.
                  </div>
                )}
              </div>
            </div>
          )}

          {isGlobalLoading && ['profile', 'courses', 'timetable', 'faculty-finder'].includes(activeTab) ? (
            <SkeletonLoader type="profile" />
          ) : (
            <>
              {activeTab === 'profile' ? (
                <StudentProfile
                  data={data}
                  cgpa={cgpa}
                  attendancePercent={attendancePercent}
                  totalAttended={totalAttended}
                  totalClasses={totalClasses}
                  todayDayOrder={todayDayOrder}
                />
              ) : activeTab === 'courses' ? (
                <CoursePage courses={data?.courses} />
              ) : activeTab === 'timetable' ? (
                <TimetablePage
                  timetableGrid={data?.timetableGrid}
                  courses={data?.courses}
                  todayDayOrder={todayDayOrder}
                />
              ) : activeTab === 'attendance' ? (
                <AttendanceTab
                  attendanceData={attendanceData}
                  setAttendanceData={setAttendanceData}
                  savedUsername={data?.username}
                />
              ) : activeTab === 'internal-marks' ? (
                <InternalMarksTab
                  internalMarksData={internalMarksData}
                  setInternalMarksData={setInternalMarksData}
                  savedUsername={data?.username}
                />
              ) : activeTab === 'faculty-finder' ? (
                <ComingSoon featureName="Faculty Finder" />
              ) : activeTab === 'mess' ? (
                <ComingSoon featureName="Mess Menu" />
              ) : activeTab === 'study' ? (
                <Study onSelectSemester={(sem) => { if (sem === 1) setActiveTab('sem1'); }} />
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
                <FeeTab feeData={feeData} setFeeData={setFeeData} savedUsername={data?.username} />
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
            </>
          )}

        </div>

      </main>

    </div>
  );
};


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sessionUsername, setSessionUsername] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) {
      navigate('/');
      return;
    }
    
    fetch('/api/academia/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setSessionUsername(data.username);
      } else {
        localStorage.removeItem('session_token');
        navigate('/');
      }
    })
    .catch(() => navigate('/'))
    .finally(() => setIsInitializing(false));
  }, [navigate]);

  if (isInitializing || !sessionUsername) {
    return <SplashScreen theme="dark" />;
  }

  return <DashboardInner sessionUsername={sessionUsername} />;
};

export default Dashboard;
