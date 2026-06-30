import re

with open('src/pages/admin/AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import saveEmployee and Fingerprint
content = content.replace(
    "saveGlobalSettings,",
    "saveGlobalSettings,\n  saveEmployee,"
)

content = content.replace(
    "import { Settings, Globe, Image as ImageIcon, CheckCircle, ListTodo, Users, Plus, Trash2, Save, Upload, Edit2, Package, Home, Palette, Ruler, Truck, CheckCircle2, Bell, ChevronDown, ChevronUp, Volume2, VolumeX, Briefcase, Building, Clock } from 'lucide-react';",
    "import { Settings, Globe, Image as ImageIcon, CheckCircle, ListTodo, Users, Plus, Trash2, Save, Upload, Edit2, Package, Home, Palette, Ruler, Truck, CheckCircle2, Bell, ChevronDown, ChevronUp, Volume2, VolumeX, Briefcase, Building, Clock, Fingerprint } from 'lucide-react';"
)

# 2. Add the tab button
tab_btn = """        <div className={`premium-tab ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={18} /> <span>إعدادات الإشعارات</span>
        </div>
        <div className={`premium-tab ${activeTab === 'missingpunches' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('missingpunches')}>
          <Fingerprint size={18} /> <span>الختمات الناقصة</span>
        </div>"""
        
content = content.replace("""        <div className={`premium-tab ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={18} /> <span>إعدادات الإشعارات</span>
        </div>""", tab_btn)

# 3. Add the missingpunches section
missing_punches_section = """        {activeTab === 'missingpunches' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Fingerprint size={22} className="text-primary" /> إعدادات الختمات الناقصة</h3>
                <p className="text-sm text-slate-500 mt-1">حدد الحد الأقصى لعدد الختمات الناقصة المسموح بها شهرياً لكل موظف.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-4 font-bold">الرقم الوظيفي</th>
                      <th className="p-4 font-bold">اسم الموظف</th>
                      <th className="p-4 font-bold">المسمى الوظيفي</th>
                      <th className="p-4 font-bold w-48 text-center">الحد الأقصى (شهرياً)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.sort((a,b)=>String(a.name).localeCompare(String(b.name))).map((emp, idx) => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-500 font-medium">{emp.id}</td>
                        <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {(emp.name || '?')[0]}
                          </div>
                          {emp.name}
                        </td>
                        <td className="p-4 text-slate-500">{emp.jobTitle || '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <input 
                              type="number" 
                              min="0" 
                              className="w-24 p-2 text-center border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-lg"
                              value={emp.missingPunchQuota ?? ''}
                              placeholder="غير محدد"
                              onChange={async (e) => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value);
                                const newEmps = [...employees];
                                const index = newEmps.findIndex(x => x.id === emp.id);
                                if (index > -1) {
                                  newEmps[index] = { ...newEmps[index], missingPunchQuota: val };
                                  setEmployees(newEmps);
                                  // Auto save employee quota
                                  await saveEmployee(newEmps[index]);
                                }
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    لا يوجد موظفين حالياً
                  </div>
                )}
              </div>
            </div>
          </div>
        )}"""

content = content.replace("        {activeTab === 'notifications' && (", missing_punches_section + "\n\n        {activeTab === 'notifications' && (")

with open('src/pages/admin/AdminSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
