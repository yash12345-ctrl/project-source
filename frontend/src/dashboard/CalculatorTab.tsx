import React, { useState, useMemo } from 'react';
import './Dashboard.css';

const GRADE_POINTS: Record<string, number> = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'F': 0,
  'Ab': 0,
  'I': 0
};

const CalculatorTab: React.FC = () => {
  const [calcMode, setCalcMode] = useState<'sgpa' | 'cgpa'>('sgpa');

  // SGPA State
  const [courses, setCourses] = useState([
    { id: 1, name: 'Course 1', credits: 3, grade: 'O' },
    { id: 2, name: 'Course 2', credits: 4, grade: 'A+' },
    { id: 3, name: 'Course 3', credits: 3, grade: 'A' },
  ]);

  // CGPA State
  const [semesters, setSemesters] = useState([
    { id: 1, name: 'Semester 1', credits: 20, sgpa: 9.0 },
    { id: 2, name: 'Semester 2', credits: 22, sgpa: 8.5 },
  ]);

  const addCourse = () => {
    setCourses([...courses, { id: Date.now(), name: `Course ${courses.length + 1}`, credits: 3, grade: 'A' }]);
  };

  const updateCourse = (id: number, field: string, value: any) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCourse = (id: number) => {
    setCourses(courses.filter(c => c.id !== id));
  };

  const addSemester = () => {
    setSemesters([...semesters, { id: Date.now(), name: `Semester ${semesters.length + 1}`, credits: 20, sgpa: 8.0 }]);
  };

  const updateSemester = (id: number, field: string, value: any) => {
    setSemesters(semesters.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSemester = (id: number) => {
    setSemesters(semesters.filter(s => s.id !== id));
  };

  const sgpaResult = useMemo(() => {
    let totalCredits = 0;
    let earnedPoints = 0;
    courses.forEach(c => {
      const cr = Number(c.credits) || 0;
      const gp = GRADE_POINTS[c.grade] || 0;
      totalCredits += cr;
      earnedPoints += (cr * gp);
    });
    return totalCredits > 0 ? (earnedPoints / totalCredits).toFixed(2) : '0.00';
  }, [courses]);

  const cgpaResult = useMemo(() => {
    let totalCredits = 0;
    let totalSgpaPoints = 0;
    semesters.forEach(s => {
      const cr = Number(s.credits) || 0;
      const sgpa = Number(s.sgpa) || 0;
      totalCredits += cr;
      totalSgpaPoints += (cr * sgpa);
    });
    return totalCredits > 0 ? (totalSgpaPoints / totalCredits).toFixed(2) : '0.00';
  }, [semesters]);

  return (
    <div className="data-grid full-width">
      <section className="data-card">
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`primary-btn ${calcMode === 'sgpa' ? '' : 'outline'}`} 
            style={calcMode !== 'sgpa' ? { background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6' } : {}}
            onClick={() => setCalcMode('sgpa')}
          >
            SGPA Calculator
          </button>
          <button 
            className={`primary-btn ${calcMode === 'cgpa' ? '' : 'outline'}`} 
            style={calcMode !== 'cgpa' ? { background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6' } : {}}
            onClick={() => setCalcMode('cgpa')}
          >
            CGPA Calculator
          </button>
        </div>

        {calcMode === 'sgpa' ? (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>SGPA Calculator</h2>
            <div className="table-responsive">
              <table className="timetable-matrix" style={{ minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Course Name</th>
                    <th style={{ width: '25%' }}>Credits</th>
                    <th style={{ width: '25%' }}>Grade</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <input 
                          type="text" 
                          value={course.name} 
                          onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="1" 
                          max="10"
                          value={course.credits} 
                          onChange={(e) => updateCourse(course.id, 'credits', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <select 
                          value={course.grade} 
                          onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}
                        >
                          <option value="O">O (10)</option>
                          <option value="A+">A+ (9)</option>
                          <option value="A">A (8)</option>
                          <option value="B+">B+ (7)</option>
                          <option value="B">B (6)</option>
                          <option value="C">C (5)</option>
                          <option value="F">F (0)</option>
                          <option value="Ab">Ab (0)</option>
                          <option value="I">I (0)</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => removeCourse(course.id)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              <button onClick={addCourse} className="primary-btn" style={{ background: '#10b981' }}>
                + Add Course
              </button>
              
              <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your SGPA</span>
                <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#3b82f6' }}>{sgpaResult}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>CGPA Calculator</h2>
            <div className="table-responsive">
              <table className="timetable-matrix" style={{ minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Semester Name</th>
                    <th style={{ width: '25%' }}>Total Credits</th>
                    <th style={{ width: '25%' }}>SGPA</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((sem) => (
                    <tr key={sem.id}>
                      <td>
                        <input 
                          type="text" 
                          value={sem.name} 
                          onChange={(e) => updateSemester(sem.id, 'name', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="1" 
                          max="40"
                          value={sem.credits} 
                          onChange={(e) => updateSemester(sem.id, 'credits', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="0" 
                          max="10"
                          step="0.01"
                          value={sem.sgpa} 
                          onChange={(e) => updateSemester(sem.id, 'sgpa', e.target.value)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => removeSemester(sem.id)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              <button onClick={addSemester} className="primary-btn" style={{ background: '#10b981' }}>
                + Add Semester
              </button>
              
              <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your CGPA</span>
                <span style={{ fontSize: '2.5rem', fontWeight: '700', color: '#3b82f6' }}>{cgpaResult}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CalculatorTab;
