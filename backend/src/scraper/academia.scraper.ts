import { chromium } from 'patchright';
import type { AcademiaCredentials, AttendanceRecord, MarksRecord, ScrapeResult, CourseRecord } from '../types/academia.types';
import * as fs from 'fs';
import * as path from 'path';

const ACADEMIA_URL = 'https://academia.srmist.edu.in';
const SESSIONS_DIR = path.join(__dirname, '..', '..', 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

export async function scrapeAcademia(
  credentials: AcademiaCredentials,
  onLoginSuccess?: () => void
): Promise<ScrapeResult> {
  let browser;

  try {
    console.log(`[Scraper] Starting browser for user: ${credentials.username}`);

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const sessionPath = path.join(SESSIONS_DIR, `${credentials.username.replace(/[^a-zA-Z0-9]/g, '_')}_session.json`);
    
    // Create context, optionally with saved session
    let context;
    let hasSession = fs.existsSync(sessionPath);
    if (hasSession) {
      console.log('[Scraper] Found saved session, attempting fast login...');
      context = await browser.newContext({ storageState: sessionPath });
    } else {
      console.log('[Scraper] No saved session found, performing full login...');
      context = await browser.newContext();
    }

    const page = await context.newPage();
    const portalUrl = `${ACADEMIA_URL}/portal/academia-academic-services`;
    
    let needsLogin = !hasSession;
    
    if (hasSession) {
      // Try to go directly to portal to check if session is still valid
      console.log('[Scraper] Navigating to portal to check session validity...');
      await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      
      // Give Zoho just a moment to process the redirect if it's going to the login page
      await page.waitForTimeout(1000);
      
      let currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl === ACADEMIA_URL || currentUrl === ACADEMIA_URL + '/' || currentUrl.includes('about:blank')) {
        needsLogin = true;
      } else {
        const isLoginFramePresent = await page.locator('#signinFrame, iframe[name="zohoiam"], input#login_id').first().isVisible().catch(() => false);
        if (isLoginFramePresent) {
          needsLogin = true;
        }
      }
    }

    if (needsLogin) {
      console.log('[Scraper] Session invalid or missing. Proceeding with full login...');
      
      await page.goto(ACADEMIA_URL, { waitUntil: 'networkidle', timeout: 30000 });

      // SRM Academia uses Zoho People login iframe – find the inputs
      const frameLoc = page.frameLocator('iframe#signinFrame, iframe[name="zohoiam"]');
      
      // Locate inputs in either the iframe or the main page
      const emailInput = frameLoc.locator('input#login_id, input[name="LOGIN_ID"], #Email').first()
        .or(page.locator('input#login_id, input[name="LOGIN_ID"], #Email').first());
        
      const nextBtn = frameLoc.locator('button#nextbtn, button:has-text("Next")').first()
        .or(page.locator('button#nextbtn, button:has-text("Next")').first());

      await emailInput.fill(credentials.username);
      await nextBtn.click();
      
      await page.waitForTimeout(2000);

      const passwordInput = frameLoc.locator('input#password, input[name="PASSWORD"]').first()
        .or(page.locator('input#password, input[name="PASSWORD"]').first());
        
      await passwordInput.fill(credentials.password);

      // Click submit button
      const loginBtn = frameLoc.locator('button#nextbtn, button:has-text("Sign in"), button[type="submit"], input[type="submit"], .loginbtn, .signin-btn').first()
        .or(page.locator('button#nextbtn, button:has-text("Sign in"), button[type="submit"], input[type="submit"], .loginbtn, .signin-btn').first());
        
      await loginBtn.click();

      console.log('[Scraper] Submitted login form, waiting for navigation...');
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => console.log('No navigation happened, continuing...'));
      
      // Wait a moment for any JS error messages to appear in the iframe
      await page.waitForTimeout(2000);

      // Check for errors in the iframe or main page
      const errorMsgLoc = frameLoc.locator('.error-message, .alert, .invalid-feedback, #password_error, .field-msg .error-msg, .login-error').first()
         .or(page.locator('.error-message, .alert, .invalid-feedback, #password_error, .field-msg .error-msg, .login-error').first());
         
      if (await errorMsgLoc.isVisible().catch(() => false)) {
         const errorMsg = await errorMsgLoc.textContent();
         throw new Error(errorMsg?.trim() || 'Login failed. Please check your credentials.');
      }

      let currentUrl;
      // Handle potential interstitial pages like "block-sessions" or "preannouncement"
      for (let i = 0; i < 3; i++) {
        currentUrl = page.url();
        if (currentUrl.includes('preannouncement') || currentUrl.includes('block-sessions') || currentUrl.includes('mfa') || currentUrl.includes('announcement')) {
           console.log(`[Scraper] Encountered interstitial page: ${currentUrl}. Trying to continue...`);
           
           const continueBtn = page.locator('button:has-text("Terminate all"), button:has-text("Terminate All"), a:has-text("Terminate all"), button:has-text("Continue"), a:has-text("Continue"), button.continue-btn, input[value="Continue"], button:has-text("Skip"), button.btn, .signin-btn').first();
           if (await continueBtn.count() > 0) {
              console.log('[Scraper] Clicking continue button on interstitial...');
              await page.waitForTimeout(1000);
              await continueBtn.click({ force: true, timeout: 5000 }).catch(async () => {
                  console.log('[Scraper] Force click timed out/failed, trying JS evaluation click...');
                  await continueBtn.evaluate((el: any) => el.click()).catch(() => {});
              });
              await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
           } else {
              console.log('[Scraper] No continue button found, hoping it auto-redirects...');
              await page.waitForTimeout(5000);
           }
        } else {
           break;
        }
      }

      console.log(`[Scraper] Login successful! Saving session...`);
      // Save session state so we don't have to log in next time
      await context.storageState({ path: sessionPath });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      console.log(`[Scraper] Fast Login successful! Resumed saved session.`);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }

    // --- Step 4: Scrape Courses, Profile & Timetable Grid ---
    // scrapeCourses navigates to the Time Table view where both courses and profile exist
    const courses = await scrapeCourses(page);
    const profile = await scrapeProfile(page);
    const timetableGrid = await scrapeUnifiedTimeTable(page, profile);

    await browser.close();
    console.log(`[Scraper] Scraped ${courses.length} courses and profile.`);

    return {
      success: true,
      username: credentials.username,
      attendance: [],
      marks: [],
      courses,
      profile,
      timetableGrid,
      scrapedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error(`[Scraper] Error:`, error);
    if (browser) await browser.close();
    return {
      success: false,
      username: credentials.username,
      attendance: [],
      marks: [],
      courses: [],
      error: error.message
    };
  }
}

async function scrapeProfile(page: any) {
  try {
    console.log('[Scraper] Extracting profile data...');
    // Evaluate a script in the browser to extract the key-value pairs from the table
    const profileData = await page.evaluate(() => {
      const data: any = {};
      const tds = Array.from(document.querySelectorAll('td'));
      
      for (let i = 0; i < tds.length; i++) {
        const text = tds[i]?.textContent?.trim() || '';
        if (text.includes('Registration Number:')) {
          data.registrationNumber = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Name:') {
          data.name = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Batch:') {
          data.batch = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Mobile:') {
          data.mobile = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Program:') {
          data.program = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Department:') {
          data.department = tds[i + 1]?.textContent?.trim() || '';
        } else if (text === 'Semester:') {
          data.semester = tds[i + 1]?.textContent?.trim() || '';
        }
      }
      return data;
    });
    
    return {
      registrationNumber: profileData.registrationNumber || '',
      name: profileData.name || '',
      batch: profileData.batch || '',
      mobile: profileData.mobile || '',
      program: profileData.program || '',
      department: profileData.department || '',
      semester: profileData.semester || ''
    };
  } catch (error) {
    console.error('[Scraper] Error scraping profile:', error);
    return undefined;
  }
}


/**
 * Navigates to the Time Table section and scrapes enrolled courses.
 */
async function scrapeCourses(page: any): Promise<CourseRecord[]> {
  const courses: CourseRecord[] = [];

  try {
    console.log('[Scraper] Navigating to Time Table view...');
    
    const portalUrl = `${ACADEMIA_URL}/portal/academia-academic-services`;
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    // Navigate directly to the Time Table Attendance view hash
    console.log('[Scraper] Navigating directly to Time Table hash URL...');
    await page.goto(`${portalUrl}#My_Time_Table_Attendance`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    
    // Intelligently wait for the table to render instead of blindly waiting 5 seconds
    console.log('[Scraper] Waiting for table to render...');
    await page.locator('table tr, .zc-record-row, .zc-viewtable').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // Dump HTML for debugging if needed
    const fs = require('fs');
    fs.writeFileSync('/home/yash/Documents/academia/backend/timetable.html', await page.content());

    console.log('[Scraper] Extracting table rows...');
    const rows = await page.locator('table tr, table.zc-viewtable tr, .zc-record-row').all();

    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 6) {
        const cellTexts = await Promise.all(cells.map((c: any) => c.textContent().then((t: string | null) => t?.trim() || '')));
        
        // Find course code (e.g. 21AIE22IT, 21CSC205P)
        let code = '';
        let codeIndex = -1;
        for (let i = 0; i < cellTexts.length; i++) {
           if (cellTexts[i].match(/^[0-9]{2}[A-Z]{2,4}[0-9]{2,4}[A-Z]?$/)) {
              code = cellTexts[i];
              codeIndex = i;
              break;
           }
        }
        
        if (code && codeIndex >= 0 && cellTexts.length >= codeIndex + 3) {
           const title = cellTexts[codeIndex + 1];
           
           // 1: Course Code
           // 2: Course Title
           // 3: Credit
           // 4: Regn. Type
           // 5: Category
           // 6: Course Type
           // 7: Faculty Name
           // 8: Slot
           // 9: Room No
           
           const courseType = cellTexts.length > codeIndex + 5 ? cellTexts[codeIndex + 5] : '';
           const faculty = cellTexts.length > codeIndex + 6 ? cellTexts[codeIndex + 6] : '';
           const slot = cellTexts.length > codeIndex + 7 ? cellTexts[codeIndex + 7] : '';
           const room = cellTexts.length > codeIndex + 8 ? cellTexts[codeIndex + 8] : '';

           // Only push if we haven't already scraped this EXACT course code + type combination
           if (!courses.some(c => c.code === code && c.type === courseType)) {
             courses.push({
               code,
               title,
               type: courseType,
               faculty,
               slot,
               room
             });
           }
        }
      }
    }

    console.log(`[Scraper] Scraped ${courses.length} courses.`);
  } catch (err: any) {
    console.warn(`[Scraper] Warning: Could not scrape courses - ${err.message}`);
  }

  return courses;
}

async function scrapeUnifiedTimeTable(page: any, profile: any) {
  try {
    if (!profile || !profile.batch) {
      console.log('[Scraper] No batch found in profile, skipping Unified Time Table.');
      return undefined;
    }
    
    // Clean up the batch string (e.g. if it's "2" or "Batch 2")
    const batch = profile.batch.replace(/[^0-9]/g, '');
    if (batch !== '1' && batch !== '2') {
      console.log(`[Scraper] Unknown batch "${batch}", skipping Unified Time Table.`);
      return undefined;
    }

    console.log(`[Scraper] Navigating to Unified Time Table for Batch ${batch}...`);
    const portalUrl = `https://academia.srmist.edu.in/portal/academia-academic-services`;
    
    // Zoho hash routing for the timetable
    const hashUrl = batch === '1' ? '#Page:Unified_Time_Table_2025_Batch_1' : '#Page:Unified_Time_Table_2025_batch_2';
    const containerId = batch === '1' ? '#zc-viewcontainer_Unified_Time_Table_2025_Batch_1' : '#zc-viewcontainer_Unified_Time_Table_2025_batch_2';
    
    await page.goto(`${portalUrl}${hashUrl}`).catch(() => {});
    
    console.log(`[Scraper] Waiting for container ${containerId} to render...`);
    await page.waitForSelector(containerId, { state: 'visible', timeout: 15000 }).catch(() => {});
    // Add a tiny sleep to let the inner DOM paint
    await page.waitForTimeout(2000);
    
    const gridData = await page.evaluate((containerSel: string) => {
      const result: Record<string, { time: string, slot: string }[]> = {};
      
      const TIMETABLE_HOURS = [
        "08:00 - 08:50", "08:50 - 09:40", "09:45 - 10:35", "10:40 - 11:30", 
        "11:35 - 12:25", "12:30 - 01:20", "01:25 - 02:15", "02:20 - 03:10", 
        "03:10 - 04:00", "04:00 - 04:50", "04:50 - 05:30", "05:30 - 06:10"
      ];

      const rows = Array.from(document.querySelectorAll(`${containerSel} table tr`));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length === 0) continue;
        
        const firstCell = cells[0]?.textContent?.trim() || '';
        if (firstCell.startsWith('Day ')) {
          const dayName = firstCell;
          result[dayName] = [];
          
          // The remaining cells should be the slots (usually 12 columns)
          for (let i = 1; i < cells.length; i++) {
            if (i - 1 < TIMETABLE_HOURS.length) {
              const slot = cells[i]?.textContent?.trim() || '';
              const timeStr = TIMETABLE_HOURS[i - 1] || '';
              result[dayName].push({
                time: timeStr,
                slot: slot
              });
            }
          }
        }
      }
      return result;
    }, containerId);

    console.log(`[Scraper] Extracted timetable grid with ${Object.keys(gridData).length} days.`);
    return Object.keys(gridData).length > 0 ? gridData : undefined;

  } catch (error) {
    console.error('[Scraper] Error scraping Unified Time Table:', error);
    return undefined;
  }
}
