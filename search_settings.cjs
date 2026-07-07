const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');
const lines = content.split('\n');
const results = new Set();
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('globalSettings.')) {
    const matches = lines[i].match(/globalSettings\.([a-zA-Z0-9_]+)/g);
    if (matches) {
      matches.forEach(m => results.add(m));
    }
  }
}
console.log(Array.from(results).join('\n'));
