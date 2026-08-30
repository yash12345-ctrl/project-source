import { chromium } from 'patchright';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DB_FILE = 'faculty_db.json';
const STATE_FILE = 'faculty_scrape_state.json';

async function run() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  });
  
  const searchPage = await context.newPage();
  const profilePage = await context.newPage();
  
  // Intercept the AJAX response to extract the HTML directly.
  let searchResponseHtml = '';
  searchPage.on('response', async response => {
    if (response.url().includes('admin-ajax.php') && response.request().method() === 'POST') {
      try {
        const text = await response.text();
        if (text.includes('staff-card')) {
           searchResponseHtml = text;
        }
      } catch(e) {}
    }
  });

  // Load previous state and data to allow resuming
  let allFaculty: any[] = [];
  let visitedUrls = new Set<string>();
  if (fs.existsSync(DB_FILE)) {
      try {
          allFaculty = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          allFaculty.forEach(f => visitedUrls.add(f.profileUrl));
          console.log(`Loaded ${allFaculty.length} existing profiles from database.`);
      } catch (e) {}
  }
  
  let startI = 0;
  let startJ = 0;
  if (fs.existsSync(STATE_FILE)) {
      try {
          const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
          startI = state.i || 0;
          startJ = state.j || 0;
          console.log(`Resuming from alphabet combination index: ${startI}, ${startJ}`);
      } catch (e) {}
  }

  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  console.log(`Navigating to staff finder...`);
  await searchPage.goto("https://www.srmist.edu.in/staff-finder/", { waitUntil: 'networkidle' });
  await searchPage.waitForTimeout(3000);
  
  for (let i = startI; i < alphabet.length; i++) {
    for (let j = (i === startI ? startJ : 0); j < alphabet.length; j++) {
      const query = (alphabet[i] || '') + (alphabet[j] || '');
      console.log(`\n--- Searching for combination: "${query}" ---`);
      
      searchResponseHtml = '';
      // Ensure input exists (maybe the WAF challenged us)
      const inputExists = await searchPage.$('input[name="faculty"]');
      if (!inputExists) {
         console.log("WAF block detected or page crashed. Reloading search page...");
         await searchPage.goto("https://www.srmist.edu.in/staff-finder/", { waitUntil: 'networkidle' });
         await searchPage.waitForTimeout(3000);
      }
      
      await searchPage.fill('input[name="faculty"]', query);
      await searchPage.click('button.submit_button');
      
      let attempts = 0;
      while (!searchResponseHtml && attempts < 15) {
        await searchPage.waitForTimeout(500);
        attempts++;
      }
      
      if (!searchResponseHtml) {
        searchResponseHtml = await searchPage.innerHTML('.result').catch(() => '');
      }
      
      const $ = cheerio.load(searchResponseHtml);
      const facultyLinks: { name: string, url: string, image: string }[] = [];
      
      $('.staff-card').each((_, el) => {
        const name = $(el).find('.post-title a').text().trim();
        const url = $(el).find('.post-title a').attr('href') || '';
        let imageUrl = $(el).find('.post-image img').attr('src') || '';
        if (imageUrl.startsWith('data:image')) {
            imageUrl = $(el).find('.post-image img').attr('data-src') || imageUrl;
        }
        
        if (name && url && !visitedUrls.has(url)) {
          facultyLinks.push({ name, url, image: imageUrl });
        }
      });

      console.log(`Found ${facultyLinks.length} NEW faculty members for "${query}". Fetching details...`);
      
      for (const faculty of facultyLinks) {
        console.log(`  Visiting profile: ${faculty.name}`);
        try {
          // USE THE SECOND PAGE FOR PROFILES!
          await profilePage.goto(faculty.url, { waitUntil: 'networkidle', timeout: 15000 });
          await profilePage.waitForTimeout(1000); 
          
          const profileHtml = await profilePage.content();
          const $profile = cheerio.load(profileHtml);
          
          let email = '';
          let phone = '';
          const textContent = $profile('body').text().replace(/\s+/g, ' ');
          
          const emails = textContent.match(/[a-zA-Z0-9._%+-]+@srmist\.edu\.in/g) || [];
          const validEmails = emails.filter(e => e.toLowerCase() !== 'infodesk@srmist.edu.in' && !e.toLowerCase().includes('admissions'));
          if (validEmails.length > 0) email = validEmails[0] as string;
          
          const phones = textContent.match(/(?:\+91[-.\s]?)?[6-9]\d{9}/g) || [];
          if (phones.length > 0) phone = phones[0] as string;
          
          $profile('.elementor-icon-list-text, .elementor-widget-icon-list span').each((_, el) => {
              const t = $profile(el).text().trim();
              if (t.includes('@srmist.edu.in') && t.toLowerCase() !== 'infodesk@srmist.edu.in') email = t;
              if (t.replace(/\D/g, '').length === 10) phone = t;
          });
          
          allFaculty.push({
              name: faculty.name,
              image: faculty.image,
              email: email,
              phone: phone,
              profileUrl: faculty.url
          });
          visitedUrls.add(faculty.url);
          
          await (prisma as any).faculty.upsert({
            where: { profileUrl: faculty.url },
            update: {
              name: faculty.name,
              imageUrl: faculty.image,
              email: email || null,
              phone: phone || null,
            },
            create: {
              profileUrl: faculty.url,
              name: faculty.name,
              imageUrl: faculty.image,
              email: email || null,
              phone: phone || null,
            }
          });
          
          fs.writeFileSync(DB_FILE, JSON.stringify(allFaculty, null, 2));
          
        } catch (e: any) {
          console.log(`  -> Failed to load profile: ${e.message}`);
        }
      }
      
      // Save state after every combination
      fs.writeFileSync(STATE_FILE, JSON.stringify({ i, j }));
      
      // We DO NOT navigate away from the search page anymore!
      await searchPage.waitForTimeout(1000);
    }
  }

  console.log(`\nCOMPLETELY FINISHED! Saved ${allFaculty.length} unique faculty profiles to DB`);
  await browser.close();
  await prisma.$disconnect();
}

run().catch(console.error);
