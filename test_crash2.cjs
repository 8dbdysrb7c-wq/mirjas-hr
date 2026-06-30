const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE EXCEPTION:', error.message);
  });

  const url = 'http://localhost:4173/admin';
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Login
  console.log("Logging in...");
  await page.type('input[type="password"]', 'Admin123'); // assuming password is not strictly checked locally or whatever it is, wait, we can just set localStorage!
  
  await page.evaluate(() => {
    localStorage.setItem('mirjas_admin_token', 'true');
  });
  
  console.log("Reloading after setting token...");
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking Reports tab...");
  // Find the button with text "مركز التقارير" or similar
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const reportsBtn = buttons.find(b => b.textContent.includes('التقارير'));
    if (reportsBtn) reportsBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 3000));
  console.log("Done");
  await browser.close();
})();
