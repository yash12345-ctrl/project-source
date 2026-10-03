import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Import newly created sidebar components
import Sidebar from './sidebar/Sidebar';
import TopBar from './sidebar/TopBar';
import MobileNav from './sidebar/MobileNav';

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
import Sem1 from './Sem1';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

const BackgroundVideo = React.memo(({ theme }: { theme: 'light' | 'dark' }) => {
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
});

const DashboardInner: React.FC<{sessionUsername: string}> = ({ sessionUsername }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [data, setData] = useState<any>(() => {
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
      if (location.state?.data?.attendance) {
        localStorage.setItem('academia_attendance', JSON.stringify(location.state.data.attendance));
        localStorage.setItem('academia_attendance_user', sessionUsername);
        return location.state.data.attendance;
      }

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
      if (location.state?.data?.grades) {
        localStorage.setItem('academia_grades', JSON.stringify(location.state.data.grades));
        localStorage.setItem('academia_grades_user', sessionUsername);
        return location.state.data.grades;
      }

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
      if (location.state?.data?.internalMarks) {
        localStorage.setItem('academia_internalmarks', JSON.stringify(location.state.data.internalMarks));
        localStorage.setItem('academia_internalmarks_user', sessionUsername);
        return location.state.data.internalMarks;
      }
      
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
      if (location.state?.data?.cgpa) {
        localStorage.setItem('academia_cgpa', location.state.data.cgpa);
        return location.state.data.cgpa;
      }

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
      if (location.state?.data?.fees) {
        localStorage.setItem('academia_fees', JSON.stringify(location.state.data.fees));
        localStorage.setItem('academia_fees_user', sessionUsername);
        return location.state.data.fees;
      }

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
      if (location.state?.data?.calendar) {
        localStorage.setItem('academia_calendar', JSON.stringify(location.state.data.calendar));
        localStorage.setItem('academia_calendar_user', sessionUsername);
        return location.state.data.calendar;
      }

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

  const [syncError] =
    useState<string | null>(null);

  const [isPendingScrape] =
    useState<boolean>(
      location.state?.pending === true || location.state?.data?.isNewUser === true
    );

  const [portalError, setPortalError] =
    useState<string | null>(null);

  const pollIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const [isPortalSyncing, setIsPortalSyncing] = useState(false);

  const handlePortalSyncComplete = async () => {
    setIsPortalSyncing(true);
    const token = localStorage.getItem('session_token');
    if (!token) {
      setIsPortalSyncing(false);
      return;
    }

    try {
      const fetchWithToken = (url: string) => fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ manual: true, username: sessionUsername })
      }).then(res => res.json());

      const p1 = fetchWithToken('/api/grades/login').then(res => {
        if (res.success) {
          setGradesData(res.semesters || []);
          localStorage.setItem('academia_grades', JSON.stringify(res.semesters || []));
          localStorage.setItem('academia_grades_user', sessionUsername);
          if (res.cgpa) setCgpa(res.cgpa);
        }
      });
      const p2 = fetchWithToken('/api/fees/login').then(res => {
        if (res.success) {
          setFeeData(res);
          localStorage.setItem('academia_fees', JSON.stringify(res));
          localStorage.setItem('academia_fees_user', sessionUsername);
        }
      });
      const p3 = fetchWithToken('/api/calendar/login').then(res => {
        if (res.success) {
          setCalendarData(res);
          localStorage.setItem('academia_calendar', JSON.stringify(res));
          localStorage.setItem('academia_calendar_user', sessionUsername);
        }
      });
      const p4 = fetchWithToken('/api/internal-marks/login').then(res => {
        if (res.success) {
          setInternalMarksData(res.marks || []);
          localStorage.setItem('academia_internalmarks', JSON.stringify(res.marks || []));
          localStorage.setItem('academia_internalmarks_user', sessionUsername);
        }
      });

      await Promise.allSettled([p1, p2, p3, p4]);

    } finally {
      setIsPortalSyncing(false);
    }
  };

  // ==========================================
  // POLL SYNC STATUS
  // ==========================================

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) return;

    // Only poll if we actually expect an active sync. Returning users with
    // fresh data (isBackgroundSyncing=false, isPendingScrape=false) skip polling entirely.
    if (!isBackgroundSyncing && !isPendingScrape) return;

    const MAX_POLL_MS = 2 * 60 * 1000; // 2-minute hard stop
    const startTime = Date.now();
    let consecutiveErrors = 0;

    pollIntervalRef.current = setInterval(async () => {
      // Hard timeout guard — stop polling after 2 minutes regardless
      if (Date.now() - startTime > MAX_POLL_MS) {
        setIsBackgroundSyncing(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      try {
        const res = await fetch('/api/academia/sync-status', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            // Backend unreachable — stop polling rather than looping forever
            setIsBackgroundSyncing(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
          return;
        }

        consecutiveErrors = 0; // reset on success
        const data = await res.json();
        if (data.success) {
          const isSyncing = data.status === 'queued' || data.status === 'running';
          setIsBackgroundSyncing(isSyncing);

          if (data.sessionToken) {
            localStorage.setItem('session_token', data.sessionToken);
          }
          if (!isSyncing) {
            if (data.profile) {
              setData(data);
              localStorage.setItem('academia_data', JSON.stringify(data));
            }
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        }
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          setIsBackgroundSyncing(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isBackgroundSyncing, isPendingScrape]);

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    // Fetch cached academia data from backend if not already in state
    if (!data?.profile) {
      const token = localStorage.getItem('session_token');
      if (token) {
        fetch('/api/academia/cached', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(cachedData => {
          if (cachedData && cachedData.profile) {
            setData(cachedData);
            localStorage.setItem('academia_data', JSON.stringify(cachedData));
          }
        })
        .catch(() => {});
      }
    }
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
    const username = sessionUsername;
    if (!username) return;


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
            body: JSON.stringify({ username, forceSync })
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

    localStorage.removeItem('academia_internalmarks');
    localStorage.removeItem('academia_internalmarks_user');

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

  // A user has real data if it contains an actual profile
  const hasRealData = data && data.profile;
  const hasAnyData = hasRealData || attendanceData || gradesData;

  // Global loading state: no data exists yet AND a sync is currently running
  const isGlobalLoading = !hasAnyData && (isBackgroundSyncing || isPendingScrape);
  
  // Global empty state: no data exists and NO sync is running (e.g., sync failed)
  const isCompletelyEmpty = !hasAnyData && !isGlobalLoading;

  // Early returns removed to prevent unmounting <BackgroundVideo />


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

      {isGlobalLoading ? (
        <SplashScreen theme={theme} />
      ) : isCompletelyEmpty ? (
        <>
          <Sidebar isMinimal={true} handleLogout={handleLogout} />
          <main
            className="main-content"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div className="empty-state">
              <p>{syncError || 'No academic data found. Please log in again.'}</p>
              <button onClick={handleLogout} className="primary-btn">Go to Login</button>
            </div>
          </main>
        </>
      ) : (
        <>
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
                  onSyncComplete={handlePortalSyncComplete}
                />
              ) : activeTab === 'internal-marks' ? (
                !attendanceData ? (
                  <div className="empty-state" style={{ marginTop: '4rem' }}>
                    <p>Please log in to the student portal via the Attendance tab first.</p>
                    <button onClick={() => setActiveTab('attendance')} className="primary-btn">Go to Attendance</button>
                  </div>
                ) : (
                  <InternalMarksTab
                    internalMarksData={internalMarksData}
                    setInternalMarksData={setInternalMarksData}
                    savedUsername={data?.username}
                    isBackgroundSyncing={isPortalSyncing}
                  />
                )
              ) : activeTab === 'faculty-finder' ? (
                <ComingSoon featureName="Faculty Finder" />
              ) : activeTab === 'mess' ? (
                <ComingSoon featureName="Mess Menu" />
              ) : activeTab === 'study' ? (
                <ComingSoon featureName="Study Materials" />
              ) : activeTab === 'sem1' ? (
                <Sem1 onBack={() => setActiveTab('study')} />
              ) : activeTab === 'marks' ? (
                !attendanceData ? (
                  <div className="empty-state" style={{ marginTop: '4rem' }}>
                    <p>Please log in to the student portal via the Attendance tab first.</p>
                    <button onClick={() => setActiveTab('attendance')} className="primary-btn">Go to Attendance</button>
                  </div>
                ) : (
                  <MarksTab
                    gradesData={gradesData}
                    setGradesData={setGradesData}
                    cgpa={cgpa}
                    setCgpa={setCgpa}
                    savedUsername={data?.username}
                    isBackgroundSyncing={isPortalSyncing}
                  />
                )
              ) : activeTab === 'fees' ? (
                !attendanceData ? (
                  <div className="empty-state" style={{ marginTop: '4rem' }}>
                    <p>Please log in to the student portal via the Attendance tab first.</p>
                    <button onClick={() => setActiveTab('attendance')} className="primary-btn">Go to Attendance</button>
                  </div>
                ) : (
                  <FeeTab feeData={feeData} setFeeData={setFeeData} savedUsername={data?.username} isBackgroundSyncing={isPortalSyncing} />
                )
              ) : null}

              {activeTab === 'calendar' && (
                !attendanceData ? (
                  <div className="empty-state" style={{ marginTop: '4rem' }}>
                    <p>Please log in to the student portal via the Attendance tab first.</p>
                    <button onClick={() => setActiveTab('attendance')} className="primary-btn">Go to Attendance</button>
                  </div>
                ) : (
                  <CalendarTab
                    calendarData={calendarData}
                    setCalendarData={setCalendarData}
                    savedUsername={data?.username || ''}
                    isBackgroundSyncing={isPortalSyncing}
                  />
                )
              )}

              {activeTab === 'calculator' && (
                <CalculatorTab />
              )}
            </>
          )}

        </div>

          </main>

          <MobileNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            handleLogout={handleLogout}
          />
        </>
      )}

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
        // Heal caches poisoned by an earlier bug where the owner key was saved as "null"/"undefined".
        // Runs before DashboardInner mounts so its state initializers see clean storage.
        ['attendance', 'grades', 'fees', 'calendar', 'internalmarks'].forEach((k) => {
          const owner = localStorage.getItem(`academia_${k}_user`);
          if (owner === 'null' || owner === 'undefined' || owner === '') {
            localStorage.removeItem(`academia_${k}_user`);
            localStorage.removeItem(`academia_${k}`);
          }
        });
        setSessionUsername(data.username);
      } else {
        localStorage.removeItem('session_token');
        navigate('/');
      }
    })
    .catch((err) => {
      console.error('Failed to fetch /me:', err);
      localStorage.removeItem('session_token');
      navigate('/');
    })
    .finally(() => setIsInitializing(false));
  }, [navigate]);

  if (isInitializing || !sessionUsername) {
    return <SplashScreen theme="dark" />;
  }

  return <DashboardInner sessionUsername={sessionUsername} />;
};

export default Dashboard;
