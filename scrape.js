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

    try {
      const response = await fetch(server_Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drivers: filteredDrivers })
      });

      const result = await response.json();
      console.log('Server response:', result);
    } catch (err) {
      console.error('Failed to send to Go server:', err);
    }


  } catch (error) {
    console.error('Scraping failed:', error);
  } finally {
    await browser.close();
  }
}




async function main() {
  const initialTime = new Date();
  let currentTime = new Date();
  const maxCount = 60 * 60 * 1000; // 1 hour in milliseconds

  while ((initialTime - currentTime) < maxCount) {
    // // // ✅ Run every 1 minute
    setInterval(() => {
      scrapeDrivers(config.robinhood_username, config.robinhood_password, config.robinhood_Url);
      scrapeDrivers(config.flex_username, config.flex_password, config.flex_Url);
    }, 60 * 1000);
    currentTime = new Date();
  }

  // Optional: force exit if something is still keeping the process alive
  process.exit(0);
}

main();