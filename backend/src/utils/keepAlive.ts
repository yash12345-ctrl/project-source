import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
const PORTAL_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/template.jsp';

/**
 * Periodically sends a lightweight HTTP ping to the SRM Student Portal
 * to keep the Tomcat JSESSIONID from expiring.
 */
export function startSessionKeepAlive() {
  console.log('[KeepAlive] Service started. Pinging portal every 5 minutes...');
  
  // Run every 5 minutes (300,000 ms)
  setInterval(async () => {
    try {
      if (!fs.existsSync(SESSIONS_DIR)) return;
      
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        if (!file.endsWith('_session.json')) continue;
        
        const sessionPath = path.join(SESSIONS_DIR, file);
        try {
          const data = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          const jsessionCookie = data.cookies?.find((c: any) => c.name === 'JSESSIONID');
          
          if (jsessionCookie) {
            // Ping the portal with the cookie to reset the expiration timer!
            const res = await fetch(PORTAL_URL, {
              method: 'GET',
              headers: {
                'Cookie': `JSESSIONID=${jsessionCookie.value}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });
            
            // Check if it redirected to the login page (meaning session died anyway)
            if (res.url.includes('youLogin.jsp')) {
               console.log(`[KeepAlive] Session ${file} has expired and couldn't be kept alive.`);
               fs.unlinkSync(sessionPath); // Delete the dead session
            } else {
               console.log(`[KeepAlive] Successfully refreshed session for ${file}.`);
            }
          }
        } catch (err) {
          console.error(`[KeepAlive] Failed to process ${file}:`, err);
        }
      }
    } catch (e) {
      console.error('[KeepAlive] General error:', e);
    }
  }, 5 * 60 * 1000); // 5 minutes
}
