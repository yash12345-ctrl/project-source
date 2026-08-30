import { scrapeStaffFinderBulk } from './src/scraper/staff.scraper';
async function test() {
  try {
    const res = await scrapeStaffFinderBulk(['Sasi Rekha']);
    console.log(res);
  } catch (err) {
    console.error("Test failed", err);
  }
}
test();
