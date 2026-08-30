import React from 'react';

interface StudyProps {
  onSelectSemester: (sem: number) => void;
}

const Study: React.FC<StudyProps> = ({ onSelectSemester }) => {
  const semesters = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="tab-pane active fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Study Material</h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Select your semester to access notes, past papers, and study guides.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '2rem',
      }}>
        {semesters.map(sem => (
          <div 
            key={sem}
            onClick={() => {
              if (sem === 1) {
                onSelectSemester(sem);
              } else {
                alert(`Semester ${sem} study materials are coming soon!`);
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              border: sem === 1 ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '24px',
              padding: '2.5rem 2rem',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: sem === 1 ? '0 20px 40px -15px rgba(236, 72, 153, 0.15)' : '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = sem === 1 
                ? '0 30px 50px -15px rgba(236, 72, 153, 0.25)' 
                : '0 20px 40px -10px rgba(0, 0, 0, 0.08)';
              e.currentTarget.style.borderColor = sem === 1 ? 'rgba(236, 72, 153, 0.5)' : '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = sem === 1 
                ? '0 20px 40px -15px rgba(236, 72, 153, 0.15)' 
                : '0 10px 30px -10px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.borderColor = sem === 1 ? 'rgba(236, 72, 153, 0.3)' : 'rgba(226, 232, 240, 0.8)';
            }}
          >
            {sem === 1 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #ec4899)',
                backgroundSize: '200% auto',
                animation: 'gradientMove 3s linear infinite'
              }} />
            )}
            
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: sem === 1 ? 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' : '#f1f5f9',
              color: sem === 1 ? 'white' : '#64748b',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: '800',
              marginBottom: '1.5rem',
              boxShadow: sem === 1 ? '0 10px 20px -5px rgba(236, 72, 153, 0.4)' : 'none',
            }}>
              {sem}
            </div>
            
            <h3 style={{ margin: '0 0 0.5rem 0', color: sem === 1 ? '#1e293b' : '#475569', fontSize: '1.25rem', fontWeight: '700' }}>
              Semester {sem}
            </h3>
            
            {sem === 1 ? (
              <span style={{
                fontSize: '0.875rem',
                color: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                padding: '0.35rem 1rem',
                borderRadius: '999px',
                fontWeight: '600',
                marginTop: '0.5rem'
              }}>
                Available Now
              </span>
            ) : (
              <span style={{
                fontSize: '0.875rem',
                color: '#94a3b8',
                backgroundColor: '#f1f5f9',
                padding: '0.35rem 1rem',
                borderRadius: '999px',
                fontWeight: '500',
                marginTop: '0.5rem'
              }}>
                Coming Soon
              </span>
            )}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Study;
