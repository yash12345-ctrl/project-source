import { chromium, Browser, BrowserContext, Page } from 'patchright';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { captchaService } from './captcha.service';

// @ts-ignore - Redlock v5 types have issues with Node10 resolution
import Redlock from 'redlock';
import { getRedisClient } from '../db/redis';

// Initialize Redlock with our Redis client
const redlock = new Redlock([getRedisClient() as any], {
  driftFactor: 0.01, // time in ms
  retryCount: -1,    // retry infinitely until we get the lock
  retryDelay: 1000,  // retry every 1 second
  retryJitter: 200,  // time in ms
});

const PORTAL_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';
// Dedicated directory for student portal sessions (separate from main academia sessions)
const SESSIONS_DIR = path.join(__dirname, '../../sessions/portal');

async function solveCaptcha(buffer: Buffer): Promise<string> {
  const start = performance.now();
  try {
    const b64 = buffer.toString('base64');
    const pythonPath = path.join(__dirname, '../../venv/bin/python');
    const scriptPath = path.join(__dirname, '../../solve.py');
    
    const output = await new Promise<string>((resolve, reject) => {
      execFile(pythonPath, [scriptPath, b64], { timeout: 10000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('[OCR] Python Script Error (stderr):', stderr);
          return reject(error);
        }
        resolve(stdout);
      });
    });

    const result = JSON.parse(output.trim());
    if (result.success) {
      console.log(`[Performance] 🕒 Captcha solved in ${(performance.now() - start).toFixed(2)} ms`);
      return result.text;
    }
  } catch (e) {
    console.error(`[Performance] ⚠️ OCR Failed in ${(performance.now() - start).toFixed(2)} ms`, e);
  }
  return '';
}

export interface AuthResult {
    success: boolean;
    error?: string;
    page?: Page;
    browser?: Browser;
    context?: BrowserContext;
}

const invalidPasswordCache = new Map<string, { password: string, timestamp: number }>();

export function clearInvalidPasswordCache(username: string) {
  const netId = username.split('@')[0] || username;
  invalidPasswordCache.delete(netId);
}

export async function loginToPortal(username: string, password?: string, isInteractive?: boolean): Promise<AuthResult> {
  let lock;
  try {
    // Acquire a global lock to prevent multiple workers from logging in simultaneously
    // Lock duration: 60 seconds (login usually takes 2-5 seconds, max 10 for captcha)
    console.log(`[Auth] ⏳ ${username} waiting for global portal login lock...`);
    lock = await redlock.acquire(['portal_login_lock'], 60000);
    console.log(`[Auth] 🔐 ${username} acquired portal login lock!`);
    
    return await performLoginToPortal(username, password, isInteractive);
  } finally {
    if (lock) {
      await lock.release().catch((e: any) => console.error('[Auth] Error releasing lock:', e.message));
      console.log(`[Auth] 🔓 ${username} released portal login lock.`);
    }
  }
}

async function performLoginToPortal(username: string, password?: string, isInteractive?: boolean): Promise<AuthResult> {
  const loginStart = performance.now();
  let browser;
  try {
    const netId = username.split('@')[0] || username;

    // Prevent spamming the same wrong password
    if (password) {
      const cachedInvalid = invalidPasswordCache.get(netId);
      if (cachedInvalid && cachedInvalid.password === password && Date.now() - cachedInvalid.timestamp < 5 * 60 * 1000) {
         console.log(`[PortalAuth] Instant reject for ${netId} due to recently cached invalid password.`);
         return { success: false, error: 'Invalid Password. Please check your portal credentials.' };
      }
    }

    const sessionPath = path.join(SESSIONS_DIR, `${username.replace(/[^a-zA-Z0-9]/g, '_')}_portal_session.json`);
    
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    
    browser = await chromium.launch({ headless: true });
    let context = await browser.newContext();
    
    try {
      await fs.readFile(sessionPath, 'utf-8');
      context = await browser.newContext({ storageState: sessionPath });
      console.log(`[PortalAuth] Found saved session for ${netId}`);
    } catch (e) {}
    
    const page = await context.newPage();
    console.log(`[PortalAuth] Navigating to portal...`);
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
    
    if (page.url().includes('HRDSystem.jsp') || page.url().includes('template') || page.url().includes('dashboard')) {
      console.log(`[PortalAuth] Session is still valid! (Checked in ${(performance.now() - loginStart).toFixed(2)} ms)`);
      return { success: true, page, browser, context };
    }
    
    if (!password) {
       await browser.close();
       return { success: false, error: 'Session expired and no password provided for auto-login.' };
    }

    console.log(`[PortalAuth] Session expired. Proceeding with OCR auto-login...`);
    
    let loginSuccess = false;
    let interceptedError: string | null = null;
    
    const responseHandler = async (response: any) => {
      if (response.url().includes('LoginServlet') && response.request().method() === 'POST') {
        const text = await response.text().catch(() => '');
        if (text.toLowerCase().includes('invalid captcha') || text.toLowerCase().includes('enter valid capt')) {
          interceptedError = 'Invalid Captcha';
        } else if (text.toLowerCase().includes('invalid password') || text.toLowerCase().includes('invalid credentials') || text.toLowerCase().includes('enter valid pass')) {
          interceptedError = 'Invalid Password';
        }
      }
    };
    page.on('response', responseHandler);

    let retries = 10;
    while ((retries > 0 || isInteractive) && !loginSuccess) {
       interceptedError = null;
       
       if (retries > 0) {
           console.log(`[PortalAuth] Captcha OCR attempt (${11 - retries}/10)...`);
       } else {
           console.log(`[PortalAuth] OCR failed max retries. Requesting manual Captcha from user...`);
       }
       
       const captchaLocator = page.locator('#secure_captcha').first();
       await captchaLocator.waitFor({ state: 'attached', timeout: 10000 });
       await page.waitForTimeout(1000); // Let image load fully
       
       let captchaText = '';
       let isValidOCR = false;

       while (!isValidOCR && (retries > 0 || isInteractive)) {
           const buffer = await captchaLocator.screenshot();
           
           if (retries > 0) {
               captchaText = await solveCaptcha(buffer);
           } else {
               // Manual Fallback via CaptchaService
               try {
                   captchaText = await captchaService.requestManualCaptcha(username, buffer.toString('base64'));
               } catch (e) {
                   console.log(`[PortalAuth] Manual Captcha timeout or override.`);
                   break; // Break inner loop on timeout
               }
           }
           
           if (captchaText.length >= 5 && captchaText.length <= 7) {
               isValidOCR = true;
           } else {
               console.log(`[PortalAuth] Invalid format '${captchaText}', instantly retrying...`);
               if (retries > 0) retries--;
               
               if (retries > 0 || isInteractive) {
                   await page.click('#captchaImg').catch(() => page.reload({ waitUntil: 'domcontentloaded' }));
                   await page.waitForTimeout(1000);
               }
           }
       }

       if (!isValidOCR && retries <= 0 && isInteractive) {
           // Timeout hit during manual captcha
           loginSuccess = false;
           break;
       }

       console.log(`[PortalAuth] Final Captcha Read: ${captchaText}`);
       
       await page.fill('#username', netId);
       await page.fill('#password', password!);
       await page.fill('#captcha', captchaText);
       
       // Simulate human interaction to pass guardlogin.js telemetry
       await page.mouse.move(100, 100);
       await page.mouse.down();
       await page.mouse.move(200, 200);
       await page.mouse.up();
       await page.waitForTimeout(1500); // Wait for timeElapsed > 1
       
       await page.click('button[type="submit"]');
       
       await Promise.race([
         page.waitForURL(/HRDSystem\.jsp|template|dashboard/i, { timeout: 8000 }),
         page.waitForLoadState('networkidle', { timeout: 8000 })
       ]).catch(() => {});
       
       if (!page.url().includes('youLogin.jsp') && !page.url().includes('LoginServlet') && !page.url().includes('logout')) {
         loginSuccess = true;
       } else {
         let domError = null;
         const errorMsgLoc = page.locator('.alert, .cc-error, #error-message, .alert-danger, [role="alert"], .login-error, .errorMsg, font[color="red"]').first();
         if (await errorMsgLoc.isVisible().catch(() => false)) {
            domError = await errorMsgLoc.textContent();
            domError = domError?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
         }

         if (domError && !domError.toLowerCase().includes('captcha')) {
            await browser.close();
            const lowerErr = domError.toLowerCase();
            if (lowerErr.includes('invalid') || lowerErr.includes('incorrect') || lowerErr.includes('password') || lowerErr.includes('credentials') || lowerErr.includes('locked')) {
                if (password) invalidPasswordCache.set(netId, { password, timestamp: Date.now() });
            }
            return { success: false, error: domError };
         } else if (interceptedError === 'Invalid Password') {
            await browser.close();
            if (password) invalidPasswordCache.set(netId, { password, timestamp: Date.now() });
            return { success: false, error: 'Invalid Password. Please check your portal credentials.' };
         }
         console.log(`[PortalAuth] Login failed. Retrying... (domError: ${domError})`);
         
         if (retries > 0) {
             retries--;
         }
         
         // Reload page to get new captcha
         if (retries > 0 || isInteractive) {
            await page.reload({ waitUntil: 'domcontentloaded' });
         }
       }
    }
    
    page.off('response', responseHandler);
    
    if (!loginSuccess) {
      console.log(`[PortalAuth] Login failed after max retries.`);
      await browser.close();
      console.log(`[PortalAuth] Login failed for ${netId} after ${(performance.now() - loginStart).toFixed(2)} ms`);
      return { success: false, error: 'Failed to solve Captcha. Please try again.' };
    }
    
    console.log(`[PortalAuth] Login successful! Saving session...`);
    await context.storageState({ path: sessionPath });
    console.log(`[PortalAuth] Successfully logged into portal for ${netId} in ${(performance.now() - loginStart).toFixed(2)} ms`);
    return { success: true, page, browser, context };
    
  } catch (e: any) {
    if (browser) await browser.close();
    console.error(`[PortalAuth] Login error for ${username} after ${(performance.now() - loginStart).toFixed(2)} ms:`, e.message);
    return { success: false, error: e.message };
  }
}
