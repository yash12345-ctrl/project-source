const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:5000/api/academia/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'yt7643@srmist.edu.in', password: 'password', forceSync: true })
  });
  const data = await res.json();
  console.log('Login:', data);

  if (data.syncToken || data.token) {
    const meRes = await fetch('http://localhost:5000/api/academia/me', {
      headers: { 'Authorization': `Bearer ${data.syncToken || data.token}` }
    });
    const meData = await meRes.json();
    console.log('Me:', meData);
  }
}
test();
