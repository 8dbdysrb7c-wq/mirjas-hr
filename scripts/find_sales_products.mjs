import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/AdminSales.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('مخدة') || l.includes('الأصناف المطلوبة') || (l.includes('product') && l.includes('map('))) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
