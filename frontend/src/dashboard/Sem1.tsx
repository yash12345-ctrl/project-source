import React, { useState, useEffect } from 'react';
import { ArrowLeft, Book, FileText, ChevronDown, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
// Trigger HMR

interface DocumentLink {
  title: string;
  url: string;
}

interface SubjectData {
  name: string;
  url: string;
  documents: DocumentLink[];
}

interface Sem1Props {
  onBack: () => void;
}

const Sem1: React.FC<Sem1Props> = ({ onBack }) => {
  const [data, setData] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    checkSyncStatus();
  }, []);

  // Poll sync status every 5 seconds while syncing
  useEffect(() => {
    if (!syncing) return;
    const interval = setInterval(async () => {
      const res = await fetch('/api/helpers/sync/status').catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        if (!json.syncing) {
          setSyncing(false);
          fetchData(); // Refresh data when sync finishes
          clearInterval(interval);
        } else {
          fetchData(); // Refresh data to show incremental progress
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [syncing]);

  const checkSyncStatus = async () => {
    try {
      const res = await fetch('/api/helpers/sync/status');
      if (res.ok) {
        const json = await res.json();
        setSyncing(json.syncing);
      }
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/helpers/semesters/1');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch Sem 1 data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/helpers/sync', {
        method: 'POST'
      });
      if (res.status === 409) {
        // Already syncing — just show progress
        return;
      }
      if (!res.ok) {
        setSyncing(false);
        alert('Failed to start sync. Is the backend running?');
      }
      // Don't set syncing=false here; polling will handle it
    } catch (err) {
      console.error('Failed to start sync:', err);
      setSyncing(false);
    }
  };

  const toggleSubject = (name: string) => {
    if (expandedSubject === name) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(name);
    }
  };

  return (
    <div className="tab-pane active fade-in" style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onBack}
            style={{ 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Semester 1</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Subjects & Resources</p>
          </div>
        </div>

        <button 
          onClick={handleSync}
          disabled={syncing}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: syncing ? '#e2e8f0' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            color: syncing ? '#94a3b8' : 'white', 
            border: 'none', 
            padding: '0.6rem 1.25rem', 
            borderRadius: '999px', 
            fontWeight: '600',
            cursor: syncing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: syncing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
          onMouseOver={e => !syncing && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={e => !syncing && (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {syncing ? <Loader2 size={16} className="spinner" /> : <RefreshCw size={16} />}
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <LoadingScreen message="Loading study materials..." />
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <Book size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#334155', marginBottom: '0.5rem' }}>No Data Available</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            It looks like we haven't synced the study materials for Semester 1 yet. Click the sync button to fetch the latest resources.
          </p>
          <button 
            onClick={handleSync}
            style={{ background: '#ec4899', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Start Sync Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.map((subject, idx) => {
            const isExpanded = expandedSubject === subject.name;
            const docCount = subject.documents?.length || 0;
            
            return (
              <div 
                key={idx} 
                style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: isExpanded ? '0 10px 25px -5px rgba(0,0,0,0.05)' : '0 2px 5px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.3s'
                }}
              >
                <div 
                  onClick={() => toggleSubject(subject.name)}
                  style={{ 
                    padding: '1.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? '#f8fafc' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '8px', 
                      background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Book size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '600' }}>{subject.name}</h3>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{docCount} Resources</span>
                    </div>
                  </div>
                  
                  <div style={{ color: '#94a3b8' }}>
                    {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                    {docCount > 0 ? (
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '1rem',
                        marginTop: '1.5rem'
                      }}>
                        {subject.documents.map((doc, dIdx) => (
                          <a 
                            key={dIdx} 
                            href={doc.url} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '1rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: '#334155',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <FileText size={18} color="#6366f1" />
                            <span style={{ fontSize: '0.95rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No documents found for this subject.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Sem1;
