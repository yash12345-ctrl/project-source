import { loginToPortal } from './portalAuth';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export async function scrapeCalendar(username: string, password?: string, isInteractive: boolean = false) {
  const { success, error, page, browser } = await loginToPortal(username, password, isInteractive);
  if (!success || !page || !browser) {
    return { success: false, error: error || 'Login failed' };
  }

  try {
    console.log(`[Calendar] Extracting calendar data...`);
    
    // 1. Click the main 'Academic Calender/Planner' sidebar link
    const calLink = page.locator('a:has-text("Academic Calender/Planner") >> visible=true').first();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      calLink.click({ timeout: 5000 })
    ]);
    
    await page.waitForTimeout(3000); // give it some time to load
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const workingDays = $('.ac-stat-card.s-work .ac-num').text().trim() || '0';
    const holidays = $('.ac-stat-card.s-hol .ac-num').text().trim() || '0';
    const totalDays = $('.ac-stat-card.s-total .ac-num').text().trim() || '0';
    
    const rows: any[] = [];
    $('.ac-tr').each((_, el) => {
      const tds = $(el).find('.ac-td');
      if (tds.length >= 6) {
        rows.push({
          date: $(tds[0]).text().trim(),
          day: $(tds[1]).text().trim(),
          status: $(tds[2]).text().trim(),
          week: $(tds[3]).text().trim(),
          dayOrder: $(tds[4]).text().trim(),
          remarks: $(tds[5]).text().trim(),
        });
      }
    });
    
    console.log(`[Calendar] Extracted ${rows.length} calendar rows.`);
    
    return {
      success: true,
      stats: { workingDays, holidays, totalDays },
      rows
    };
  } catch (error) {
    console.error(`[Calendar] Extraction failed:`, error);
    return { success: false, error: 'Failed to extract calendar data' };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
