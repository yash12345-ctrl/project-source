import { Page } from 'patchright';
import { loginToPortal } from './portalAuth';

export type InternalMarkRow = {
  code: string;
  description: string;
  markObtained: string;
  maxMark: string;
};

export async function scrapeInternalMarks(username: string, password?: string, isInteractive?: boolean): Promise<{ success: boolean, error?: string, marks?: InternalMarkRow[] }> {
  const start = performance.now();
  const { success, error, page, browser } = await loginToPortal(username, password, isInteractive);
  if (!success || !page || !browser) {
    return { success: false, error: error || 'Login failed' };
  }
  
  try {
    const marks = await extractInternalMarks(page);
    await browser.close();
    console.log(`[Performance] 🕒 Internal Marks scraped in ${(performance.now() - start).toFixed(2)} ms`);
    return { success: true, marks };
  } catch (error: any) {
    console.error('[InternalMarks] Extraction Error:', error);
    await browser.close().catch(() => {});
    return { success: false, error: error.message };
  }
}

async function extractInternalMarks(page: Page) {
  try {
    console.log(`[InternalMarks] Extracting internal marks data...`);
    
    const marksLink = page.locator('#listId13, a:has-text("Internal Mark Details")').first();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      marksLink.click({ timeout: 10000 })
    ]);
    
    await page.waitForTimeout(2000); // Give it time to render
    await Promise.race([
      page.waitForSelector('text=Internal Mark Details', { timeout: 15000 }),
      page.waitForSelector('text=Mark / Max', { timeout: 15000 }),
      page.waitForSelector('table', { timeout: 15000 }),
      page.waitForSelector('#txtDoorNo', { timeout: 15000 })
    ]).catch(() => {});
    
    // Check if an interstitial form like Local Residential Address is blocking access
    const blockingFormLoc = page.locator('#txtDoorNo, #txtCityName, #hidchkHostelOpen').first();
    if (await blockingFormLoc.isVisible().catch(() => false)) {
        throw new Error("Action Required: Please log into the SRM Student Portal manually and update your Local Residential Address. The portal is blocking access to your data until this is completed.");
    }

    const marksData: InternalMarkRow[] = [];
    
    // Evaluate in browser context to reliably get the table
    const tableData = await page.evaluate(() => {
      // Find the table that contains 'Mark / Max'
      const tables = Array.from(document.querySelectorAll('table'));
      let targetTable: HTMLTableElement | null = null;
      
      for (const table of tables) {
        if (table.textContent && table.textContent.includes('Mark / Max')) {
          targetTable = table;
          break;
        }
      }
      
      if (!targetTable) {
          // If no main table is found, try to search within iframes
          const iframes = document.querySelectorAll('iframe, frame');
          for (const frame of Array.from(iframes)) {
              try {
                  const frameDoc = (frame as HTMLIFrameElement).contentDocument;
                  if (frameDoc) {
                      const frameTables = Array.from(frameDoc.querySelectorAll('table'));
                      for (const t of frameTables) {
                          if (t.textContent && t.textContent.includes('Mark / Max')) {
                              targetTable = t;
                              break;
                          }
                      }
                  }
              } catch(e) {}
              if(targetTable) break;
          }
      }

      if (!targetTable) return [];
      
      const rows = Array.from(targetTable.querySelectorAll('tr'));
      const data = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
        if (cells.length >= 3) {
          data.push(cells);
        }
      }
      
      return data;
    });

    for (const cells of tableData) {
      if (cells.length >= 3) {
        const code = cells[0];
        const description = cells[1];
        const markText = cells[2]; // e.g. "5.00 / 5.00"
        
        if (code && description && markText) {
          // Ignore row if it looks like a header or unrelated
          if (code.toLowerCase() === 'code' || description.toLowerCase() === 'description') continue;
          
          let markObtained = '';
          let maxMark = '';
          
          const parts = markText.split('/');
          if (parts.length === 2) {
            markObtained = (parts[0] || '').trim();
            maxMark = (parts[1] || '').trim();
          } else {
            markObtained = markText;
          }
          
          marksData.push({
            code,
            description,
            markObtained,
            maxMark
          });
        }
      }
    }

    if (marksData.length === 0) {
      console.warn(`[InternalMarks] No internal marks rows parsed.`);
      throw new Error('Internal marks page loaded, but no rows could be parsed.');
    }
    
    console.log(`[InternalMarks] Successfully scraped ${marksData.length} subjects.`);
    return marksData;
  } catch (error: any) {
    console.error(`[InternalMarks] Extraction failed:`, error);
    throw error;
  }
}
