const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminReports.jsx', 'utf8');

const getButton = (titleRegex) => {
  const btnRegex = new RegExp(`<button[^>]+title="${titleRegex}"[\\s\\S]*?</button>`, 'i');
  const match = content.match(btnRegex);
  return match ? match[0] : null;
};

const printBtn = getButton('طباعة');
const wordBtn = getButton('تصدير إلى Word');
const excelBtn = getButton('تصدير إلى Excel');
const pdfBtn = getButton('تصدير إلى PDF');

if (!printBtn || !wordBtn || !excelBtn || !pdfBtn) {
  console.log('Could not find all buttons!');
  process.exit(1);
}

// Find the container div
const containerStart = '<div className="flex gap-2">';
const containerIdx = content.indexOf(containerStart);
if (containerIdx === -1) {
  console.log('Container not found');
  process.exit(1);
}

// Find the end of the container by looking for the next closing div
const nextDivIdx = content.indexOf('</div>', containerIdx + containerStart.length);

// Replace the inner HTML of the container
const oldHtml = content.substring(containerIdx + containerStart.length, nextDivIdx);

// Wait, the buttons might have spaces between them. 
// Just replacing them might mess up indentation, but JSX doesn't care.
const newHtml = `\n              ${printBtn}\n              ${wordBtn}\n              ${excelBtn}\n              ${pdfBtn}\n            `;

// But wait, the buttons are actually inside the container div, followed by `</div>`.
// Let's use string replacement.
// Let's just remove the 4 buttons from the content, then insert them in order.

// A safer way:
// Replace each button with a unique placeholder.
content = content.replace(printBtn, '___PRINT_BTN___');
content = content.replace(wordBtn, '___WORD_BTN___');
content = content.replace(excelBtn, '___EXCEL_BTN___');
content = content.replace(pdfBtn, '___PDF_BTN___');

// Now, the container has: ___WORD_BTN___ ... ___PRINT_BTN___ ... ___PDF_BTN___ ... ___EXCEL_BTN___
// Let's replace the whole sequence of placeholders with the correctly ordered buttons.
// Actually, since they are siblings, they are placed together. 
const placeholderRegex = /(?:___PRINT_BTN___|___WORD_BTN___|___EXCEL_BTN___|___PDF_BTN___\s*)+/g;
content = content.replace(placeholderRegex, () => {
  return `${printBtn}\n              ${wordBtn}\n              ${excelBtn}\n              ${pdfBtn}`;
});

fs.writeFileSync('src/pages/admin/AdminReports.jsx', content);
console.log('Reordered buttons successfully.');
