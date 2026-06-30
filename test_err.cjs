const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQ FAIL:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5174/');
  
  // Wait for login
  await page.waitForSelector('input[type="text"]');
  await page.type('input[type="text"]', '000000');
  await page.type('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  // Wait for navigation and wait 2 seconds
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Go to Admin Settings
  await page.goto('http://localhost:5174/admin/settings');
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
