import { chromium } from 'patchright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUBJECTS = [
  'Advanced Calculus And Complex Analysis',
  'Electrical And Electronics Engineering',
  'Semiconductor Physics And Computational Methods',
  'Physics-Mechanics',
  'Object Oriented Design And Programming',
  'Communicative English',
  'Engineering Mechanics',
  'Electronic System And PCB Design',
  'Building Materials In The Built Environment',
  'Electromagnetic Physics'
];

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  
  for (const SUBJECT_NAME of SUBJECTS) {
    const encodedName = encodeURIComponent(SUBJECT_NAME);
    const SUBJECT_URL = `https://www.thehelpers.tech/semesters/2/subjects/${encodedName}`;
    
    console.log(`\n\n=== Starting Scraping for ${SUBJECT_NAME} ===`);
    
    // First, get the count and titles
    const page1 = await browser.newPage();
    let count = 0;
    try {
      await page1.goto(SUBJECT_URL, { waitUntil: 'networkidle' });
      count = await page1.locator('ul li button').count();
    } catch (e: any) {
      console.log(`Error loading ${SUBJECT_NAME} page:`, e.message);
      await page1.close();
      continue;
    }
    
    const items: {title: string, index: number}[] = [];
    for (let j = 0; j < count; j++) {
      const btn = page1.locator('ul li button').nth(j);
      const li = btn.locator('xpath=ancestor::li[1]');
      const titleRaw = await li.locator('span').first().textContent().catch(() => null);
      items.push({
        title: titleRaw ? titleRaw.trim() : `Document ${j + 1}`,
        index: j
      });
    }
    await page1.close();

    // Upsert the subject
    const subject = await prisma.subject.upsert({
      where: { semester_name: { semester: 2, name: SUBJECT_NAME } },
      update: { url: SUBJECT_URL },
      create: { semester: 2, name: SUBJECT_NAME, url: SUBJECT_URL }
    });
    console.log(`Saved Subject to DB: ${subject.id}, found ${count} documents.`);

    for (const item of items) {
      console.log(`[${item.index+1}/${count}] Scraping: ${item.title}`);
      
      const page = await browser.newPage();
      try {
        await page.goto(SUBJECT_URL, { waitUntil: 'networkidle' });
        const btn = page.locator('ul li button').nth(item.index);
        
        // We wait for a short moment so React can fully hydrate event listeners
        await page.waitForTimeout(1000);
        
        await btn.click({ timeout: 5000 });
        
        // Wait for navigation to file-viewer
        await page.waitForURL('**/file-viewer**', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000); // Wait for the viewer page to load its iframe
        
        const iframe = await page.waitForSelector('iframe', { timeout: 8000 }).catch(() => null);
        if (iframe) {
          const src = await iframe.getAttribute('src');
          if (src) {
            await prisma.document.upsert({
              where: { subjectId_title: { subjectId: subject.id, title: item.title } },
              update: { url: src },
              create: { subjectId: subject.id, title: item.title, url: src }
            });
            console.log(`   -> Saved URL: ${src}`);
          }
        } else {
          console.log(`   -> No iframe found for this document.`);
        }
      } catch (e: any) {
        console.log(`   -> Error processing document: ${e.message}`);
      } finally {
        await page.close();
      }
    }
    console.log(`=== Finished Scraping for ${SUBJECT_NAME} ===\n`);
  }
  
  await browser.close();
  await prisma.$disconnect();
  console.log('All requested subjects scraped successfully!');
}

run().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
