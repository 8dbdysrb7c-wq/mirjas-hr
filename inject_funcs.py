import re
file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the broken injection if it exists
broken_injection_start = content.find('const addExecutionStatus = () => {')
if broken_injection_start != -1:
    # Find the end of it
    broken_injection_end = content.find('};', content.find('editExecutionStatus = (idx) => {'))
    if broken_injection_end != -1:
        # find the next }; which is the end of the second function
        broken_injection_end = content.find('};', broken_injection_end + 2) + 2
        content = content[:broken_injection_start] + content[broken_injection_end:]

# Prepare the 4 functions
funcs = """
  const addMissionStatus = () => {
    Swal.fire({
      title: 'إضافة حالة حركة جديدة',
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
        const currentList = settings.missionStatuses || [];
        saveGlobalSettings({ ...settings, missionStatuses: [...currentList, result.value] }).then(() => {
          Swal.fire('تمت الإضافة', '', 'success');
        });
      }
    });
  };

  const editMissionStatus = (idx) => {
    const currentList = settings.missionStatuses || [];
    const item = currentList[idx];
    Swal.fire({
      title: 'تعديل حالة الحركة',
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
        saveGlobalSettings({ ...settings, missionStatuses: newList }).then(() => {
          Swal.fire('تم التعديل', '', 'success');
        });
      }
    });
  };

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

# Find a good place to insert. Right before `const handleSearchLocation = async () => {`
target = 'const handleSearchLocation = async () => {'
idx = content.find(target)
if idx != -1:
    content = content[:idx] + funcs + '\n  ' + content[idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Functions injected successfully.')
