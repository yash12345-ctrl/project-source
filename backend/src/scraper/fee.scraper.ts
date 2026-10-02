import { loginToPortal } from './portalAuth';
import { Page } from 'patchright';

async function extractTableData(page: Page) {
  // Find all tables and pick the one with the most rows, or just the first major one
  const tables = page.locator('table');
  const count = await tables.count();
  let bestTable = null;
  let maxRows = 0;
  
  for (let i = 0; i < count; i++) {
    const table = tables.nth(i);
    const rows = await table.locator('tr').count();
    if (rows > maxRows) {
      maxRows = rows;
      bestTable = table;
    }
  }

  if (!bestTable) return { headers: [], rows: [] };

  const rows = await bestTable.locator('tr').all();
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = await rows[0]!.locator('th, td').allInnerTexts();
  
  const tableRows = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = await rows[i]!.locator('td').allInnerTexts();
    if (cells.length > 0) {
      tableRows.push(cells.map(c => c.trim()));
    }
  }
  return { headers: headers.map(h => h.trim()), rows: tableRows };
}

export async function scrapeFees(username: string, password?: string, isInteractive: boolean = false) {
  const start = performance.now();
  const { success, error, page, browser } = await loginToPortal(username, password, isInteractive);
  if (!success || !page || !browser) {
    return { success: false, error: error || 'Login failed' };
  }

  try {
    console.log(`[Fees] Extracting fee data...`);
    
    const extractTab = async (buttonText: string) => {
      console.log(`[Fees] Extracting ${buttonText}...`);
      
      // 1. Click the main 'Fee Payment' sidebar link to reset the view
      const feeLink = page.locator('a:has-text("Fee Payment") >> visible=true').first();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        feeLink.click({ timeout: 5000 })
      ]);
      
      // 2. Wait for the tab buttons to appear
      await Promise.race([
        page.waitForSelector(`text=${buttonText}`, { timeout: 15000 }),
        page.waitForSelector('#txtDoorNo', { timeout: 15000 })
      ]).catch(() => {});
      
      // Check if an interstitial form like Local Residential Address is blocking access
      const blockingFormLoc = page.locator('#txtDoorNo, #txtCityName, #hidchkHostelOpen').first();
      if (await blockingFormLoc.isVisible().catch(() => false)) {
          throw new Error("Action Required: Please log into the SRM Student Portal manually and update your Local Residential Address. The portal is blocking access to your data until this is completed.");
      }
      
      // 3. Click the specific tab button
      try {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
          page.getByText(buttonText, { exact: false }).first().click({ timeout: 5000 })
        ]);
        // Give it an extra second just to make sure the table has rendered
        await page.waitForTimeout(2000);
      } catch(e) { 
        console.error(`[Fees] Failed to click ${buttonText}`); 
      }
      
      return await extractTableData(page);
    };

    const feeDetails = await extractTab("Fee Details");
    const paymentLog = await extractTab("Payment Transaction Log");
    const pendingExam = await extractTab("Pending Exam Fee Status");

    console.log(`[Fees] Successfully extracted fee tables.`);
    
    console.log(`[Performance] 🕒 Fees scraped in ${(performance.now() - start).toFixed(2)} ms`);
    return { success: true, feeDetails, paymentLog, pendingExam };
  } catch (error) {
    console.error(`[Fees] Extraction failed:`, error);
    return { success: false, error: 'Failed to extract fee data' };
  } finally {
    await browser.close();
  }
}
