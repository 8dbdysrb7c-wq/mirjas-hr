const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');

// The goal is to replace the `html:` string inside `handleOpenModal` SweetAlert.

// 1. Locate the start and end of the `html: \`` block inside `handleOpenModal`
const handleOpenModalStart = content.indexOf('const handleOpenModal = (item = null, isCopy = false) => {');
if (handleOpenModalStart === -1) {
    console.error("Could not find handleOpenModal");
    process.exit(1);
}

const htmlStart = content.indexOf('html: `', handleOpenModalStart);
const preConfirmStart = content.indexOf('showCancelButton: true', htmlStart);

if (htmlStart === -1 || preConfirmStart === -1) {
    console.error("Could not find html block");
    process.exit(1);
}

// We also need to compute `uniqueItemLocations` before the MySwal.fire
const mySwalStart = content.indexOf('MySwal.fire({', handleOpenModalStart);

if (!content.includes('const allItemLocations = item ?')) {
    const locationsLogic = `
    const allItemLocations = item ? stock.filter(s => s.itemNumber === item.itemNumber).map(s => s.location).filter(Boolean) : [];
    const uniqueItemLocations = [...new Set(allItemLocations)];
    
    MySwal.fire({`;
    content = content.replace('MySwal.fire({', locationsLogic);
}

// The new HTML block
const newHtml = `html: \`
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-primary"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
             <span>\${title}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="grid grid-cols-12 gap-x-8 gap-y-6">
            
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" placeholder="SKU-0001" value="\${initialData.itemNumber}" disabled style="background: var(--surface); cursor: not-allowed; font-weight: bold; color: var(--primary-dark); text-align: center;">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="\${initialData.name}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="" disabled>اختر التصنيف</option>
                \${globalSettings.stockCategories?.map(c => \`<option value="\${c}" \${initialData.category === c ? 'selected' : ''}>\${c}</option>\`).join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="\${initialData.itemCode || ''}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled>اختر المخزن</option>
                \${globalSettings.warehouses?.map(w => \`<option value="\${w}" \${initialData.warehouse === w ? 'selected' : ''}>\${w}</option>\`).join('')}
              </select>
            </div>
            <div class="col-span-12 md:col-span-4"></div>

            <div class="premium-form-group col-span-12 md:col-span-8">
              <label>الموقع (داخل المخزن)</label>
              <div class="flex gap-2">
                <button class="btn" style="background-color: #13898f; color: white; padding: 0 1rem; border-radius: 8px; flex-shrink: 0;" title="إضافة موقع جديد">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
                <select id="swal-location" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  <option value="" disabled>اختر الموقع</option>
                  \${uniqueItemLocations.includes(initialData.location) ? '' : (initialData.location ? \`<option value="\${initialData.location}" selected>\${initialData.location}</option>\` : '')}
                  \${uniqueItemLocations.map(loc => \`<option value="\${loc}" \${initialData.location === loc ? 'selected' : ''}>\${loc}</option>\`).join('')}
                </select>
              </div>
            </div>
            <div class="col-span-12 md:col-span-4"></div>

            \${uniqueItemLocations.length > 0 ? \`
            <div class="col-span-12 md:col-span-8 text-center mt-2 mb-4">
               <div class="text-sm font-bold text-slate-700 mb-2">أماكن تواجد الصنف الحالية (للمعلومة)</div>
               <div class="flex justify-center gap-6 text-slate-500 font-bold text-sm">
                  \${uniqueItemLocations.map(loc => \`<span>\${loc}</span>\`).join('')}
               </div>
            </div>
            \` : ''}

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                \${globalSettings.stockColors?.map(c => \`<option value="\${c}" \${initialData.spec === c ? 'selected' : ''}>\${c}</option>\`).join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2; margin-bottom: 0;" value="\${initialData.quantity}">
                <select id="swal-unit" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  \${globalSettings.stockUnits?.map(u => \`<option value="\${u}" \${initialData.unit === u ? 'selected' : ''}>\${u}</option>\`).join('')}
                </select>
              </div>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="\${initialData.minLimit || 0}">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" \${initialData.lastMovement === 'إدخال' ? 'selected' : ''}>إدخال</option>
                <option value="إخراج" \${initialData.lastMovement === 'إخراج' ? 'selected' : ''}>إخراج</option>
                <option value="إتلاف" \${initialData.lastMovement === 'إتلاف' ? 'selected' : ''}>إتلاف</option>
                <option value="جرد وتسوية" \${initialData.lastMovement === 'جرد وتسوية' ? 'selected' : ''}>جرد وتسوية</option>
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>تاريخ آخر حركة</label>
              <input id="swal-lastMovementDate" type="date" class="premium-input" value="\${initialData.lastMovementDate}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر مستلم / مسؤول</label>
              <input id="swal-lastRecipient" class="premium-input" placeholder="اسم الشخص" value="\${initialData.lastRecipient || ''}">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-8">
              <label>ملاحظات</label>
              <textarea id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." style="min-height: 80px;">\${initialData.notes || ''}</textarea>
            </div>
          </div>
        </div>
      \`,
      `;

// We need to re-find htmlStart and preConfirmStart because content might have changed above
const htmlStart2 = content.indexOf('html: `', handleOpenModalStart);
const preConfirmStart2 = content.indexOf('showCancelButton: true,', htmlStart2);

if (htmlStart2 !== -1 && preConfirmStart2 !== -1) {
    content = content.substring(0, htmlStart2) + newHtml + content.substring(preConfirmStart2);
}

fs.writeFileSync('src/pages/admin/AdminStock.jsx', content);
console.log("Modal template replaced successfully!");
