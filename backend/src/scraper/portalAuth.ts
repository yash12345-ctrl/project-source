import { chromium, Browser, BrowserContext, Page } from 'patchright';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { captchaService } from './captcha.service';

const PORTAL_URL = 'https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp';
const SESSIONS_DIR = path.join(__dirname, '../../sessions/portal');

class ConcurrencyQueue {
  private queue: (() => Promise<void>)[] = [];
  private active = 0;
  constructor(private limit = 1) {}
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.active >= this.limit || this.queue.length === 0) return;
    this.active++;
    const next = this.queue.shift()!;
    try {
      await next();
    } finally {
      this.active--;
      this.processNext();
    }
  }
}

const authQueue = new ConcurrencyQueue(1);

async function solveCaptcha(buffer: Buffer): Promise<string> {
  try {
    const b64 = buffer.toString('base64');
    const pythonPath = path.join(__dirname, '../../venv/bin/python');
    const scriptPath = path.join(__dirname, '../../solve.py');
    const output = execSync(`${pythonPath} ${scriptPath} ${b64}`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const result = JSON.parse(output.trim());
    if (result.success) {
      return result.text;
    }
  } catch (e) {
    console.error('OCR Error:', e);
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

export async function loginToPortal(username: string, password?: string, isInteractive?: boolean): Promise<AuthResult> {
  return authQueue.add(() => performLoginToPortal(username, password, isInteractive));
}

async function performLoginToPortal(username: string, password?: string, isInteractive?: boolean): Promise<AuthResult> {
  let browser;
  try {
    const netId = username.split('@')[0] || username;
    const sessionPath = path.join(SESSIONS_DIR, `${netId}_session.json`);
    
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
      console.log(`[PortalAuth] Session is still valid!`);
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
         if (interceptedError === 'Invalid Password') {
            await browser.close();
            return { success: false, error: 'Invalid Password. Please check your portal credentials.' };
         }
         console.log(`[PortalAuth] Login failed. Retrying...`);
         
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
      return { success: false, error: 'Failed to solve Captcha. Please try again.' };
    }
    
    console.log(`[PortalAuth] Login successful! Saving session...`);
    await context.storageState({ path: sessionPath });
    
    return { success: true, page, browser, context };
  } catch (error: any) {
    console.error('[PortalAuth] Auto-Login Error:', error);
    if (browser) await browser.close().catch(() => {});
    return { success: false, error: error.message };
  }
}
