import re

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

missions_block_new = """        {activeTab === 'missions' && (
          <div className="grid grid-cols-2 gap-8">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Truck size={18} className="text-primary" /> أنواع مهام التوصيل</h3>
                <button className="btn-premium-add" onClick={() => addItem('missionTypes')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">النوع</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.missionTypes || []).length > 0 ? (
                      (settings.missionTypes || []).map((type, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{type}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('missionTypes', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionTypes', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أنواع مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-primary" /> حالات الحركة</h3>
                <button className="btn-premium-add" onClick={addMissionStatus}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.missionStatuses || []).length > 0 ? (
                      (settings.missionStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                              <span>{status.name}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editMissionStatus(idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Truck size={18} className="text-primary" /> أنواع مهام التوصيل</h3>
                <button className="btn-premium-add" onClick={() => addItem('deliveryTypes')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">النوع</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.deliveryTypes || []).length > 0 ? (
                      (settings.deliveryTypes || []).map((type, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{type}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('deliveryTypes', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('deliveryTypes', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أنواع مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-primary" /> حالات الحركة (أثناء التنفيذ)</h3>
                <button className="btn-premium-add" onClick={addExecutionStatus}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.executionStatuses || []).length > 0 ? (
                      (settings.executionStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                              <span>{status.name}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editExecutionStatus(idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('executionStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}"""

# Replace the current missions block with the new 4-square grid.
# Find start of missions block
start_idx = content.find("{activeTab === 'missions' && (")
if start_idx != -1:
    # Find the next tab which is the end of the return statement or another tab?
    # Actually missions is the last tab. It ends right before `</div>` and `</div>` of the main container.
    # Let's find the end.
    end_idx = content.find("</div>\n        </div>\n      </div>\n    </div>\n  );\n};", start_idx)
    if end_idx == -1:
        # Fallback
        end_idx = content.rfind("</div>", start_idx, len(content)-20)
        # Actually, let's just use regex or extract the block correctly
        # `activeTab === 'missions'` starts at start_idx.
        
def get_closing_brace_index(s, start):
    count = 0
    i = start
    while i < len(s):
        if s[i] == '{': count += 1
        elif s[i] == '}':
            count -= 1
            if count == 0: return i
        i += 1
    return -1

if start_idx != -1:
    end_idx = get_closing_brace_index(content, start_idx)
    if end_idx != -1:
        # Replace the entire block
        content = content[:start_idx] + missions_block_new + content[end_idx+1:]

# Now we need to add `addExecutionStatus` and `editExecutionStatus` functions
# They are identical to `addMissionStatus` and `editMissionStatus`
if "const addExecutionStatus = () => {" not in content:
    func_template = """
  const addExecutionStatus = () => {
    Swal.fire({
      title: 'إضافة حالة تنفيذ جديدة',
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="اسم الحالة (مثال: جاري التنفيذ)">
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
    # Insert before the return statement of AdminSettings
    return_idx = content.find("return (")
    if return_idx != -1:
        content = content[:return_idx] + func_template + content[return_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated 4 missions blocks successfully.")
