import re
file_path = r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{activeTab === \'statuses\' && (')
if start_idx != -1:
    end_idx = content.find('{activeTab === \'users\' && (')
    block = content[start_idx:end_idx]
    
    # We want to insert the new table before the last `</div>` of the grid.
    # The block ends with:
    #             </div>
    #           </div>
    #         )}
    
    table_html = """
            {/* حالات حركة التوصيل */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-primary" /> حالات حركة التوصيل</h3>
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
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color || '#ccc' }}></div>
                               <span>{status.name || status}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionStatuses', idx)}><Trash2 size={16} /></button>
                              <button className="icon-btn icon-btn-edit" onClick={() => editMissionStatus(idx)}><Edit2 size={16} /></button>
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
"""

    # Insert table_html before the closing div of the grid
    # The grid is: <div className="grid grid-cols-2 gap-8">
    # We find the last `</div>\n          </div>\n        )}`
    
    insert_pos = block.rfind('</div>\n          </div>\n        )}')
    if insert_pos == -1:
        # fallback
        insert_pos = block.rfind('</div>\n        )}')
        
    if insert_pos != -1:
        new_block = block[:insert_pos] + table_html + block[insert_pos:]
        content = content[:start_idx] + new_block + content[end_idx:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Successfully injected Delivery Movement Statuses table into Statuses tab.')
    else:
        print('Could not find injection point.')
else:
    print('Statuses tab not found.')
