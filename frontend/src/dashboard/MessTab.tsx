import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const hostels = [
  { id: 'premium', name: 'The Premium Boys - NRI Hostel', type: 'Boys' },
  { id: 'sanasi', name: 'Sanasi / Agasthiyar / Avvaiyar', type: 'Boys' },
  { id: 'm-block', name: 'M Block', type: 'Boys / Girls' },
  { id: 'n-block', name: 'N Block', type: 'Boys / Girls' },
];

const days = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 0, label: 'Sun', full: 'Sunday' },
];

const menuData: Record<number, any[]> = {
  1: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.1/5', hype: 'Low hype', items: ['Poha', 'Sambar', 'Vada', 'Chutney', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Cut Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.5/5', hype: 'Crowd puller', items: ['Chapathi', 'Makkai Subzi', 'Keerai Kootu', 'Steam Rice', 'Brinjal Drumstick Karakulambu', 'Rasam', 'Curd', 'Vadams', 'Veg Schezwan Fried Rice', 'Veg Balls Manchurian', 'Egg Masala', 'Boiled Egg'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.8/5', hype: 'Low hype', items: ['Tea Cake', 'Bread', 'Butter', 'Jam', 'Tomato', 'Cucumber', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.0/5', hype: 'Well liked', items: ['Aloo Anarathana Chaat', 'Chapathi', 'Peswari Dal', 'Aloo Tomato Curry', 'Steam Rice', 'Sambar', 'Rasam', 'Thalavu Fried Rice', 'Chutney', 'Fresh Fruit', 'Chicken Chettinad Dosa'] }
  ],
  2: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.3/5', hype: 'Balanced', items: ['Curd', 'Aloo Paratha', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Cut Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.1/5', hype: 'Well liked', items: ['Poori', 'Chaat Pat Chole', 'Aloo Soya Masala', 'Drumstick Sambar', 'Steam Beetroot Poriyal', 'Rice', 'Rasam', 'Young Man Noodle', 'Chilli Gobi', 'Vadams', 'Curd'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Veg Samosa', 'Bread', 'Butter', 'Jam', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.4/5', hype: 'Crowd puller', items: ['Green Salad', 'Chapathi', 'Kadai Paneer', 'Potato Salt and Pepper', 'Dal Tadka', 'Jeera Pulao', 'Idli', 'Chutney', 'Steam Rice', 'Sambar', 'Rasam', 'Cone Ice Cream', 'Chicken'] }
  ],
  3: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.3/5', hype: 'Balanced', items: ['Poori', 'Channa Masala', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Cut Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.7/5', hype: 'Crowd puller', items: ['Chapathi', 'Makkai Kumbu Masala', 'White Peas Curry', 'Lemon Rice', 'Cabbage Poriyal', 'Steam Rice', 'Sambar', 'Tomato Rasam', 'Curd', 'Capsicum Fried Rice', 'Schezwan Paneer', 'Gulab Jamun', 'Laddu', 'Vadams', 'Boiled Egg'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Panko Fried Veg Roll', 'Bread', 'Butter', 'Jam', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.0/5', hype: 'Well liked', items: ['Tossed Salad', 'Chapathi', 'Kadai Bhindi', 'Dal Fry', 'Steam Rice', 'Rasam', 'Shanghai Fried Rice', 'Fresh Fruit', 'Chilli Chicken'] }
  ],
  4: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.3/5', hype: 'Balanced', items: ['Ven Pongal', 'Medu Vada', 'Sambar', 'Chutney', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Cut Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.2/5', hype: 'Crowd puller', items: ['Awani Poori', 'Aloo Gobi Curry', 'Masala Dal', 'Snake Gourd Masala', 'Karakulambu', 'Steam Rice', 'Rasam', 'Curd', 'Singapore Noodle', 'Dragon Style Raw Banana', 'Vadams'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Cookies', 'Bread', 'Butter', 'Jam', 'Tomato', 'Cucumber', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.3/5', hype: 'Crowd puller', items: ['Green Salad', 'Chapathi', 'Dal Panchrathna', 'Steam Rice', 'Tarkari Pulao', 'Crispy Fried Vegetable', 'Idly', 'Sambar', 'Chutney', 'Fresh Fruit', 'Egg Masala', 'Boiled Egg'] }
  ],
  5: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.3/5', hype: 'Balanced', items: ['Idly', 'Sambar', 'Chutney', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Cut Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.1/5', hype: 'Well liked', items: ['Chapathi', 'Miloni Subzi', 'Channa Dal Tadkawala', 'Variety Rice', 'Urulai Udacha Masala', 'Ginger Garlic Fried Rice', 'Taiwan Yam', 'Vadams', 'Semiya Payasam', 'Curd'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Keerai Vada', 'Coconut Chutney', 'Bread', 'Butter', 'Jam', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.7/5', hype: 'Crowd puller', items: ['Green Salad Chaat', 'Tawa Paratha', 'Paneer Butter Masala', 'Jeera Dal', 'Steam Rice', 'Three Pepper Fried Rice', 'Fresh Fruits', 'Cone Ice Cream', 'Butter Chicken Masala'] }
  ],
  6: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.4/5', hype: 'Balanced', items: ['Kal Dosa', 'Sambar', 'Coconut Chutney', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.2/5', hype: 'Well liked', items: ['Bhatura', 'Channa Masala', 'Dum Aloo', 'Carrot Beans Poriyal', 'South Indian Dal', 'Steam Rice', 'Rasam', 'Vadams', 'Vegetable Hakka Noodle', 'Stir Fried Vegetable', 'Curd'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Pav Mixed Vegetable Masala', 'Bhajji', 'Bread', 'Butter', 'Jam', 'Tea', 'Milk', 'Tomato', 'Cucumber'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '3.8/5', hype: 'Well liked', items: ['Green Salad', 'Chapathi', 'Aloo Mutter Masala', 'Masala Dal', 'Steam Rice', 'Chilly Potato', 'Mutter Pulao', 'Fresh Fruits'] }
  ],
  0: [
    { name: 'Breakfast', time: '7:15 AM - 9:00 AM', rating: '3.4/5', hype: 'Balanced', items: ['Idly', 'Vada', 'Sambar', 'Chutney', 'Toast', 'Butter', 'Jam', 'Cornflakes with Hot Milk', 'Seasonal Fruit', 'Coffee', 'Milk', 'Egg Preparation'] },
    { name: 'Lunch', time: '11:45 AM - 1:30 PM', rating: '4.1/5', hype: 'Well liked', items: ['Chapathi', 'South Veg Kurma', 'Cabbage Thoran', 'Steam Rice', 'Avarakkai Sambar', 'Rasam', 'Rajma Masala', 'Vegetable Fried Rice', 'Ice Cream', 'Butter Milk', 'Fish Preparation (Indian or Chinese)'] },
    { name: 'Snacks', time: '4:45 PM - 6:00 PM', rating: '2.7/5', hype: 'Low hype', items: ['Veg Pakoda', 'Bread', 'Butter', 'Jam', 'Tea', 'Milk'] },
    { name: 'Dinner', time: '7:00 PM - 9:00 PM', rating: '4.7/5', hype: 'Crowd puller', items: ['Tossed Salad', 'Vegetable Biriyani', 'Raita', 'Onion Ennakkai', 'Sambar Rice', 'Dal Fry', 'Chapathi', 'Rasam', 'Fresh Fruit', 'Bread Halwa', 'Chicken Biriyani'] }
  ]
};

// A meal's "hype" reads as a strong recommendation, a mild one, or neither —
// map it to the same teal / muted language the rest of the app uses for
// positive vs. neutral signal.
const hypeTone = (hype: string): 'strong' | 'mild' | 'quiet' => {
  if (hype === 'Crowd puller') return 'strong';
  if (hype === 'Well liked' || hype === 'Balanced') return 'mild';
  return 'quiet';
};

const MessTab: React.FC = () => {
  const [selectedHostel, setSelectedHostel] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const today = new Date().getDay();
  const currentMenu = selectedHostel === 'premium' ? menuData[selectedDay] : null;
  const selectedHostelData = hostels.find(h => h.id === selectedHostel);

  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="ms-scope">
      <style>{`
        .ms-scope {
          --ink-panel: ${isLight ? '#ffffff' : '#10141D'};
          --ink-bg: ${isLight ? '#f7f4f0' : '#0B0E14'};
          --hairline: ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.07)'};
          --brass: ${isLight ? '#9B7A1A' : '#C9A227'};
          --brass-soft: ${isLight ? '#b89320' : '#E8C766'};
          --brass-tint: ${isLight ? 'rgba(155, 122, 26, 0.12)' : 'rgba(201, 162, 39, 0.12)'};
          --teal: ${isLight ? '#0d9488' : '#2DD4BF'};
          --teal-tint: ${isLight ? 'rgba(13, 148, 136, 0.1)' : 'rgba(45, 212, 191, 0.12)'};
          --danger: ${isLight ? '#C0392B' : '#E5675A'};
          --text-primary: ${isLight ? '#1a1611' : '#F2EFE7'};
          --text-muted: ${isLight ? '#6a6460' : '#757D8F'};
          font-family: 'Inter', 'Source Sans 3', system-ui, sans-serif;
          color: var(--text-primary);
        }
        .ms-scope * { box-sizing: border-box; }

        .ms-intro { margin-bottom: 1.75rem; }
        .ms-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--brass);
          display: block;
          margin-bottom: 0.4rem;
        }
        .ms-intro h2 {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
        }
        .ms-intro p { margin: 0; color: var(--text-muted); font-size: 0.9rem; max-width: 52ch; }

        .ms-hostel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.1rem;
          margin-bottom: 2.25rem;
        }

        .ms-hostel-card {
          position: relative;
          text-align: left;
          background: var(--ink-panel);
          border: 1px solid var(--hairline);
          border-left: 3px solid transparent;
          border-radius: 12px;
          padding: 1.25rem 1.35rem;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
          font: inherit;
          color: inherit;
        }
        .ms-hostel-card:hover { transform: translateY(-2px); border-color: rgba(201, 162, 39, 0.3); }
        .ms-hostel-card.selected {
          border-left-color: var(--brass);
          border-color: var(--brass);
          background: linear-gradient(180deg, rgba(201, 162, 39, 0.08) 0%, var(--ink-panel) 60%);
        }
        .ms-hostel-card:focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

        .ms-hostel-tag {
          display: inline-block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--teal);
          background: var(--teal-tint);
          border-radius: 5px;
          padding: 2px 6px;
          margin-bottom: 0.6rem;
        }
        .ms-hostel-name {
          margin: 0;
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.02rem;
          font-weight: 600;
          line-height: 1.35;
          padding-right: 1.5rem;
        }
        .ms-hostel-check {
          position: absolute;
          top: 1.1rem;
          right: 1.1rem;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--brass);
          color: #14110A;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ms-panel {
          background: var(--ink-panel);
          border: 1px solid var(--hairline);
          border-radius: 16px;
          overflow: hidden;
        }

        .ms-panel-header {
          padding: 1.4rem 1.75rem;
          border-bottom: 1px solid var(--hairline);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .ms-panel-header h3 {
          margin: 0 0 0.3rem 0;
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .ms-active-day {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .ms-active-day strong { color: var(--brass-soft); font-weight: 600; }
        .ms-today-pill {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--brass-soft);
          background: var(--brass-tint);
          border-radius: 99px;
          padding: 2px 8px;
        }

        .ms-day-row {
          display: flex;
          gap: 0.3rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--hairline);
          border-radius: 99px;
          padding: 0.3rem;
          overflow-x: auto;
          max-width: 100%;
        }
        .ms-day-btn {
          position: relative;
          appearance: none;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-family: 'Inter', sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0.45rem 0.95rem;
          border-radius: 99px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .ms-day-btn:hover { color: var(--text-primary); }
        .ms-day-btn.active {
          background: var(--brass-tint);
          color: var(--brass-soft);
          box-shadow: 0 0 0 1px rgba(201, 162, 39, 0.3);
        }
        .ms-day-btn:focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }
        .ms-day-dot {
          position: absolute;
          top: 6px; right: 8px;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--danger);
        }

        .ms-menu-area { padding: 1.75rem; background: var(--ink-bg); }

        .ms-meal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .ms-meal-card {
          background: var(--ink-panel);
          border: 1px solid var(--hairline);
          border-radius: 12px;
          padding: 1.35rem 1.45rem;
        }
        .ms-meal-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--hairline);
        }
        .ms-meal-name {
          margin: 0 0 0.3rem 0;
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.15rem;
          font-weight: 600;
        }
        .ms-meal-time {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .ms-meal-time svg { flex-shrink: 0; }

        .ms-meal-signal { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; }
        .ms-rating {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--brass-soft);
          background: var(--brass-tint);
          border-radius: 6px;
          padding: 3px 7px;
        }
        .ms-hype { font-size: 0.75rem; font-weight: 600; }
        .ms-hype.tone-strong { color: var(--teal); }
        .ms-hype.tone-mild { color: var(--text-muted); }
        .ms-hype.tone-quiet { color: var(--text-muted); opacity: 0.65; }

        .ms-items { display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .ms-item-chip {
          font-size: 0.8rem;
          color: var(--text-primary);
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--hairline);
          border-radius: 99px;
          padding: 0.32rem 0.75rem;
        }

        .ms-empty {
          text-align: center;
          padding: 3rem 1rem;
        }
        .ms-empty-icon {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--hairline);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem auto;
          color: var(--brass);
          opacity: 0.85;
        }
        .ms-empty h3 {
          margin: 0 0 0.4rem 0;
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .ms-empty p { margin: 0; color: var(--text-muted); font-size: 0.88rem; max-width: 40ch; margin: 0 auto; }
      `}</style>

      <div className="ms-intro">
        <span className="ms-eyebrow">Hostel Mess</span>
        <h2>Select your hostel</h2>
        <p>Choose your hostel to see the day's mess menu, meal timings, and how each meal tends to rate.</p>
      </div>

      <div className="ms-hostel-grid">
        {hostels.map(hostel => {
          const selected = selectedHostel === hostel.id;
          return (
            <button
              key={hostel.id}
              type="button"
              onClick={() => setSelectedHostel(hostel.id)}
              className={`ms-hostel-card ${selected ? 'selected' : ''}`}
              aria-pressed={selected}
            >
              {selected && (
                <span className="ms-hostel-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
              )}
              <span className="ms-hostel-tag">{hostel.type}</span>
              <h3 className="ms-hostel-name">{hostel.name}</h3>
            </button>
          );
        })}
      </div>

      {selectedHostel && (
        <div className="ms-panel">
          <div className="ms-panel-header">
            <div>
              <h3>{selectedHostelData?.name}</h3>
              <div className="ms-active-day">
                <strong>{days.find(d => d.id === selectedDay)?.full}</strong>
                {selectedDay === today && <span className="ms-today-pill">Today</span>}
              </div>
            </div>

            <div className="ms-day-row" role="tablist">
              {days.map(day => (
                <button
                  key={day.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedDay === day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`ms-day-btn ${selectedDay === day.id ? 'active' : ''}`}
                >
                  {day.label}
                  {day.id === today && selectedDay !== day.id && <span className="ms-day-dot" />}
                </button>
              ))}
            </div>
          </div>

          <div className="ms-menu-area">
            {currentMenu ? (
              <div className="ms-meal-grid">
                {currentMenu.map((meal, idx) => (
                  <div key={idx} className="ms-meal-card">
                    <div className="ms-meal-top">
                      <div>
                        <h4 className="ms-meal-name">{meal.name}</h4>
                        <div className="ms-meal-time">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          {meal.time}
                        </div>
                      </div>
                      <div className="ms-meal-signal">
                        <span className="ms-rating">★ {meal.rating}</span>
                        <span className={`ms-hype tone-${hypeTone(meal.hype)}`}>{meal.hype}</span>
                      </div>
                    </div>

                    <div className="ms-items">
                      {meal.items.map((item: string, i: number) => (
                        <span key={i} className="ms-item-chip">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ms-empty">
                <div className="ms-empty-icon">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                </div>
                <h3>Menu not available</h3>
                <p>We don't have the menu for {days.find(d => d.id === selectedDay)?.full} at this hostel yet. Check back later.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessTab;