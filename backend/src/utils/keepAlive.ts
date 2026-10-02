import fs from 'fs/promises';
import path from 'path';

const SESSIONS_DIR = path.join(__dirname, '../../sessions/academia');
const PORTAL_SESSIONS_DIR = path.join(__dirname, '../../sessions/portal');

const ACADEMIA_KEEPALIVE_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/template.jsp';
const PORTAL_KEEPALIVE_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/template.jsp';

/**
 * Pings a session file to keep it alive. Returns true if still valid.
 */
async function pingSession(sessionPath: string, keepAliveUrl: string, label: string): Promise<boolean> {
  try {
    const fileContent = await fs.readFile(sessionPath, 'utf8');
    const data = JSON.parse(fileContent);
    const jsessionCookie = data.cookies?.find((c: any) => c.name === 'JSESSIONID');
    if (!jsessionCookie) return false;

    const res = await fetch(keepAliveUrl, {
      method: 'GET',
      headers: {
        'Cookie': `JSESSIONID=${jsessionCookie.value}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (res.url.includes('youLogin.jsp') || res.url.includes('logout')) {
      console.log(`[KeepAlive] ${label} Session expired: ${path.basename(sessionPath)}`);
      await fs.unlink(sessionPath).catch(() => {}); // Delete dead session
      return false;
    } else {
      console.log(`[KeepAlive] ${label} Session refreshed: ${path.basename(sessionPath)}`);
      return true;
    }
  } catch (err) {
    console.error(`[KeepAlive] Failed to ping ${path.basename(sessionPath)}:`, err);
    return false;
  }
}

/**
 * Periodically pings both academia and student portal sessions to keep them alive.
 */
export function startSessionKeepAlive() {
  console.log('[KeepAlive] Service started. Pinging academia & portal sessions every 5 minutes...');

  setInterval(async () => {
    const start = performance.now();
    let academiaCount = 0;
    let portalCount = 0;
    
    try {
      // 1. Keep academia sessions alive (sessions/*.json)
      try {
        const files = await fs.readdir(SESSIONS_DIR);
        const sessionFiles = files.filter(f => f.endsWith('_session.json'));
        for (const file of sessionFiles) {
          await pingSession(path.join(SESSIONS_DIR, file), ACADEMIA_KEEPALIVE_URL, '[Academia]');
          academiaCount++;
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') console.error('[KeepAlive] Error reading SESSIONS_DIR:', err);
      }

      // 2. Keep student portal sessions alive (sessions/portal/*_portal_session.json)
      try {
        const files = await fs.readdir(PORTAL_SESSIONS_DIR);
        const portalFiles = files.filter(f => f.endsWith('_portal_session.json'));
        for (const file of portalFiles) {
          await pingSession(path.join(PORTAL_SESSIONS_DIR, file), PORTAL_KEEPALIVE_URL, '[Portal]');
          portalCount++;
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') console.error('[KeepAlive] Error reading PORTAL_SESSIONS_DIR:', err);
      }
      
      console.log(`[Performance] 🕒 KeepAlive completed ${academiaCount + portalCount} sessions in ${(performance.now() - start).toFixed(2)} ms`);
    } catch (e) {
      console.error('[KeepAlive] General error:', e);
    }
  }, 5 * 60 * 1000); // 5 minutes
}
