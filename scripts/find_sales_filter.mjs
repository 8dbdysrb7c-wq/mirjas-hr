import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/AdminSales.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('filtered') || l.includes('orders.filter') || (l.includes('.filter') && l.includes('status'))) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
