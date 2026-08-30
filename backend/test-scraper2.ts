import { scrapeStaffFinderBulk } from './src/scraper/staff.scraper';
async function test() {
  try {
    const res = await scrapeStaffFinderBulk(['Hariprasad S', 'N Gana Rama', 'Pavithra J']);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Test failed", err);
  }
}
test();
