import re

file_path = 'src/pages/hr/HRSalaryReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add SweetAlert imports if not present
if "import Swal from 'sweetalert2';" not in content:
    content = content.replace("import html2pdf from 'html2pdf.js';", "import html2pdf from 'html2pdf.js';\nimport Swal from 'sweetalert2';\nimport withReactContent from 'sweetalert2-react-content';\n\nconst MySwal = withReactContent(Swal);")

# 2. Replace handlePrint and handleExport logic
new_functions = '''  const executeExport = (format) => {
    const reportTitle = "تقرير الموارد البشرية";
    if (format === 'print') {
      window.print();
      return;
    }
    if (format === 'pdf') {
      const printableElement = document.querySelector('.printable-card');
      if (!printableElement) return;
      const element = document.createElement('div');
      element.innerHTML = printableElement.innerHTML;
      element.style.direction = 'rtl';
      element.style.padding = '20px';
      
      const opt = {
        margin:       [15, 10, 15, 10],
        filename:     `${reportTitle}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };
      html2pdf().set(opt).from(element).save();
    } else {
      const printableElement = document.querySelector('.printable-card table');
      if (!printableElement) return;
      const tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:${format === 'excel' ? 'excel' : 'word'}">
        <head>
          <meta charset="utf-8">
        </head>
        <body style="direction: rtl; text-align: right; font-family: 'Arial';">
          <h2 style="text-align: center;">${reportTitle}</h2>
          <table border="1" style="border-collapse: collapse; width: 100%;">
            ${printableElement.innerHTML}
          </table>
        </body>
      </html>`;
      
      const blob = new Blob([tableHtml], { type: format === 'excel' ? 'application/vnd.ms-excel' : 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle}.${format === 'excel' ? 'xls' : 'doc'}`;
      a.click();
    }
  };

  const openPrintConfig = (format) => {
    const printArea = document.querySelector('.printable-card');
    if (!printArea) return;
    const table = printArea.querySelector('table');

    // If it's a slip or there's no table, just export immediately (no columns to customize)
    if (!table || activeReportTab === 'slip') {
      executeExport(format);
      return;
    }

    // Extract headers
    const headers = Array.from(table.querySelectorAll('thead th')).map((th, index) => ({
      index,
      text: th.innerText.trim()
    })).filter(h => h.text !== '' && h.text !== 'الإجراءات'); // Exclude empty or action columns

    // Create SweetAlert HTML
    const checkboxesHtml = headers.map(h => `
      <label class="premium-checkbox-item" style="flex-direction: column; justify-content: center; height: 80px; text-align: center; gap: 10px; display: flex; align-items: center; cursor: pointer; padding: 8px 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; color: #1e293b;">
        <input type="checkbox" id="col-check-${h.index}" value="${h.index}" checked style="width: 18px; height: 18px; accent-color: #1e293b;" />
        <span style="font-size: 0.8rem; line-height: 1.2;">${h.text}</span>
      </label>
    `).join('');

    MySwal.fire({
      title: 'تخصيص أعمدة التقرير',
      html: `
        <div class="premium-checkbox-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; max-height: 400px; overflow-y: visible; padding: 12px; background: transparent; border: none; overflow-x: hidden;">
          ${checkboxesHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: format === 'print' ? 'طباعة التقرير' : 'تصدير التقرير',
      cancelButtonText: 'إلغاء',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-outline'
      },
      width: '800px'
    }).then((result) => {
      if (result.isConfirmed) {
        // Find unchecked indices
        const uncheckedIndices = headers
          .filter(h => !document.getElementById(`col-check-${h.index}`).checked)
          .map(h => h.index);

        // Hide columns temporarily
        const allRows = table.querySelectorAll('tr');
        const hiddenCells = [];

        allRows.forEach(row => {
          const cells = row.children;
          uncheckedIndices.forEach(idx => {
            if (cells[idx]) {
              hiddenCells.push({ cell: cells[idx], origDisplay: cells[idx].style.display });
              cells[idx].style.display = 'none';
            }
          });
        });

        // Execute Export
        setTimeout(() => {
          executeExport(format);

          // Restore hidden columns
          setTimeout(() => {
            hiddenCells.forEach(item => {
              item.cell.style.display = item.origDisplay;
            });
          }, 500);
        }, 100);
      }
    });
  };'''

pattern_func = r'  const handlePrint = \(\) => \{.*?\n    \}\n  \};\n'
content = re.sub(pattern_func, new_functions, content, flags=re.DOTALL)

# 3. Replace the button onClick handlers from `handleExport('pdf')` to `openPrintConfig('pdf')` and `handlePrint` to `openPrintConfig('print')`
content = content.replace("onClick={() => handleExport('pdf')}", "onClick={() => openPrintConfig('pdf')}")
content = content.replace("onClick={() => handleExport('excel')}", "onClick={() => openPrintConfig('excel')}")
content = content.replace("onClick={() => handleExport('word')}", "onClick={() => openPrintConfig('word')}")
content = content.replace("onClick={handlePrint}", "onClick={() => openPrintConfig('print')}")

# 4. Remove the hardcoded column customization grid from the employees tab render
# The grid starts with `<div className="no-print mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">` and ends before `<div>` containing the Header Title.
pattern_ui = r'<div className="no-print mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">\s*<h3 className="font-bold text-slate-700 mb-3 text-sm">تخصيص أعمدة التقرير:</h3>\s*<div className="premium-checkbox-grid".*?</div>\s*</div>'
content = re.sub(pattern_ui, '', content, flags=re.DOTALL)

# Also ensure `employeeReportFields` state sets everything to true since they are controlled by the modal now.
content = content.replace("checked={employeeReportFields[key]}", "checked={true}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
