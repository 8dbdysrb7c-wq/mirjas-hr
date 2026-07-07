const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HROvertime.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Calculate minutes variables before the modal
const logicSplitRegex = /\/\/ 4\. Initial logic split suggestions([\s\S]*?)Swal\.close\(\);/m;
const logicSplitMatch = content.match(logicSplitRegex);

if (logicSplitMatch) {
  let newLogicSplit = logicSplitMatch[0] + `\n
        // Convert to minutes for display
        const reqMins = Math.round(reqHours * 60);
        const deficitMins = Math.round(deficitHours * 60);
        const defaultCompMins = Math.round(defaultComp * 60);
        const defaultOt125Mins = Math.round(defaultOt125 * 60);
        const defaultOt150Mins = Math.round(defaultOt150 * 60);
`;
  content = content.replace(logicSplitRegex, newLogicSplit);
}

// 2. Update the HTML modal to use minutes
const htmlRegex = /html: `([\s\S]*?)`,/m;
const htmlMatch = content.match(htmlRegex);

if (htmlMatch) {
  let newHtml = htmlMatch[1]
    .replace(/<th>الساعات المطلوبة<\/th>/g, '<th>الوقت المطلوب</th>')
    .replace(/>\$\{reqHours\} ساعة<\/td>/g, '>${reqMins} دقيقة</td>')
    .replace(/<th>إجمالي تأخير\/عجز اليوم<\/th>/g, '<th>تأخير/عجز اليوم</th>')
    .replace(/>\$\{deficitHours\} ساعة<\/td>/g, '>${deficitMins} دقيقة</td>')
    
    .replace(/<label>ساعات التعويض المقاصة/g, '<label>دقائق التعويض المقاصة')
    .replace(/<label>ساعات إضافي عادي/g, '<label>دقائق إضافي عادي')
    .replace(/<label>ساعات إضافي عطل ومناسبات/g, '<label>دقائق إضافي عطل ومناسبات')
    
    .replace(/value="\$\{defaultComp\}" step="0\.25"/g, 'value="${defaultCompMins}" step="1"')
    .replace(/value="\$\{defaultOt125\}" step="0\.25"/g, 'value="${defaultOt125Mins}" step="1"')
    .replace(/value="\$\{defaultOt150\}" step="0\.25"/g, 'value="${defaultOt150Mins}" step="1"');
    
  content = content.replace(htmlMatch[1], newHtml);
}

// 3. Update the preConfirm validation and return values
const preConfirmRegex = /preConfirm: \(\) => \{([\s\S]*?)\} \/\/ end preConfirm/m;
// Actually it's just:
//          preConfirm: () => {
//            const compVal = Number(document.getElementById('ot-comp-hours').value) || 0;
//            ...
//            return { compVal, ot125Val, ot150Val, reasonVal };
//          }

const preConfirmSearch = `          preConfirm: () => {
            const compVal = Number(document.getElementById('ot-comp-hours').value) || 0;
            const ot125Val = Number(document.getElementById('ot-125-hours').value) || 0;
            const ot150Val = Number(document.getElementById('ot-150-hours').value) || 0;
            const reasonVal = document.getElementById('ot-action-reason').value || '';
            
            const totalSplit = compVal + ot125Val + ot150Val;
            if (Math.abs(totalSplit - reqHours) > 0.01) {
              Swal.showValidationMessage(\`يجب أن يكون مجموع الساعات الموزعة (\${totalSplit}) مساوياً لإجمالي ساعات الطلب (\${reqHours})\`);
              return false;
            }

            return { compVal, ot125Val, ot150Val, reasonVal };
          }`;

const preConfirmReplace = `          preConfirm: () => {
            const compMins = Number(document.getElementById('ot-comp-hours').value) || 0;
            const ot125Mins = Number(document.getElementById('ot-125-hours').value) || 0;
            const ot150Mins = Number(document.getElementById('ot-150-hours').value) || 0;
            const reasonVal = document.getElementById('ot-action-reason').value || '';
            
            const totalSplitMins = compMins + ot125Mins + ot150Mins;
            if (totalSplitMins !== reqMins) {
              Swal.showValidationMessage(\`يجب أن يكون مجموع الدقائق الموزعة (\${totalSplitMins}) مساوياً لإجمالي دقائق الطلب (\${reqMins})\`);
              return false;
            }

            // Convert back to hours for saving
            return { 
              compVal: compMins / 60, 
              ot125Val: ot125Mins / 60, 
              ot150Val: ot150Mins / 60, 
              reasonVal 
            };
          }`;

if (content.includes(preConfirmSearch)) {
    content = content.replace(preConfirmSearch, preConfirmReplace);
    console.log('✅ تم تعديل كود preConfirm بنجاح');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ تم حفظ التعديلات على ملف HROvertime.jsx.');
