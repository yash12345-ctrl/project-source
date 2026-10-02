import { Page } from 'patchright';
import { loginToPortal } from './portalAuth';

export async function scrapeAttendance(username: string, password?: string, isInteractive?: boolean): Promise<{ success: boolean, error?: string, attendance?: any[] }> {
  const { success, error, page, browser } = await loginToPortal(username, password, isInteractive);
  if (!success || !page || !browser) {
    return { success: false, error: error || 'Login failed' };
  }
  
  try {
    const attendance = await extractAttendance(page);
    await browser.close();
    return { success: true, attendance };
  } catch (error: any) {
    console.error('[Attendance] Extraction Error:', error);
    await browser.close().catch(() => {});
    return { success: false, error: error.message };
  }
}

async function extractAttendance(page: Page) {
  try {
    console.log(`[Attendance] Extracting attendance data...`);
    
    const attendanceLink = page.locator('a:has-text("Attendance Details") >> visible=true').first();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      attendanceLink.click()
    ]);
    
    await page.waitForTimeout(2000); // Give it time to render
    await page.waitForSelector('text=COURSE WISE ATTENDANCE', { timeout: 15000 });
    
    const rowsLocator = page.locator('table tr');
    const rowCount = await rowsLocator.count();
    
    const attendanceData = [];
    
    for (let i = 1; i < rowCount; i++) { // Skip header row
      const cells = rowsLocator.nth(i).locator('td, th');
      const cellCount = await cells.count();
      
      if (cellCount >= 6) {
        const code = await cells.nth(0).innerText().catch(() => '');
        const title = await cells.nth(1).innerText().catch(() => '');
        const maxHours = await cells.nth(2).innerText().catch(() => '');
        const attHours = await cells.nth(3).innerText().catch(() => '');
        const absentHours = await cells.nth(4).innerText().catch(() => '');
        const percentage = await cells.nth(5).innerText().catch(() => '');
        
        if (code && code.trim() !== '' && code.trim() !== 'Code') {
          attendanceData.push({
            code: code.trim(),
            title: title.trim(),
            maxHours: maxHours.trim(),
            attended: attHours.trim(),
            absent: absentHours.trim(),
            percentage: percentage.trim()
          });
        }
      }
    }
    
    console.log(`[Attendance] Successfully scraped ${attendanceData.length} subjects.`);
    return attendanceData;
  } catch (error) {
    console.error(`[Attendance] Extraction failed:`, error);
    return [];
  }
}
