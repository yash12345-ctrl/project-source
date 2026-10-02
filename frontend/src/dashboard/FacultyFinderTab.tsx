import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { LoadingScreen } from '../components/LoadingScreen';

export interface StaffMember {
  name: string;
  profileUrl: string;
  imageUrl: string;
  imageBase64?: string;
  designation: string;
  specialization: string;
}

interface FacultyFinderTabProps {
  courses?: any[];
}

/**
 * Visual identity: "Faculty Register" — a printed academic directory feel.
 * Ink navy + warm paper + a single brass keyline as the signature device.
 * Portraits render in a quiet duotone and warm to full colour on hover,
 * the way an old yearbook plate might feel modern again.
 */
const FacultyFinderTab: React.FC<FacultyFinderTabProps> = ({ courses = [] }) => {
  const [activeView, setActiveView] = useState<'search' | 'my-courses'>('search');

  // Single Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StaffMember[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const [searchJobId, setSearchJobId] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // Bulk Search (My Courses) State
  const [bulkData, setBulkData] = useState<Record<string, StaffMember | null>>({});
  const [bulkFetched, setBulkFetched] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const [bulkJobId, setBulkJobId] = useState('');
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const uniqueFaculty = (courses || []).reduce((acc: any[], course: any) => {
    if (course.faculty && course.faculty !== 'N/A' && course.faculty !== '-') {
      const cleanName = typeof course.faculty === 'string' ?
        course.faculty.replace(/\s*\([^)]*\)/g, '').replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s*/i, '').trim() :
        course.faculty;

      if (!acc.find((f: any) => f.originalName === course.faculty)) {
        acc.push({
          originalName: course.faculty,
          cleanName: cleanName,
          courses: [course.title || 'Course']
        });
      } else {
        const existing = acc.find((f: any) => f.originalName === course.faculty);
        if (course.title && !existing.courses.includes(course.title)) {
          existing.courses.push(course.title);
        }
      }
    }
    return acc;
  }, []);

  // Bulk Fetch Job Submission
  useEffect(() => {
    if (activeView === 'my-courses' && !bulkFetched && !bulkJobId && uniqueFaculty.length > 0) {
      submitBulkJob();
    }
  }, [activeView, uniqueFaculty.length, bulkFetched, bulkJobId]);

  const submitBulkJob = async () => {
    setBulkError('');
    setBulkStatus('SUBMITTING');
    try {
      const queries = uniqueFaculty.map((f: any) => f.cleanName);
      const response = await fetch('/api/staff/bulk-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setBulkData(prev => ({ ...prev, ...data.results }));
        }

        if (data.jobId) {
          setBulkJobId(data.jobId);
          setBulkStatus(data.status);
        } else {
          setBulkFetched(true);
          setBulkStatus('');
        }
      } else {
        setBulkError('Failed to queue bulk search. Please try again.');
        setBulkStatus('');
      }
    } catch (e) {
      console.error('Failed to submit bulk job', e);
      setBulkError('Failed to connect to the server.');
      setBulkStatus('');
    }
  };

  // Single Search Job Submission
  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setSearched(true);
    setError('');
    setResults([]);
    setSearchStatus('SUBMITTING');

    try {
      const response = await fetch(`/api/staff/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to submit search.');

      const data = await response.json();
      if (data.cached && data.results) {
        setResults(data.results);
        setSearchStatus('');
      } else {
        setSearchJobId(data.jobId);
        setSearchStatus(data.status);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while queuing the search. Please try again.');
      setSearchStatus('');
    }
  };

  // Polling Effect for Search Job
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (searchJobId && (searchStatus === 'PENDING' || searchStatus === 'PROCESSING')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/staff/job/${searchJobId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status) setSearchStatus(data.status);

            if (data.status === 'COMPLETED') {
              setResults(data.result || []);
              setSearchJobId('');
            } else if (data.status === 'FAILED') {
              setError(data.error || 'The background scraper failed to fetch data.');
              setSearchJobId('');
            }
          }
        } catch (e) {
          console.error('Error polling search job', e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [searchJobId, searchStatus]);

  // Polling Effect for Bulk Job
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (bulkJobId && (bulkStatus === 'PENDING' || bulkStatus === 'PROCESSING')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/staff/job/${bulkJobId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status) setBulkStatus(data.status);

            if (data.status === 'COMPLETED') {
              setBulkData(prev => ({ ...prev, ...(data.result || {}) }));
              setBulkFetched(true);
              setBulkJobId('');
            } else if (data.status === 'FAILED') {
              setBulkError(data.error || 'The background scraper failed to fetch bulk data.');
              setBulkFetched(true);
              setBulkJobId('');
            }
          }
        } catch (e) {
          console.error('Error polling bulk job', e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [bulkJobId, bulkStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p.charAt(0).toUpperCase())
      .join('');

  const renderQueueStatus = (status: string | null, label: string) => {
    if (!status || status === 'COMPLETED' || status === 'FAILED') return null;
    return (
      <div className="ff-queue">
        <LoadingScreen message={label === 'Search' ? 'Searching for faculty…' : 'Gathering faculty records…'} />
      </div>
    );
  };

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="ff-scope">
      <style>{`
        .ff-scope {
          --ink: ${isLight ? '#1a1611' : '#F3EFE3'};
          --ink-soft: ${isLight ? '#4a4540' : '#D9D3C2'};
          --plate: ${isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.035)'};
          --plate-hover: ${isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.06)'};
          --brass: ${isLight ? '#9B7A1A' : '#C9A227'};
          --brass-deep: ${isLight ? '#b89320' : '#E8C468'};
          --brass-tint: ${isLight ? 'rgba(155, 122, 26, 0.12)' : 'rgba(201, 162, 39, 0.14)'};
          --line: ${isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(201, 162, 39, 0.22)'};
          --slate: ${isLight ? '#6a6460' : '#9AA0B4'};
          --danger: ${isLight ? '#C0392B' : '#E27C6D'};
          --danger-tint: ${isLight ? 'rgba(192, 57, 43, 0.1)' : 'rgba(226, 124, 109, 0.12)'};
          --radius: 3px;
          font-family: 'Source Sans 3', 'Segoe UI', system-ui, sans-serif;
          color: var(--ink);
          background: transparent;
          padding: 0;
        }
        .ff-scope * { box-sizing: border-box; }

        .ff-tabs {
          display: flex;
          gap: 1.75rem;
          margin-bottom: 0.25rem;
        }
        .ff-tab {
          appearance: none;
          background: none;
          border: none;
          padding: 0.4rem 0.05rem 0.65rem 0.05rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--slate);
          cursor: pointer;
          position: relative;
        }
        .ff-tab::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 2px;
          background: var(--brass);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.2s ease;
        }
        .ff-tab.active { color: var(--ink); }
        .ff-tab.active::after { transform: scaleX(1); }
        .ff-tab:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

        .ff-search-form {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-bottom: 1.5px solid var(--brass-tint);
          padding-bottom: 0.6rem;
          margin: 1.75rem 0 2rem 0;
        }
        .ff-search-form svg { color: var(--slate); flex-shrink: 0; }
        .ff-search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-family: Georgia, 'Iowan Old Style', serif;
          font-size: 1.2rem;
          color: var(--ink);
          padding: 0.2rem 0;
        }
        .ff-search-input::placeholder { color: var(--slate); font-style: italic; }
        .ff-search-submit {
          appearance: none;
          border: 1px solid var(--brass);
          background: var(--brass);
          color: #1C1608;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.55rem 1.1rem;
          border-radius: var(--radius);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
        }
        .ff-search-submit:hover:not(:disabled) { background: var(--brass-deep); border-color: var(--brass-deep); }
        .ff-search-submit:disabled { opacity: 0.4; cursor: not-allowed; }
        .ff-search-submit:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

        .ff-queue { padding: 2.5rem 0; text-align: center; }

        .ff-banner {
          padding: 0.85rem 1rem;
          border-radius: var(--radius);
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          background: var(--danger-tint);
          color: var(--danger);
          border-left: 3px solid var(--danger);
        }

        .ff-empty {
          text-align: center;
          padding: 3.5rem 1rem;
          color: var(--slate);
        }
        .ff-empty svg { color: var(--brass); margin-bottom: 1rem; opacity: 0.6; }
        .ff-empty h3 {
          font-family: Georgia, 'Iowan Old Style', serif;
          color: var(--ink);
          margin: 0 0 0.4rem 0;
          font-size: 1.1rem;
        }
        .ff-empty p { margin: 0; font-size: 0.9rem; }

        .ff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .ff-plate {
          position: relative;
          background: var(--plate);
          border: 1px solid var(--line);
          border-left: 3px solid var(--brass);
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
          transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .ff-plate:hover { border-left-color: var(--brass-deep); background: var(--plate-hover); transform: translateY(-2px); }

        .ff-plate-photo {
          height: 190px;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ff-plate-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(55%) sepia(8%) contrast(1.02);
          transition: filter 0.35s ease;
        }
        .ff-plate:hover .ff-plate-photo img { filter: grayscale(0%) sepia(0%); }
        .ff-plate-photo .ff-glyph { color: var(--brass-deep); opacity: 0.55; }

        .ff-plate-body {
          padding: 1.25rem 1.35rem 1.4rem 1.35rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .ff-plate-name {
          font-family: Georgia, 'Iowan Old Style', serif;
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0 0 0.2rem 0;
          color: var(--ink);
        }
        .ff-plate-role {
          font-size: 0.85rem;
          color: var(--brass-deep);
          font-weight: 600;
          margin: 0 0 0.55rem 0;
        }
        .ff-plate-spec {
          font-size: 0.85rem;
          color: var(--slate);
          line-height: 1.5;
          margin: 0 0 1.1rem 0;
        }
        .ff-plate-link {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ink);
          text-decoration: none;
          padding-top: 0.7rem;
          border-top: 1px solid var(--line);
        }
        .ff-plate-link span { border-bottom: 1px solid transparent; transition: border-color 0.15s ease; }
        .ff-plate-link:hover span { border-color: var(--ink); }
        .ff-plate-link.disabled {
          color: #A2A9B5;
          cursor: default;
          pointer-events: none;
        }

        .ff-card-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin: 0.9rem 0 0 0;
        }
        .ff-course-chip {
          padding: 0.22rem 0.55rem;
          background: var(--brass-tint);
          color: var(--brass-deep);
          border-radius: var(--radius);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .ff-plate-header {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          margin-bottom: 0.9rem;
        }
        .ff-avatar-round {
          width: 58px; height: 58px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1.5px solid var(--brass-tint);
        }
        .ff-avatar-round img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(45%); }
        .ff-avatar-fallback {
          width: 58px; height: 58px;
          border-radius: 50%;
          background: var(--brass-tint);
          color: var(--brass-deep);
          display: flex; align-items: center; justify-content: center;
          font-family: Georgia, serif;
          font-weight: 700;
          font-size: 1.05rem;
          flex-shrink: 0;
        }

        @keyframes ff-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .ff-skel { background: var(--brass-tint); animation: ff-pulse 1.6s ease-in-out infinite; border-radius: var(--radius); }
      `}</style>

      <div className="ff-masthead">
        <div>
          <h2>Faculty Register</h2>
          <p>Look up any instructor's official profile, or see who teaches your enrolled courses.</p>
        </div>
      </div>

      <div className="ff-tabs">
        <button
          className={`ff-tab ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => setActiveView('search')}
        >
          Find Faculty
        </button>
        <button
          className={`ff-tab ${activeView === 'my-courses' ? 'active' : ''}`}
          onClick={() => setActiveView('my-courses')}
        >
          My Course Faculty
        </button>
      </div>

      {activeView === 'my-courses' ? (
        <div>
          <div style={{ marginTop: '1.5rem' }}>
            {renderQueueStatus(bulkStatus, 'Course Faculty')}
          </div>

          {bulkError && <div className="ff-banner">{bulkError}</div>}

          {uniqueFaculty.length > 0 ? (
            <div className="ff-grid">
              {uniqueFaculty.map((faculty, idx) => {
                const fetchedData = bulkData[faculty.cleanName];
                const isPending = !fetchedData && (bulkJobId !== '' || bulkStatus === 'SUBMITTING');

                if (isPending) {
                  return (
                    <div key={idx} className="ff-plate">
                      <div className="ff-plate-body">
                        <div className="ff-plate-header">
                          <div className="ff-skel" style={{ width: 58, height: 58, borderRadius: '50%' }} />
                          <div style={{ flex: 1 }}>
                            <div className="ff-skel" style={{ height: '1rem', width: '75%', marginBottom: '0.5rem' }} />
                            <div className="ff-skel" style={{ height: '0.75rem', width: '50%' }} />
                          </div>
                        </div>
                        <div className="ff-card-row">
                          {faculty.courses.map((cTitle: string, i: number) => (
                            <span key={i} className="ff-course-chip">{cTitle}</span>
                          ))}
                        </div>
                        <div className="ff-skel" style={{ height: 38, width: '100%', marginTop: '1.25rem' }} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="ff-plate">
                    <div className="ff-plate-body">
                      <div className="ff-plate-header">
                        {fetchedData && (fetchedData.imageBase64 || fetchedData.imageUrl) ? (
                          <div className="ff-avatar-round">
                            <img src={fetchedData.imageBase64 || fetchedData.imageUrl} alt={faculty.cleanName} referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="ff-avatar-fallback">{initials(faculty.cleanName)}</div>
                        )}
                        <div>
                          <h4 className="ff-plate-name" style={{ fontSize: '1.02rem' }}>
                            {fetchedData ? fetchedData.name : faculty.cleanName}
                          </h4>
                          <p className="ff-plate-role" style={{ marginBottom: fetchedData ? '0.1rem' : 0 }}>
                            {fetchedData ? fetchedData.designation : faculty.originalName}
                          </p>
                          {fetchedData && (
                            <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.78rem' }}>{fetchedData.specialization}</p>
                          )}
                        </div>
                      </div>

                      <div className="ff-card-row" style={{ marginTop: 0, marginBottom: '1.1rem' }}>
                        {faculty.courses.map((cTitle: string, i: number) => (
                          <span key={i} className="ff-course-chip">{cTitle}</span>
                        ))}
                      </div>

                      {fetchedData ? (
                        <a href={fetchedData.profileUrl} target="_blank" rel="noopener noreferrer" className="ff-plate-link">
                          <span>View official profile</span>
                        </a>
                      ) : (
                        <span className="ff-plate-link disabled">Profile not found</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ff-empty">
              {(!courses || courses.length === 0) ? (
                <p>No enrolled courses found yet. Sync your dashboard to see who's teaching you.</p>
              ) : (
                <p>None of your enrolled courses list a faculty member yet.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={handleSearch} className="ff-search-form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by faculty name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ff-search-input"
            />
            <button type="submit" className="ff-search-submit" disabled={!!searchStatus || !query.trim()}>
              Search
            </button>
          </form>

          {error && <div className="ff-banner">{error}</div>}

          {renderQueueStatus(searchStatus, 'Search')}

          {!searchStatus && searched && results.length === 0 && !error && (
            <div className="ff-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3>No record found</h3>
              <p>Nothing matches "{query}" in the directory. Try a shorter or differently spelled name.</p>
            </div>
          )}

          {!searchStatus && results.length > 0 && (
            <div className="ff-grid">
              {results.map((staff, index) => (
                <div key={index} className="ff-plate">
                  <div className="ff-plate-photo">
                    {staff.imageBase64 || staff.imageUrl ? (
                      <img
                        src={staff.imageBase64 || staff.imageUrl}
                        alt={staff.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%239C7A2E" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                          target.style.width = '56px';
                          target.style.height = '56px';
                          target.style.objectFit = 'contain';
                          target.style.filter = 'none';
                        }}
                      />
                    ) : (
                      <svg className="ff-glyph" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
                  </div>
                  <div className="ff-plate-body">
                    <h3 className="ff-plate-name">{staff.name}</h3>
                    <p className="ff-plate-role">{staff.designation}</p>
                    <p className="ff-plate-spec">{staff.specialization}</p>
                    {staff.profileUrl && (
                      <a href={staff.profileUrl} target="_blank" rel="noopener noreferrer" className="ff-plate-link">
                        <span>View official profile</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyFinderTab;