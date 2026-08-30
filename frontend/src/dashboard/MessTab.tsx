import React, { useState } from 'react';

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

const MessTab: React.FC = () => {
  const [selectedHostel, setSelectedHostel] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  // Auto-detect today
  const today = new Date().getDay();
  const currentMenu = selectedHostel === 'premium' ? menuData[selectedDay] : null;

  return (
    <div className="tab-pane active fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Select Your Hostel</h2>
        <p style={{ color: '#64748b' }}>Choose your hostel to view the daily mess menu and food options.</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {hostels.map(hostel => (
          <div
            key={hostel.id}
            onClick={() => setSelectedHostel(hostel.id)}
            style={{
              backgroundColor: selectedHostel === hostel.id ? '#f0f9ff' : '#ffffff',
              border: `2px solid ${selectedHostel === hostel.id ? '#0ea5e9' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedHostel === hostel.id ? '0 10px 15px -3px rgba(14, 165, 233, 0.1)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transform: selectedHostel === hostel.id ? 'translateY(-2px)' : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (selectedHostel !== hostel.id) {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedHostel !== hostel.id) {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {selectedHostel === hostel.id && (
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                backgroundColor: '#0ea5e9',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderBottomLeftRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                SELECTED
              </div>
            )}
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              HOSTEL
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem' }}>{hostel.name}</h3>
          </div>
        ))}
      </div>

      {selectedHostel && (
        <div className="fade-in" style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {/* Day Selector Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.25rem' }}>Day Selector</h3>
                <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#0ea5e9', fontSize: '1rem' }}>{days.find(d => d.id === selectedDay)?.full}</span>
                  {selectedDay === today && (
                    <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.1rem 0.5rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      Today
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', overflowX: 'auto', gap: '0.25rem', backgroundColor: '#f1f5f9', padding: '0.35rem', borderRadius: '99px', maxWidth: '100%' }}>
                {days.map(day => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDay(day.id)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '99px',
                      border: 'none',
                      backgroundColor: selectedDay === day.id ? '#ffffff' : 'transparent',
                      color: selectedDay === day.id ? '#0ea5e9' : '#64748b',
                      fontWeight: selectedDay === day.id ? '700' : '500',
                      boxShadow: selectedDay === day.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {day.label}
                    {day.id === today && selectedDay !== day.id && (
                      <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Content Area */}
          <div style={{ padding: '2rem', backgroundColor: '#f8fafc' }}>
            {currentMenu ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {currentMenu.map((meal, idx) => (
                  <div key={idx} className="fade-in" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.25rem' }}>{meal.name}</h4>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {meal.time}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ★ {meal.rating}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: meal.hype.includes('Crowd') ? '#10b981' : '#64748b', marginTop: '0.25rem', fontWeight: '500' }}>
                          {meal.hype}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {meal.items.map((item: string, i: number) => (
                        <span key={i} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                </div>
                <h2 style={{ margin: '0 0 0.5rem', color: '#475569', fontSize: '1.25rem', fontWeight: '600' }}>Menu Not Available</h2>
                <p style={{ color: '#94a3b8', maxWidth: '400px', fontSize: '0.9rem' }}>
                  We don't have the menu data for {days.find(d => d.id === selectedDay)?.full} yet. Check back later!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessTab;
