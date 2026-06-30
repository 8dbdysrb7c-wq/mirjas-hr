const fs = require('fs');
const b64 = fs.readFileSync('exact_pdf_b64.txt', 'utf8').trim();
let content = fs.readFileSync('src/pages/admin/AdminReports.jsx', 'utf8');
const target = /<img src=\"data:image\/svg\+xml;base64,[^\"]+\" alt=\"PDF\" style=\{\{ width: '28px', height: '28px' \}\} \/>/;
if (target.test(content)) {
  content = content.replace(target, `<img src="${b64}" alt="PDF" style={{ width: '28px', height: '28px' }} />`);
  fs.writeFileSync('src/pages/admin/AdminReports.jsx', content);
  console.log('Replaced successfully.');
} else {
  console.log('Target not found!');
}
