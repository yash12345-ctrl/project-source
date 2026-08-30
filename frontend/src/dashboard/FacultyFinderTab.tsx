import React, { useState, useEffect } from 'react';

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

  console.log("FacultyFinderTab received courses:", courses);

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
      const response = await fetch('http://localhost:5000/api/staff/bulk-search', {
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
      const response = await fetch(`http://localhost:5000/api/staff/search?q=${encodeURIComponent(searchQuery)}`);
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
          const res = await fetch(`http://localhost:5000/api/staff/job/${searchJobId}`);
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
          console.error("Error polling search job", e);
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
          const res = await fetch(`http://localhost:5000/api/staff/job/${bulkJobId}`);
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
          console.error("Error polling bulk job", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [bulkJobId, bulkStatus]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  // UI Helpers
  const renderQueueStatus = (status: string | null, label: string) => {
    if (!status || status === 'COMPLETED' || status === 'FAILED') return null;
    
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0' }}>
        <LoadingScreen message={label === 'Search' ? "Searching for faculty..." : "Performing bulk search..."} />
      </div>
    );
  };

  return (
    <div className="faculty-finder-container" style={{ padding: '1rem' }}>
      
      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveView('search')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: activeView === 'search' ? '#10b981' : 'transparent',
            color: activeView === 'search' ? 'white' : '#475569',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Faculty Finder
        </button>
        <button 
          onClick={() => setActiveView('my-courses')}
          style={{ 
            padding: '0.5rem 1rem', 
            background: activeView === 'my-courses' ? '#10b981' : 'transparent',
            color: activeView === 'my-courses' ? 'white' : '#475569',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          My Course Faculty
        </button>
      </div>

      {activeView === 'my-courses' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Faculty Teaching Your Courses</h3>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
             {renderQueueStatus(bulkStatus, 'Course Faculty')}
          </div>

          {bulkError && (
            <div style={{ padding: '0.75rem', marginBottom: '1.5rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500' }}>
              {bulkError}
            </div>
          )}
          
          {uniqueFaculty.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {uniqueFaculty.map((faculty, idx) => {
                const fetchedData = bulkData[faculty.cleanName];
                const isPending = !fetchedData && (bulkJobId !== '' || bulkStatus === 'SUBMITTING');
                
                if (isPending) {
                  return (
                    <div key={idx} className="data-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', opacity: 0.7 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', flexShrink: 0, animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ height: '1.1rem', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '0.5rem', width: '80%', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                            <div style={{ height: '0.85rem', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '0.5rem', width: '60%', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                            <div style={{ height: '0.8rem', backgroundColor: '#e2e8f0', borderRadius: '4px', width: '90%', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                          {faculty.courses.map((cTitle: string, i: number) => (
                            <span key={i} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', color: '#475569' }}>
                              {cTitle}
                            </span>
                          ))}
                        </div>
                        <div style={{ width: '100%', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '6px', marginTop: 'auto', animation: 'pulse 1.5s infinite ease-in-out' }}></div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={idx} className="data-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        {fetchedData && (fetchedData.imageBase64 || fetchedData.imageUrl) ? (
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                            <img 
                              src={fetchedData.imageBase64 || fetchedData.imageUrl} 
                              alt={faculty.cleanName} 
                              referrerPolicy="no-referrer"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 'bold', fontSize: '1.5rem', flexShrink: 0 }}>
                            {faculty.cleanName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>{fetchedData ? fetchedData.name : faculty.cleanName}</h4>
                          <p style={{ margin: '0.2rem 0 0 0', color: '#0f172a', fontSize: '0.85rem', fontWeight: '500' }}>
                            {fetchedData ? fetchedData.designation : faculty.originalName}
                          </p>
                          {fetchedData && (
                            <p style={{ margin: '0', color: '#64748b', fontSize: '0.8rem' }}>{fetchedData.specialization}</p>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {faculty.courses.map((cTitle: string, i: number) => (
                          <span key={i} style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', color: '#475569' }}>
                            {cTitle}
                          </span>
                        ))}
                      </div>
                      
                      {fetchedData ? (
                        <a href={fetchedData.profileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '0.75rem', backgroundColor: '#10b981', color: 'white', textAlign: 'center', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', transition: 'background-color 0.2s', marginTop: 'auto' }}>
                          View Official Profile
                        </a>
                      ) : (
                        <button disabled style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'not-allowed', marginTop: 'auto' }}>
                          Profile Not Found
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              {(!courses || courses.length === 0) ? (
                <p>No enrolled courses found. Please ensure your dashboard has synced your courses.</p>
              ) : (
                <p>No faculty information found in your currently enrolled courses.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Enter Faculty Name..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="auth-input"
              style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '1rem' }}
            />
            <button 
              type="submit" 
              className="primary-btn" 
              disabled={!!searchStatus || !query.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
            </button>
          </form>

          {error && (
            <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
             {renderQueueStatus(searchStatus, 'Search')}
          </div>

          {!searchStatus && searched && results.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <h3>No faculty found</h3>
              <p>We couldn't find anyone matching "{query}". Try a different name.</p>
            </div>
          )}

          {!searchStatus && results.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {results.map((staff, index) => (
                <div key={index} className="data-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '200px', backgroundColor: '#f1f5f9', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {staff.imageBase64 || staff.imageUrl ? (
                      <img 
                        src={staff.imageBase64 || staff.imageUrl} 
                        alt={staff.name} 
                        referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; 
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                          target.style.width = '64px';
                          target.style.height = '64px';
                          target.style.objectFit = 'contain';
                        }}
                      />
                    ) : (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>{staff.name}</h3>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: '500', fontSize: '0.9rem' }}>{staff.designation}</p>
                    <p style={{ margin: '0', color: '#64748b', fontSize: '0.85rem' }}>{staff.specialization}</p>
                    
                    {staff.profileUrl && (
                      <a 
                        href={staff.profileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="primary-btn"
                        style={{ display: 'block', marginTop: 'auto', paddingTop: '0.75rem', paddingBottom: '0.75rem', textDecoration: 'none' }}
                      >
                        View Official Profile
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
