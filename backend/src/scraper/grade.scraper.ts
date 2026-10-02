import { Page } from 'patchright';
import { loginToPortal } from './portalAuth';

export async function scrapeGrades(username: string, password?: string, isInteractive?: boolean): Promise<{ success: boolean, error?: string, semesters?: any[], cgpa?: string }> {
  const start = performance.now();
  const { success, error, page, browser } = await loginToPortal(username, password, isInteractive);
  if (!success || !page || !browser) {
    return { success: false, error: error || 'Login failed' };
  }
  
  try {
    const data = await extractGrades(page);
    await browser.close();
    console.log(`[Performance] 🕒 Grades scraped in ${(performance.now() - start).toFixed(2)} ms`);
    return { success: true, semesters: data.semesters, cgpa: data.cgpa };
  } catch (error: any) {
    console.error('[Grades] Extraction Error:', error);
    await browser.close().catch(() => {});
    return { success: false, error: error.message };
  }
}

async function extractGrades(page: Page) {
  try {
    console.log(`[Grades] Extracting grades data...`);
    
    // Click the Grade / Mark & Credit link
    const gradesLink = page.locator('a:has-text("Grade / Mark & Credit") >> visible=true').first();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      gradesLink.click()
    ]);
    
    await page.waitForTimeout(2000); // Give it time to render
    // Wait for the table to appear (usually has "Grade / Mark Obtained" header)
    await Promise.race([
      page.waitForSelector('text=Grade / Mark Obtained', { timeout: 15000 }),
      page.waitForSelector('#txtDoorNo', { timeout: 15000 })
    ]).catch(() => {});
    
    // Check if an interstitial form like Local Residential Address is blocking access
    const blockingFormLoc = page.locator('#txtDoorNo, #txtCityName, #hidchkHostelOpen').first();
    if (await blockingFormLoc.isVisible().catch(() => false)) {
        throw new Error("Action Required: Please log into the SRM Student Portal manually and update your Local Residential Address. The portal is blocking access to your data until this is completed.");
    }
    
    const rowsLocator = page.locator('table tr');
    const rowCount = await rowsLocator.count();
    
    const semestersMap: Record<string, { sgpa: string, courses: any[] }> = {};
    let cgpa = '';
    
    for (let i = 1; i < rowCount; i++) {
      const rowText = await rowsLocator.nth(i).innerText();
      
      // Check for SGPA or CGPA row
      if (rowText.includes('CGPA')) {
         const match = rowText.match(/CGPA\s*(\d+\.\d+)/i);
         if (match && match[1]) cgpa = match[1];
         continue;
      }
      
      const cells = rowsLocator.nth(i).locator('td, th');
      const cellCount = await cells.count();
      
      // If it's a summary row (like SGPA)
      if (cellCount >= 2 && rowText.includes('SGPA')) {
         // Usually cell 0 is "SGPA", cell 1 is the value
         const text = await cells.last().innerText().catch(() => '');
         const match = text.match(/(\d+\.\d+)/);
         const val = (match && match[1]) ? match[1] : text.trim();
         
         // Assign this SGPA to the most recently parsed semester
         const keys = Object.keys(semestersMap);
         if (keys.length > 0) {
           const lastSem = keys[keys.length - 1];
           if (lastSem && semestersMap[lastSem] && !semestersMap[lastSem]!.sgpa) {
             semestersMap[lastSem]!.sgpa = val;
           }
         }
         continue;
      }
      
      // Expected course row: Semester, Month / Year, Code, Description, Credit, Grade
      if (cellCount >= 6) {
        const semester = await cells.nth(0).innerText().catch(() => '');
        const monthYear = await cells.nth(1).innerText().catch(() => '');
        const code = await cells.nth(2).innerText().catch(() => '');
        const description = await cells.nth(3).innerText().catch(() => '');
        const credit = await cells.nth(4).innerText().catch(() => '');
        const grade = await cells.nth(5).innerText().catch(() => '');
        
        const sem = semester.trim();
        if (sem && code && code.trim() !== '' && code.trim() !== 'Code' && !code.includes('SGPA')) {
          if (!semestersMap[sem]) {
            semestersMap[sem] = { sgpa: '', courses: [] };
          }
          semestersMap[sem].courses.push({
            semester: sem,
            monthYear: monthYear.trim(),
            code: code.trim(),
            description: description.trim(),
            credit: credit.trim(),
            grade: grade.trim()
          });
        }
      }
    }
    
    const semesters = Object.keys(semestersMap).map(sem => ({
       semester: sem,
       sgpa: semestersMap[sem]!.sgpa,
       courses: semestersMap[sem]!.courses
    })).sort((a, b) => parseInt(b.semester) - parseInt(a.semester)); // Descending order
    
    console.log(`[Grades] Successfully scraped ${semesters.length} semesters with CGPA: ${cgpa}`);
    return { semesters, cgpa };
  } catch (error) {
    console.error(`[Grades] Extraction failed:`, error);
    return { semesters: [], cgpa: '' };
  }
}
