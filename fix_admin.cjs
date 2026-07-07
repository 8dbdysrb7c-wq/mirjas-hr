const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');
let lines = content.split('\n');

let firstIdx = -1;
let secondIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleAddCustomerModal = () => {')) {
        if (firstIdx === -1) {
            firstIdx = i;
        } else if (secondIdx === -1) {
            secondIdx = i;
        }
    }
}

if (firstIdx !== -1 && secondIdx !== -1) {
    lines.splice(firstIdx, secondIdx - firstIdx);
    console.log("Successfully removed the broken duplicated block!");
} else {
    console.log("Could not find duplicated block. File might already be fixed.");
}

content = lines.join('\n');

// 2. Fix the missing uniqueItemLocations in handleOpenModal
const brokenTarget = `    let title = 'إضافة صنف جديد للمخزون';
    if (isEdit) title = 'تعديل صنف';
    else if (isCopy) title = 'إضافة لون/موقع آخر لنفس الصنف';

    const allSystemLocations = [...new Set(stock.map(s => s.location).filter(Boolean))].sort();

    MySwal.fire({`;

const correctReplacement = `    let title = 'إضافة صنف جديد للمخزون';
    if (isEdit) title = 'تعديل صنف';
    else if (isCopy) title = 'إضافة لون/موقع آخر لنفس الصنف';

    const allItemLocations = item ? stock.filter(s => s.itemNumber === item.itemNumber).map(s => s.location).filter(Boolean) : [];
    const uniqueItemLocations = [...new Set(allItemLocations)];
    const allSystemLocations = [...new Set(stock.map(s => s.location).filter(Boolean))].sort();

    MySwal.fire({`;

if (content.includes(brokenTarget)) {
    content = content.replace(brokenTarget, correctReplacement);
    console.log("Added missing uniqueItemLocations back!");
}

fs.writeFileSync('src/pages/admin/AdminStock.jsx', content);
console.log("Fixes applied successfully!");
