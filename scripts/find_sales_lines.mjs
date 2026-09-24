import fs from 'fs';
const content = fs.readFileSync('src/pages/admin/AdminSales.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('handleSubmit') || l.includes('submitOrder') || l.includes('حفظ الطلب')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
