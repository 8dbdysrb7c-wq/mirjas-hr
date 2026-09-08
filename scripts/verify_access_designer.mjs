import { build } from 'vite';
import { createServer } from 'node:http';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { writeFile, unlink, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const fixture = path.join(root, '.access-designer-review.html');
await writeFile(fixture, `<!doctype html><html dir="rtl"><meta charset="utf-8"><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import Designer from '/src/components/UserAccessDesigner.jsx'; import '/src/index.css';
const employee={id:'review-employee',name:'موظف تجريبي',hasStockAccess:true};
createRoot(document.getElementById('root')).render(React.createElement(Designer,{employee,employees:[employee,{id:'review-other',name:'مستخدم آخر'}],actor:{id:'review-admin',name:'مدير تجريبي'},onClose:()=>{}}));
</script></html>`, { flag: 'wx' });
let server, browser;
try {
  console.log('Building isolated preview');
  const outDir = path.join(root, 'artifacts/access-preview');
  await build({ root, configFile: false, plugins: [react()], build: { outDir, emptyOutDir: false, rolldownOptions: { input: fixture } } });
  server = createServer(async (req, res) => {
    const relative = new URL(req.url, 'http://localhost').pathname;
    const target = path.resolve(outDir, '.' + relative);
    if (!target.startsWith(outDir + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      const content = await readFile(target);
      res.writeHead(200, { 'Content-Type': target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : 'text/html' });
      res.end(content);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(5179, '127.0.0.1', resolve));
  console.log('Launching browser');
  browser = await puppeteer.launch({ executablePath: process.env.REVIEW_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:5179/.access-designer-review.html');
  console.log('Checking rendered editor');
  await page.waitForSelector('.access-modes');
  await page.evaluate(() => [...document.querySelectorAll('.access-modes button')].find(button => button.textContent === 'مشاهدة فقط').click());
  await page.evaluate(() => [...document.querySelectorAll('footer button')].find(button => button.textContent.includes('حفظ')).click());
  await page.waitForFunction(() => Boolean(localStorage.getItem('mrsleep.access-draft.v1.review-admin.review-employee')));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mrsleep.access-draft.v1.review-admin.review-employee')));
  assert.equal(saved.policy.sections.inventory.mode, 'view');
  assert.equal(saved.policy.sections.inventory.screens.stock_view.edit, false);
  assert.equal(saved.history.length, 1);
  await page.reload();
  await page.waitForSelector('.access-modes .active');
  assert.equal(await page.$eval('.access-modes .active', node => node.textContent), 'مشاهدة فقط');
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'artifacts/access-designer-desktop.png'), fullPage: true });
  await page.evaluate(() => [...document.querySelectorAll('.access-toolbar button')].find(button => button.textContent.includes('معاينة')).click());
  assert.equal(await page.$$eval('.access-preview-action', nodes => nodes.some(node => node.textContent === 'حذف')), false);
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(root, 'artifacts/access-designer-mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: designer render, save/reload, read-only preview and browser error checks');
} finally {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await unlink(fixture);
}
