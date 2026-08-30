import { chromium } from 'patchright';
import { prisma } from '../db/db';

export interface DocumentLink {
  title: string;
  url: string;
}

export interface SubjectData {
  name: string;
  url: string;
  documents: DocumentLink[];
}

let isSyncing = false;

export function getSyncStatus() {
  return isSyncing;
}

export async function scrapeHelpersSem1(force: boolean = false): Promise<SubjectData[]> {
  if (isSyncing) {
    console.log('[Helpers Scraper] Already syncing, skipping duplicate request.');
    return [];
  }
  isSyncing = true;
  let browser;
  try {
    console.log('[Helpers Scraper] Starting scraping process for Semester 1...');
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('[Helpers Scraper] Navigating to Sem 1...');
    await page.goto('https://www.thehelpers.tech/semesters/1', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for subject links to appear (React SPA needs networkidle)
    await page.waitForSelector('a[href*="/subjects/"]', { timeout: 15000 })
      .catch(() => console.log('[Helpers Scraper] Warning: No subject links found.'));
    
    const subjects = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/subjects/"]')).map(a => ({
        name: a.textContent?.trim() || '',
        url: (a as HTMLAnchorElement).href,
        documents: [] as { title: string; url: string }[]
      }));
    });
    
    console.log(`[Helpers Scraper] Found ${subjects.length} subjects. Starting deep scrape...`);
    
    const results: SubjectData[] = [];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      if (!subject) continue;
      console.log(`[Helpers Scraper] Scraping subject ${i + 1}/${subjects.length}: ${subject.name}`);
      
      try {
        // Navigate to subject page and wait for React to fully render
        await page.goto(subject.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('ul li button', { timeout: 10000 }).catch(() => {});
        
        const count = await page.locator('ul li').count();
        console.log(`[Helpers Scraper]   -> Found ${count} documents`);
        
        // Upsert subject first so it appears in DB immediately
        const subjectRecord = await prisma.subject.upsert({
          where: { semester_name: { semester: 1, name: subject.name } },
          update: { url: subject.url },
          create: { semester: 1, name: subject.name, url: subject.url }
        });

        for (let j = 0; j < count; j++) {
          const li = page.locator('ul li').nth(j);
          const titleEl = li.locator('span');
          const btnEl = li.locator('button');
          
          if (await btnEl.count() === 0) continue;
          
          const title = await titleEl.textContent();
          if (!title) continue;
          
          // Click and wait for navigation to file-viewer
          await btnEl.click();
          
          let docUrl = '';
          try {
            const iframe = await page.waitForSelector('iframe', { timeout: 8000 });
            docUrl = await iframe?.getAttribute('src') || '';
          } catch (e) {
            console.log(`[Helpers Scraper]   -> Timeout for: ${title.trim()}`);
          }
          
          if (docUrl && docUrl !== 'about:blank') {
            subject.documents.push({ title: title.trim(), url: docUrl });
            console.log(`[Helpers Scraper]   -> Saved: ${title.trim()}`);
            
            // Save to DB immediately (incremental progress)
            await prisma.document.upsert({
              where: { subjectId_title: { subjectId: subjectRecord.id, title: title.trim() } },
              update: { url: docUrl },
              create: { subjectId: subjectRecord.id, title: title.trim(), url: docUrl }
            });
          }
          
          // Go back using goto (faster and more reliable than goBack on React SPAs)
          await page.goto(subject.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForSelector('ul li button', { timeout: 5000 }).catch(() => {});
        }
        
        console.log(`[Helpers Scraper] Completed subject: ${subject.name} (${subject.documents.length} docs)`);
        results.push(subject);

      } catch (err: any) {
        console.error(`[Helpers Scraper] Error scraping subject ${subject.name}:`, err.message);
      }
    }
    
    console.log(`[Helpers Scraper] Finished scraping all ${results.length} subjects.`);
    isSyncing = false;
    await browser.close();
    return results;

  } catch (error: any) {
    console.error('[Helpers Scraper] Fatal Error:', error.message);
    isSyncing = false;
    if (browser) await browser.close();
    throw error;
  }
}
