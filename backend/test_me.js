const { generateSyncToken, generateSessionToken } = require('./src/utils/jwt');
const fetch = require('node-fetch');

async function test() {
  const syncToken = generateSyncToken('test@srmist.edu.in');
  console.log('Sync Token:', syncToken);
  
  const meRes = await fetch('http://localhost:5000/api/academia/me', {
    headers: { 'Authorization': `Bearer ${syncToken}` }
  });
  const meData = await meRes.json();
  console.log('Me with SyncToken:', meData);
  
  const sessionToken = generateSessionToken('test@srmist.edu.in', 1);
  console.log('Session Token:', sessionToken);
  
  const meRes2 = await fetch('http://localhost:5000/api/academia/me', {
    headers: { 'Authorization': `Bearer ${sessionToken}` }
  });
  const meData2 = await meRes2.json();
  console.log('Me with SessionToken:', meData2);
}
test();
