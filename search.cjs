const fs = require('fs');
const lines = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('showModal')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
