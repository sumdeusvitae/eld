import 'dotenv/config';

import { chromium } from 'playwright';
import fetch from 'node-fetch'; // ✅ Add this at the top of your file
import config from './config.js';


process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise rejection:', reason);
});

async function scrapeDrivers(username, password, url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (!url) throw new Error('URL is undefined');

    await page.goto(url);

    await page.waitForSelector('input[formcontrolname="email"]');
    await page.fill('input[formcontrolname="email"]', '');
    await page.fill('input[formcontrolname="email"]', username);
    await page.fill('input[formcontrolname="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    // await page.screenshot({ path: 'after-login.png', fullPage: true });

    await page.waitForSelector('a[href*="drivers"]', { timeout: 30000 });

    await page.click('a[href*="drivers"]');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr');

    const drivers = await page.$$eval('table tbody tr', rows => {
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(cell => cell.innerText.trim());
      });
    });



    const filteredDrivers = drivers
      .filter(row => row.length >= 11)
      .map(row => ({
        name: row[0],
        status: row[1],
        location: row[2],
        truck_id: row[3],
        shift_start: row[4],
        break_time: row[5],
        drive_time: row[6],
        cycle_time: row[7],
        connection_status: row[9],
        reported_at: row[10],
        last_updated: new Date().toISOString()
      }));

    return filteredDrivers;
  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    await browser.close();
  }
}




const INTERVAL_MS = 60 * 1000; // 1 minute
const DURATION_MS = 65 * 60 * 1000; // 65 minutes

const END_TIME = Date.now() + DURATION_MS;

async function runScraper() {
  const now = Date.now();
  if (now >= END_TIME) {
    console.log('⏹️ Done: 1 hour elapsed.');
    process.exit(0);
  }

  console.log(`⏱️ Running at ${new Date().toLocaleTimeString()}`);
  try {
    const robinhoodDrivers = await scrapeDrivers(config.robinhood_username, config.robinhood_password, config.robinhood_Url);
    const flexDrivers = await scrapeDrivers(config.flex_username, config.flex_password, config.flex_Url);
    // merge the results
    const allDrivers = [...robinhoodDrivers, ...flexDrivers];

    // Send once
    const response = await fetch(config.server_Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drivers: allDrivers }),
    });
    const result = await response.json();
    console.log('✅ Server response:', result);
  } catch (err) {
    console.error('❌ Error during scraping or posting:', err);
  }

  // Schedule next run
  setTimeout(runScraper, INTERVAL_MS);
}

runScraper();
