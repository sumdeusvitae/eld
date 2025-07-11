import 'dotenv/config';

import { chromium } from 'playwright';
import config from './config.js';
import connectDB from './db.js'; // ✅ ES import — make sure db.js uses export default

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
    await page.screenshot({ path: 'after-login.png', fullPage: true });

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

    const db = await connectDB();
    const collection = db.collection('drivers');

    for (const row of drivers) {
      if (row.length < 11) continue;

      await collection.updateOne(
        { name: row[0] },
        {
          $set: {
            status: row[1],
            location: row[2],
            truck_id: row[3],
            shift_start: row[4],
            break_time: row[5],
            drive_time: row[6],
            cycle_time: row[7],
            connection_status: row[9],
            reported_at: row[10],
            last_updated: new Date()
          }
        },
        { upsert: true }
      );
    }

  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    await browser.close();
  }
}

// ✅ Run immediately
scrapeDrivers(config.robinhood_username, config.robinhood_password, config.robinhood_Url);
scrapeDrivers(config.flex_username, config.flex_password, config.flex_Url);

// ✅ Run every 5 minutes
setInterval(() => {
  scrapeDrivers(config.robinhood_username, config.robinhood_password, config.robinhood_Url);
  scrapeDrivers(config.flex_username, config.flex_password, config.flex_Url);
}, 5 * 60 * 1000);
