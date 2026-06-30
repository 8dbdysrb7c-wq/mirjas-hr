import re

file_path = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

users_block = """        {activeTab === 'users' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary" /> إدارة أنواع المستخدمين</h3>
              <button className="btn-premium-add" onClick={addUserType}><span>إضافة نوع جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-xs text-muted">هنا يمكنك تحديد المسميات الوظيفية والألوان التمييزية لكل نوع من الموظفين.</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">النوع</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.userTypes || []).length > 0 ? (
                    (settings.userTypes || []).map((type, idx) => {
                      const name = typeof type === 'string' ? type : (type.name || '');
                      const color = typeof type === 'string' ? settings.primaryColor : (type.color || settings.primaryColor);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                              <span>{name}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editUserType(idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('userTypes', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أنواع مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}"""

jobtitles_block = """        {activeTab === 'jobtitles' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> المسميات الوظيفية</h3>
              <button className="btn-premium-add" onClick={() => addItem('jobTitles')}><span>إضافة مسمى جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف المسميات الوظيفية المتاحة في شركتك لتسهيل تصنيف الموظفين (مثال: مدير مبيعات، محاسب، إلخ).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">المسمى الوظيفي</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.jobTitles || []).length > 0 ? (
                    (settings.jobTitles || []).map((title, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{title}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('jobTitles', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('jobTitles', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد مسميات مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}"""

departments_block = """        {activeTab === 'departments' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Building size={18} className="text-primary" /> الأقسام الوظيفية</h3>
              <button className="btn-premium-add" onClick={() => addItem('departmentsList')}><span>إضافة قسم جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف الأقسام الرئيسية والإدارات في شركتك لتعيين الموظفين فيها (مثال: قسم المبيعات، التسويق، الموارد البشرية).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">القسم</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.departmentsList || []).length > 0 ? (
                    (settings.departmentsList || []).map((dept, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{dept}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('departmentsList', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('departmentsList', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أقسام مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}"""

sectors_block = """        {activeTab === 'sectors' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> قطاعات العمل</h3>
              <button className="btn-premium-add" onClick={() => addItem('customerSectors')}><span>إضافة قطاع جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف قطاعات العمل لعملائك لاستخدامها عند إضافة أو تعديل بيانات العميل.</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">القطاع</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.customerSectors || []).length > 0 ? (
                    (settings.customerSectors || []).map((sector, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{sector}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('customerSectors', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('customerSectors', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد قطاعات مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}"""

workshifts_block = """        {activeTab === 'workshifts' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Clock size={18} className="text-primary" /> أوقات وفترات الدوام</h3>
              <button className="btn-premium-add" onClick={addWorkShift}><span>إضافة فترة جديدة</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف فترات الدوام المختلفة لشركتك لتعيينها للموظفين لتنظيم الحضور والانصراف (مثال: الدوام الصباحي 08:00 - 16:00).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">اسم الفترة</th>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200 text-center">وقت الحضور</th>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200 text-center">وقت الانصراف</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.workShifts || []).length > 0 ? (
                    (settings.workShifts || []).map((shift, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{shift.name}</td>
                        <td className="p-3 font-medium align-middle border border-slate-200 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{shift.startTime}</span>
                        </td>
                        <td className="p-3 font-medium align-middle border border-slate-200 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">{shift.endTime}</span>
                        </td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editWorkShift(idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('workShifts', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد فترات دوام مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}"""

stock_block = """        {activeTab === 'stock' && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Home size={18} className="text-primary" /> المستودعات</h3>
                <button className="btn-premium-add" onClick={() => addItem('warehouses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.warehouses || []).length > 0 ? (
                      (settings.warehouses || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('warehouses', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('warehouses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد مستودعات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> تصنيفات المخزون</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockCategories')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockCategories || []).length > 0 ? (
                      (settings.stockCategories || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockCategories', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockCategories', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد تصنيفات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Palette size={18} className="text-primary" /> الألوان / المواصفات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockColors')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockColors || []).length > 0 ? (
                      (settings.stockColors || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockColors', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockColors', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد ألوان مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Ruler size={18} className="text-primary" /> الوحدات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockUnits')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockUnits || []).length > 0 ? (
                      (settings.stockUnits || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockUnits', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockUnits', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد وحدات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}"""

missions_block = """        {activeTab === 'missions' && (
          <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Truck size={18} className="text-primary" /> أنواع مهام التوصيل</h3>
                <button className="btn-premium-add" onClick={() => addItem('missionTypes')}><span>إضافة نوع</span> <Plus size={16} /></button>
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
                <button className="btn-premium-add" onClick={addMissionStatus}><span>إضافة حالة</span> <Plus size={16} /></button>
              </div>
              <p className="text-muted mb-4 text-sm">هذه الحالات تظهر للموظف لتحديث وضع المهمة الحالي.</p>
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
          </div>
        )}"""

def extract_block_range(content, tab_name):
    # Search for the starting token
    start_token = "{activeTab === '" + tab_name + "' && ("
    start_idx = content.find(start_token)
    if start_idx == -1:
        return -1, -1
    
    # Simple bracket matching
    open_count = 0
    in_block = False
    end_idx = -1
    
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            open_count += 1
            in_block = True
        elif content[i] == '}':
            open_count -= 1
            if in_block and open_count == 0:
                end_idx = i + 1
                break
                
    return start_idx, end_idx

def replace_block(content, tab_name, new_block):
    start_idx, end_idx = extract_block_range(content, tab_name)
    if start_idx != -1 and end_idx != -1:
        # Find the line indentation
        line_start = content.rfind('\\n', 0, start_idx)
        if line_start != -1:
            indent = content[line_start+1:start_idx]
            # Optionally format the new_block with the right indentation, but the hardcoded strings are already indented
        return content[:start_idx] + new_block.strip() + content[end_idx:]
    else:
        print(f"Warning: Could not find block for {tab_name}")
        return content

content = replace_block(content, 'users', users_block)
content = replace_block(content, 'jobtitles', jobtitles_block)
content = replace_block(content, 'departments', departments_block)
content = replace_block(content, 'sectors', sectors_block)
content = replace_block(content, 'workshifts', workshifts_block)
content = replace_block(content, 'stock', stock_block)
content = replace_block(content, 'missions', missions_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated tabs")
