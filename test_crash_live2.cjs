const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const url = 'https://mirjaswork.web.app/admin';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => { localStorage.setItem('mirjas_admin_token', 'true'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  const rootHtmlAdmin = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("Root length before clicking:", rootHtmlAdmin.length);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const reportsBtn = buttons.find(b => b.textContent.includes('التقارير'));
    if (reportsBtn) reportsBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  const rootHtmlReports = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("Root length after clicking:", rootHtmlReports.length);

  // Print the first 500 chars to see what it is
  console.log(rootHtmlReports.substring(0, 500));

  await browser.close();
})();
