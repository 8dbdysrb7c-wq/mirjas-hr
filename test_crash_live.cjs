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

  const url = 'https://mirjaswork.web.app/admin';
  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Set current user properly
  console.log("Setting token...");
  await page.evaluate(() => {
    localStorage.setItem('currentUser', JSON.stringify({ role: 'admin', uid: 'testadmin', name: 'Admin', hasReportsAccess: true }));
    localStorage.setItem('pwaPromptShown', 'true'); // bypass the prompt!
  });
  
  console.log("Reloading...");
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking Reports tab...");
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    const reportsBtn = divs.find(d => d.textContent && d.textContent.includes('التقارير') && (d.className.includes('bottom-nav-item') || d.className.includes('admin-sidebar-item')));
    if (reportsBtn) {
      console.log("Found reports button, clicking!");
      reportsBtn.click();
    } else {
      console.log("REPORTS BUTTON NOT FOUND");
    }
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  console.log("Root length:", rootHtml.length);
  
  await page.screenshot({path: 'screenshot_crash_live.png'});

  console.log("Done");
  await browser.close();
})();
