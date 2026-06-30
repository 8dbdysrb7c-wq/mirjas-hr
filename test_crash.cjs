const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });

  const url = process.argv[2] || 'http://localhost:4173/admin/reports';
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
})();
