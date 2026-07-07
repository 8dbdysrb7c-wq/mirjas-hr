const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace the didOpen function
const oldDidOpen = `      didOpen: () => {
        const categorySelect = document.getElementById('swal-category');
        const itemNumberInput = document.getElementById('swal-itemNumber');
        if (categorySelect && itemNumberInput) {
          categorySelect.addEventListener('change', (e) => {
            itemNumberInput.value = generateNextID(e.target.value);
          });
        }
      },`;

const newDidOpen = `      didOpen: () => {
        const categorySelect = document.getElementById('swal-category');
        const itemNumberInput = document.getElementById('swal-itemNumber');
        if (categorySelect && itemNumberInput) {
          categorySelect.addEventListener('change', (e) => {
            itemNumberInput.value = generateNextID(e.target.value);
          });
        }
        
        const addLocBtn = document.getElementById('add-new-location-btn');
        const locSelect = document.getElementById('swal-location');
        const newLocInput = document.getElementById('swal-new-location-input');
        if (addLocBtn && locSelect && newLocInput) {
          let isInputMode = false;
          addLocBtn.addEventListener('click', () => {
            isInputMode = !isInputMode;
            if (isInputMode) {
              locSelect.style.display = 'none';
              newLocInput.style.display = 'block';
              newLocInput.focus();
              addLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/></svg>';
              addLocBtn.title = "إلغاء الإضافة";
              addLocBtn.style.backgroundColor = '#ef4444';
            } else {
              locSelect.style.display = 'block';
              newLocInput.style.display = 'none';
              newLocInput.value = '';
              addLocBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
              addLocBtn.title = "إضافة موقع جديد";
              addLocBtn.style.backgroundColor = '#13898f';
            }
          });
        }
      },`;

// 2. Replace the HTML block for Location
const oldHTMLRegex = /<div class="flex gap-2">[\s\S]*?<input id="swal-location" list="locations-list" class="premium-input" style="flex: 1; margin-bottom: 0;" placeholder="مثال: A14, A26" value="\$\{initialData\.location \|\| ''\}">[\s\S]*?<datalist id="locations-list">[\s\S]*?\$\{allSystemLocations\.map\(loc => `<option value="\$\{loc\}"><\/option>`\)\.join\(''\)\}[\s\S]*?<\/datalist>[\s\S]*?<button class="btn" style="background-color: #13898f; color: white; padding: 0 1rem; border-radius: 8px; flex-shrink: 0;" title="إضافة موقع جديد">[\s\S]*?<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2\.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"\/><path d="M12 5v14"\/><\/svg>[\s\S]*?<\/button>[\s\S]*?<\/div>/;

const newHTML = `<div class="flex gap-2">
                <select id="swal-location" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  <option value="">بدون موقع</option>
                  \${allSystemLocations.map(loc => \`<option value="\${loc}" \${initialData.location === loc ? 'selected' : ''}>\${loc}</option>\`).join('')}
                  \${initialData.location && !allSystemLocations.includes(initialData.location) ? \`<option value="\${initialData.location}" selected>\${initialData.location}</option>\` : ''}
                </select>
                <input id="swal-new-location-input" class="premium-input" style="flex: 1; margin-bottom: 0; display: none;" placeholder="أدخل اسم الموقع الجديد">
                <button id="add-new-location-btn" type="button" class="btn" style="background-color: #13898f; color: white; padding: 0 1rem; border-radius: 8px; flex-shrink: 0;" title="إضافة موقع جديد">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>`;

// 3. Update preConfirm
const oldPreConfirmLoc = `location: document.getElementById('swal-location').value,`;
const newPreConfirmLoc = `location: (() => {
            const select = document.getElementById('swal-location');
            const input = document.getElementById('swal-new-location-input');
            if (input && input.style.display !== 'none' && input.value.trim()) {
              return input.value.trim();
            }
            return select ? select.value : '';
          })(),`;

if (content.includes('didOpen: () => {')) {
  // We need to match the oldDidOpen even with different CRLF
  // To be safe, we will use regex for didOpen too
  const didOpenRegex = /didOpen: \(\) => \{[\s\S]*?const categorySelect = document\.getElementById\('swal-category'\);[\s\S]*?const itemNumberInput = document\.getElementById\('swal-itemNumber'\);[\s\S]*?if \(categorySelect && itemNumberInput\) \{[\s\S]*?categorySelect\.addEventListener\('change', \(e\) => \{[\s\S]*?itemNumberInput\.value = generateNextID\(e\.target\.value\);[\s\S]*?\}\);[\s\S]*?\}[\s\S]*?\},/;
  
  content = content.replace(didOpenRegex, newDidOpen);
  content = content.replace(oldHTMLRegex, newHTML);
  content = content.replace(/location: document\.getElementById\('swal-location'\)\.value,/, newPreConfirmLoc);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log("Successfully replaced location input with a select dropdown!");
} else {
  console.log("Could not find the targets.");
}
