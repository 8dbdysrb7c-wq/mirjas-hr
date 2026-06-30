import re
file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

funcs = """
  const addExecutionStatus = () => {
    Swal.fire({
      title: 'إضافة حالة تنفيذ جديدة',
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="اسم الحالة">
        <div class="mt-4 flex items-center justify-center gap-4">
          <label class="text-sm font-medium text-slate-700">لون الحالة:</label>
          <input type="color" id="swal-input2" class="w-12 h-10 cursor-pointer rounded border border-slate-300" value="#3b82f6">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-input1').value;
        const color = document.getElementById('swal-input2').value;
        if (!name) Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const currentList = settings.executionStatuses || [];
        saveGlobalSettings({ ...settings, executionStatuses: [...currentList, result.value] }).then(() => {
          Swal.fire('تمت الإضافة', '', 'success');
        });
      }
    });
  };

  const editExecutionStatus = (idx) => {
    const currentList = settings.executionStatuses || [];
    const item = currentList[idx];
    Swal.fire({
      title: 'تعديل حالة التنفيذ',
      html: `
        <input id="swal-input1" class="swal2-input" value="${item.name || item}">
        <div class="mt-4 flex items-center justify-center gap-4">
          <label class="text-sm font-medium text-slate-700">لون الحالة:</label>
          <input type="color" id="swal-input2" class="w-12 h-10 cursor-pointer rounded border border-slate-300" value="${item.color || '#3b82f6'}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-input1').value;
        const color = document.getElementById('swal-input2').value;
        if (!name) Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...currentList];
        newList[idx] = result.value;
        saveGlobalSettings({ ...settings, executionStatuses: newList }).then(() => {
          Swal.fire('تم التعديل', '', 'success');
        });
      }
    });
  };
"""

idx = content.find('if (loading) return <div')
if idx != -1:
    content = content[:idx] + funcs + '\n  ' + content[idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Execution status functions injected successfully.')
