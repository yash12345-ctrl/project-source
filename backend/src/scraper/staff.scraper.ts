import { chromium } from 'patchright';
import * as cheerio from 'cheerio';

export interface StaffMember {
  name: string;
  profileUrl: string;
  imageUrl: string;
  imageBase64?: string;
  designation: string;
  specialization: string;
}

export async function scrapeStaffFinder(query: string): Promise<StaffMember[]> {
  let browser = null;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();

    // SPEED OPTIMIZATION: Block heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // We will intercept the AJAX response to extract the HTML directly.
    let searchResponseHtml = '';
    page.on('response', async response => {
      if (response.url().includes('admin-ajax.php') && response.request().method() === 'POST') {
        try {
          const text = await response.text();
          if (text.includes('staff-card')) {
             searchResponseHtml = text;
          }
        } catch(e) {}
      }
    });

    console.log(`[StaffScraper] Navigating to staff finder for query: ${query}...`);
    await page.goto("https://www.srmist.edu.in/staff-finder/", { waitUntil: 'networkidle' });
    
    // Brief wait to bypass any immediate WAF checks
    await page.waitForTimeout(3000);
    
    // Clear any previous AJAX responses caught during initial page load!
    searchResponseHtml = '';
    
    // Clear DOM results to prevent stale data
    await page.evaluate(() => {
      const resultDiv = document.querySelector('.result');
      if (resultDiv) resultDiv.innerHTML = '';
    });
    
    // Fill search input
    console.log(`[StaffScraper] Executing search...`);
    await page.fill('input[name="faculty"]', query);
    
    // Clear any previous AJAX responses caught during initial page load!
    searchResponseHtml = '';
    
    // Click Search
    await page.click('button.submit_button');
    
    // Wait for the AJAX response to be captured (give it up to 10 seconds)
    let attempts = 0;
    while (!searchResponseHtml && attempts < 20) {
      await page.waitForTimeout(500);
      attempts++;
    }
    
    if (!searchResponseHtml) {
      // Fallback: extract directly from DOM if interception missed it
      searchResponseHtml = await page.innerHTML('.result');
    }
    
    const $ = cheerio.load(searchResponseHtml);
    let staffMembers: StaffMember[] = [];
    
    $('.staff-card').each((i, el) => {
      const name = $(el).find('.post-title a').text().trim();
      const profileUrl = $(el).find('.post-title a').attr('href') || '';
      
      // Image source handling (might be lazy-loaded, so check srcset or src)
      const img = $(el).find('.post-image img');
      let imageUrl = img.attr('src') || '';
      // Exclude base64 placeholder if src is lazy loaded
      if (imageUrl.startsWith('data:image')) {
          imageUrl = img.attr('data-src') || imageUrl;
      }
      
      const designation = $(el).find('.designation').text().trim();
      const specialization = $(el).find('.specialization_area').text().trim();
      
      if (name) {
        staffMembers.push({
          name,
          profileUrl,
          imageUrl,
          designation,
          specialization
        });
      }
    });

    if (staffMembers.length > 0) {
      const getTokens = (name: string) => name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s*/i, '').toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).filter(t => t.length > 0);
      const queryTokens = getTokens(query);
      
      let bestMatch: StaffMember = staffMembers[0]!;
      let maxScore = -1;
      
      for (const member of staffMembers) {
         const memberTokens = getTokens(member.name);
         let score = 0;
         for (const qt of queryTokens) {
            if (memberTokens.includes(qt)) score++;
         }
         
         const nQuery = queryTokens.join('');
         const nMember = memberTokens.join('');
         if (nQuery === nMember) score += 100;
         else if (nMember.includes(nQuery) || nQuery.includes(nMember)) score += 50;
         
         if (score > maxScore) {
            maxScore = score;
            bestMatch = member;
         }
      }
      staffMembers = [bestMatch];
    }

    // NOW: Fetch the actual images as Base64 INSIDE the authorized Playwright context
    // This perfectly bypasses the AWS WAF since the browser already solved the challenges!
    console.log(`[StaffScraper] Fetching images as Base64 to bypass WAF...`);
    
    const evaluateScript = `
      async (members) => {
        const getBase64Image = async function(url) {
          if (!url) return '';
          try {
            const response = await fetch(url);
            if (!response.ok) return '';
            const blob = await response.blob();
            return new Promise(function(resolve) {
              const reader = new FileReader();
              reader.onloadend = function() { resolve(reader.result); };
              reader.onerror = function() { resolve(''); };
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            return '';
          }
        };

        for (let i = 0; i < members.length; i++) {
          if (members[i].imageUrl) {
            members[i].imageBase64 = await getBase64Image(members[i].imageUrl);
          }
        }
        return members;
      }
    `;

    staffMembers = await page.evaluate(`(${evaluateScript})(${JSON.stringify(staffMembers)})`);

    console.log(`[StaffScraper] Found ${staffMembers.length} results.`);
    return staffMembers;
    
  } catch(error) {
    console.error('[StaffScraper] Error:', error);
    throw new Error('Failed to scrape staff finder.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapeStaffFinderBulk(queries: string[]): Promise<Record<string, StaffMember | null>> {
  let browser = null;
  const results: Record<string, StaffMember | null> = {};
  
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    });
    
    // We will do this sequentially to avoid overwhelming the WAF, but using a SINGLE page context for speed!
    const page = await context.newPage();

    // SPEED OPTIMIZATION: Block heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    let searchResponseHtml = '';
    
    page.on('response', async response => {
      if (response.url().includes('admin-ajax.php') && response.request().method() === 'POST') {
        try {
          const text = await response.text();
          if (text.includes('staff-card')) {
             searchResponseHtml = text;
          }
        } catch(e) {}
      }
    });

    console.log('[StaffScraper] Navigating to staff finder for bulk search...');
    await page.goto("https://www.srmist.edu.in/staff-finder/", { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for initial WAF check
    
    for (const query of queries) {
      console.log(`[StaffScraper] Bulk querying: ${query}`);
      try {
        searchResponseHtml = ''; // Reset for the new query
        
        // Clear DOM results to prevent stale data
        await page.evaluate(() => {
          const resultDiv = document.querySelector('.result');
          if (resultDiv) resultDiv.innerHTML = '';
        });
        
        await page.fill('input[name="faculty"]', query);
        await page.click('button.submit_button');
        
        let attempts = 0;
        while (!searchResponseHtml && attempts < 15) {
          await page.waitForTimeout(500);
          attempts++;
        }
        
        if (!searchResponseHtml) {
          searchResponseHtml = await page.innerHTML('.result');
        }
        
        const $ = cheerio.load(searchResponseHtml);
        let staffMembers: StaffMember[] = [];
        
        $('.staff-card').each((i, el) => {
          const name = $(el).find('.post-title a').text().trim();
          const profileUrl = $(el).find('.post-title a').attr('href') || '';
          const img = $(el).find('.post-image img');
          let imageUrl = img.attr('src') || '';
          if (imageUrl.startsWith('data:image')) {
              imageUrl = img.attr('data-src') || imageUrl;
          }
          const designation = $(el).find('.designation').text().trim();
          const specialization = $(el).find('.specialization_area').text().trim();
          
          if (name) {
            staffMembers.push({ name, profileUrl, imageUrl, designation, specialization });
          }
        });

        if (staffMembers.length > 0) {
          const getTokens = (name: string) => name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s*/i, '').toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).filter(t => t.length > 0);
          const queryTokens = getTokens(query);
          
          let bestMatch: StaffMember = staffMembers[0]!;
          let maxScore = -1;
          
          for (const member of staffMembers) {
             const memberTokens = getTokens(member.name);
             let score = 0;
             for (const qt of queryTokens) {
                if (memberTokens.includes(qt)) score++;
             }
             
             const nQuery = queryTokens.join('');
             const nMember = memberTokens.join('');
             if (nQuery === nMember) score += 100;
             else if (nMember.includes(nQuery) || nQuery.includes(nMember)) score += 50;
             
             if (score > maxScore) {
                maxScore = score;
                bestMatch = member;
             }
          }

          const evaluateScript = `
            async (members) => {
              const getBase64Image = async function(url) {
                if (!url) return '';
                try {
                  const response = await fetch(url);
                  if (!response.ok) return '';
                  const blob = await response.blob();
                  return new Promise(function(resolve) {
                    const reader = new FileReader();
                    reader.onloadend = function() { resolve(reader.result); };
                    reader.onerror = function() { resolve(''); };
                    reader.readAsDataURL(blob);
                  });
                } catch (e) {
                  return '';
                }
              };

              for (let i = 0; i < members.length; i++) {
                if (members[i].imageUrl) {
                  members[i].imageBase64 = await getBase64Image(members[i].imageUrl);
                }
              }
              return members;
            }
          `;
          const withBase64 = await page.evaluate(`(${evaluateScript})(${JSON.stringify([bestMatch])})`) as any[];
          results[query] = withBase64[0];
        } else {
          results[query] = null;
        }
      } catch (err) {
        console.error(`Error scraping ${query}:`, err);
        results[query] = null;
      }
    }
    
    await page.close();
    
    return results;
  } catch(error) {
    console.error('[StaffScraper] Bulk Error:', error);
    throw new Error('Failed to bulk scrape staff finder.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
