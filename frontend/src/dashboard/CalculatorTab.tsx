import React, { useState, useMemo } from 'react';
import './Dashboard.css';
import { useTheme } from '../context/ThemeContext';

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

const GRADE_LABELS: Record<string, string> = {
  'O': 'O — Outstanding',
  'A+': 'A+ — Excellent',
  'A': 'A — Very good',
  'B+': 'B+ — Good',
  'B': 'B — Above average',
  'C': 'C — Average',
  'F': 'F — Fail',
  'Ab': 'Ab — Absent',
  'I': 'I — Incomplete'
};

/**
 * Visual identity: continues the "Faculty Register" dark academic theme —
 * ink navy / transparent glass plates / brass accent — so the ledger
 * reads like a printed mark-sheet rather than a generic form.
 */
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

  const sgpaTotals = useMemo(() => {
    let totalCredits = 0;
    let earnedPoints = 0;
    courses.forEach(c => {
      const cr = Number(c.credits) || 0;
      const gp = GRADE_POINTS[c.grade] || 0;
      totalCredits += cr;
      earnedPoints += (cr * gp);
    });
    return { totalCredits, result: totalCredits > 0 ? (earnedPoints / totalCredits).toFixed(2) : '0.00' };
  }, [courses]);

  const cgpaTotals = useMemo(() => {
    let totalCredits = 0;
    let totalSgpaPoints = 0;
    semesters.forEach(s => {
      const cr = Number(s.credits) || 0;
      const sgpa = Number(s.sgpa) || 0;
      totalCredits += cr;
      totalSgpaPoints += (cr * sgpa);
    });
    return { totalCredits, result: totalCredits > 0 ? (totalSgpaPoints / totalCredits).toFixed(2) : '0.00' };
  }, [semesters]);

  const sgpaResult = sgpaTotals.result;
  const cgpaResult = cgpaTotals.result;

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="gc-scope">
      <style>{`
        .gc-scope {
          --ink: ${isLight ? '#1a1611' : '#F3EFE3'};
          --slate: ${isLight ? '#5a544c' : '#9AA0B4'};
          --brass: ${isLight ? '#9B7A1A' : '#C9A227'};
          --brass-deep: ${isLight ? '#b89320' : '#E8C468'};
          --brass-tint: ${isLight ? 'rgba(155, 122, 26, 0.12)' : 'rgba(201, 162, 39, 0.14)'};
          --line: ${isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(201, 162, 39, 0.18)'};
          --line-soft: ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
          --plate: ${isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.035)'};
          --danger: ${isLight ? '#C0392B' : '#E27C6D'};
          --danger-tint: ${isLight ? 'rgba(192, 57, 43, 0.1)' : 'rgba(226, 124, 109, 0.12)'};
          --radius: 3px;
          font-family: 'Source Sans 3', 'Segoe UI', system-ui, sans-serif;
          color: var(--ink);
        }
        .gc-scope * { box-sizing: border-box; }

        .gc-tabs {
          display: flex;
          gap: 1.75rem;
          margin-bottom: 1.75rem;
        }
        .gc-tab {
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
        .gc-tab::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 2px;
          background: var(--brass);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.2s ease;
        }
        .gc-tab.active { color: var(--ink); }
        .gc-tab.active::after { transform: scaleX(1); }
        .gc-tab:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

        .gc-panel {
          background: var(--plate);
          border: 1px solid var(--line-soft);
          border-left: 3px solid var(--brass);
          border-radius: var(--radius);
          padding: 1.75rem clamp(1rem, 3vw, 2.25rem) 2.25rem;
        }
        .gc-panel h2 {
          font-family: Georgia, 'Iowan Old Style', serif;
          font-size: 1.35rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }
        .gc-panel p.gc-sub {
          margin: 0 0 1.75rem 0;
          color: var(--slate);
          font-size: 0.88rem;
        }

        .gc-ledger { width: 100%; border-collapse: collapse; }
        .gc-ledger thead th {
          text-align: left;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--slate);
          padding: 0 0.6rem 0.6rem 0.6rem;
          border-bottom: 1px solid var(--line);
        }
        .gc-ledger thead th:first-child { padding-left: 0; }
        .gc-ledger tbody td {
          padding: 0.65rem 0.6rem;
          border-bottom: 1px solid var(--line-soft);
          vertical-align: middle;
        }
        .gc-ledger tbody td:first-child { padding-left: 0; }
        .gc-ledger tbody tr:hover { background: rgba(255,255,255,0.02); }
        .gc-ledger tbody tr:last-child td { border-bottom: none; }

        .gc-field {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--line);
          color: var(--ink);
          font-size: 0.92rem;
          padding: 0.4rem 0.1rem;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease;
        }
        .gc-field:focus { border-bottom-color: var(--brass); }
        .gc-field[type="number"] { max-width: 90px; }

        select.gc-field {
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%239AA0B4' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.2rem center;
          padding-right: 1.1rem;
          cursor: pointer;
        }
        select.gc-field option { background: ${isLight ? '#ffffff' : '#14192B'}; color: var(--ink); }

        .gc-grade-chip {
          display: inline-flex;
          align-items: baseline;
          gap: 0.3rem;
          font-weight: 700;
          color: var(--brass-deep);
        }
        .gc-grade-chip small { font-weight: 500; color: var(--slate); font-size: 0.75rem; }

        .gc-remove {
          appearance: none;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--slate);
          border-radius: var(--radius);
          width: 30px;
          height: 30px;
          cursor: pointer;
          font-size: 0.85rem;
          line-height: 1;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .gc-remove:hover { border-color: var(--danger); color: var(--danger); }
        .gc-remove:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }

        .gc-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        .gc-add {
          appearance: none;
          background: transparent;
          border: 1px solid var(--brass);
          color: var(--brass-deep);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.55rem 1.1rem;
          border-radius: var(--radius);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .gc-add:hover { background: var(--brass); color: #1C1608; }
        .gc-add:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

        .gc-result {
          padding: 0.85rem 1.75rem;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          background: var(--brass-tint);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 160px;
        }
        .gc-result span.gc-result-label {
          font-size: 0.78rem;
          color: var(--slate);
          font-weight: 600;
        }
        .gc-result span.gc-result-value {
          font-family: Georgia, 'Iowan Old Style', serif;
          font-size: 2.4rem;
          font-weight: 600;
          color: var(--brass-deep);
          line-height: 1.15;
        }
        .gc-result span.gc-result-meta {
          font-size: 0.72rem;
          color: var(--slate);
          margin-top: 0.15rem;
        }

        @media (max-width: 640px) {
          .gc-tabs { flex-direction: row; gap: 0.5rem; margin-bottom: 1.25rem; }
          .gc-tab { flex: 1; text-align: center; padding: 0.75rem 0.5rem; border: 1px solid var(--line-soft); border-radius: 8px; font-size: 0.85rem; }
          .gc-tab.active { background: var(--brass-tint); border-color: var(--brass); }
          .gc-tab::after { display: none; }
          
          .gc-panel { padding: 1.5rem 1.1rem; border-left: none; border-top: 3px solid var(--brass); }

          .gc-ledger thead { display: none; }
          .gc-ledger, .gc-ledger tbody { display: block; width: 100%; }
          .gc-ledger tr { 
            position: relative;
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            column-gap: 1rem;
            row-gap: 0.4rem;
            background: var(--plate);
            border: 1px solid var(--line-soft); 
            border-radius: 14px;
            padding: 1.25rem; 
            margin-bottom: 1.25rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          }
          .gc-ledger td { 
            border: none !important; 
            padding: 0 !important; 
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
          }
          .gc-ledger td:nth-child(1) { grid-column: 1 / -1; margin-bottom: 0.5rem; padding-right: 2rem !important; }
          .gc-ledger td:nth-child(2) { grid-column: 1 / 2; }
          .gc-ledger td:nth-child(3) { grid-column: 2 / 3; }

          .gc-ledger td::before {
            content: attr(data-label);
            font-family: 'IBM Plex Mono', monospace;
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--slate);
          }
          
          .gc-field {
            text-align: left;
            width: 100%;
            background: rgba(255, 255, 255, 0.015);
            border: 1px solid var(--line);
            padding: 0.6rem 0.75rem;
            border-radius: 8px;
            font-size: 0.95rem;
          }
          
          .gc-field:focus {
            border-color: var(--brass);
            background: transparent;
            box-shadow: 0 0 0 3px var(--brass-tint);
          }
          
          /* Hide number steppers completely */
          .gc-field[type="number"]::-webkit-inner-spin-button, 
          .gc-field[type="number"]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
          }
          .gc-field[type="number"] {
            -moz-appearance: textfield;
          }
          
          select.gc-field {
            padding-right: 1.5rem;
          }

          /* Sleek circular remove button */
          .gc-ledger td:last-child {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: auto;
            padding: 0 !important;
            grid-column: unset;
          }
          .gc-ledger td:last-child::before {
            display: none;
          }
          .gc-remove {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            font-size: 1.1rem;
            border: none;
            background: rgba(226, 124, 109, 0.1);
            color: var(--danger);
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 0;
            padding-bottom: 2px;
          }
          .gc-remove:hover {
            background: var(--danger);
            color: #fff;
          }

          .gc-footer { flex-direction: column-reverse; align-items: stretch; gap: 1rem; margin-top: 0.5rem; }
          .gc-add { align-self: stretch; text-align: center; padding: 0.9rem; border: 1px dashed var(--brass); border-radius: 12px; }
          .gc-result { min-width: 0; padding: 1.5rem; align-items: center; text-align: center; border-radius: 14px; }
        }
      `}</style>

      <div className="gc-tabs">
        <button className={`gc-tab ${calcMode === 'sgpa' ? 'active' : ''}`} onClick={() => setCalcMode('sgpa')}>
          SGPA Calculator
        </button>
        <button className={`gc-tab ${calcMode === 'cgpa' ? 'active' : ''}`} onClick={() => setCalcMode('cgpa')}>
          CGPA Calculator
        </button>
      </div>

      {calcMode === 'sgpa' ? (
        <div className="gc-panel">
          <h2>Semester grade point average</h2>
          <p className="gc-sub">Enter each course's credits and grade — the total updates as you type.</p>

          <table className="gc-ledger">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Course</th>
                <th style={{ width: '18%' }}>Credits</th>
                <th style={{ width: '30%' }}>Grade</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td data-label="Course">
                    <input
                      type="text"
                      value={course.name}
                      onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                      className="gc-field"
                    />
                  </td>
                  <td data-label="Credits">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={course.credits}
                      onChange={(e) => updateCourse(course.id, 'credits', e.target.value)}
                      className="gc-field"
                    />
                  </td>
                  <td data-label="Grade">
                    <select
                      value={course.grade}
                      onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                      className="gc-field"
                    >
                      {Object.keys(GRADE_POINTS).map(g => (
                        <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => removeCourse(course.id)} className="gc-remove" aria-label={`Remove ${course.name}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="gc-footer">
            <button onClick={addCourse} className="gc-add">+ Add course</button>
            <div className="gc-result">
              <span className="gc-result-label">Your SGPA</span>
              <span className="gc-result-value">{sgpaResult}</span>
              <span className="gc-result-meta">{sgpaTotals.totalCredits} credits</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="gc-panel">
          <h2>Cumulative grade point average</h2>
          <p className="gc-sub">Enter each semester's credit load and SGPA — weighted by credits automatically.</p>

          <table className="gc-ledger">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Semester</th>
                <th style={{ width: '28%' }}>Total credits</th>
                <th style={{ width: '20%' }}>SGPA</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((sem) => (
                <tr key={sem.id}>
                  <td data-label="Semester">
                    <input
                      type="text"
                      value={sem.name}
                      onChange={(e) => updateSemester(sem.id, 'name', e.target.value)}
                      className="gc-field"
                    />
                  </td>
                  <td data-label="Total credits">
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={sem.credits}
                      onChange={(e) => updateSemester(sem.id, 'credits', e.target.value)}
                      className="gc-field"
                    />
                  </td>
                  <td data-label="SGPA">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={sem.sgpa}
                      onChange={(e) => updateSemester(sem.id, 'sgpa', e.target.value)}
                      className="gc-field"
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => removeSemester(sem.id)} className="gc-remove" aria-label={`Remove ${sem.name}`}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="gc-footer">
            <button onClick={addSemester} className="gc-add">+ Add semester</button>
            <div className="gc-result">
              <span className="gc-result-label">Your CGPA</span>
              <span className="gc-result-value">{cgpaResult}</span>
              <span className="gc-result-meta">{cgpaTotals.totalCredits} credits</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorTab;