import os

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
store_path = os.path.join(base_dir, "store.js")
admin_settings_path = os.path.join(base_dir, "pages", "admin", "AdminSettings.jsx")

def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update store.js defaultGlobalSettings
store_old = """const defaultGlobalSettings = {
  siteName: "Mirjas HR",
  logoUrl: "/logo-mrsleep.png",
  primaryColor: "#0f172a",
  itemStatuses: ["مخزون", "قيد التشغيل", "مباع", "تالف", "مفقود", "مرتجع"],
  productionStatuses: ["لم يتم التنفيذ", "قيد التنفيذ", "منتهي"],
  salesStatuses: ["جديد", "قيد التجهيز", "تم التوصيل", "ملغي", "مرفوض"],
  salesItemStatuses: ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم", "مرتجع"],
  userTypes: [
    { name: "إدارة", color: "#6366f1", permissions: { canAdd: true, canEdit: true, canDelete: true, isFullAdmin: true } },
    { name: "مشرف قسم", color: "#f59e0b", permissions: { canAdd: true, canEdit: true, canDelete: false, isFullAdmin: false } },
    { name: "موظف عادي", color: "#10b981", permissions: { canAdd: true, canEdit: false, canDelete: false, isFullAdmin: false } }
  ],
  notificationSettings: {}
};"""

store_new = """const defaultGlobalSettings = {
  siteName: "Mirjas HR",
  logoUrl: "/logo-mrsleep.png",
  primaryColor: "#0f172a",
  itemStatuses: ["مخزون", "قيد التشغيل", "مباع", "تالف", "مفقود", "مرتجع"],
  productionStatuses: ["لم يتم التنفيذ", "قيد التنفيذ", "منتهي"],
  salesStatuses: ["جديد", "قيد التجهيز", "تم التوصيل", "ملغي", "مرفوض"],
  salesItemStatuses: ["جديد", "قيد التجهيز", "جاهز للتسليم", "تم التسليم", "مرتجع"],
  userTypes: [
    { name: "إدارة", color: "#6366f1", permissions: { canAdd: true, canEdit: true, canDelete: true, isFullAdmin: true } },
    { name: "مشرف قسم", color: "#f59e0b", permissions: { canAdd: true, canEdit: true, canDelete: false, isFullAdmin: false } },
    { name: "موظف عادي", color: "#10b981", permissions: { canAdd: true, canEdit: false, canDelete: false, isFullAdmin: false } }
  ],
  hrSettings: {
    standardWorkHours: 8,
    gracePeriodMinutes: 15,
    workDaysPerMonth: 30,
    overtimeMultiplier: 1.5,
    fullDayAbsenceDeduction: true
  },
  notificationSettings: {}
};"""

replace_in_file(store_path, [(store_old, store_new)])

# 2. Update AdminSettings.jsx
# Add the HR Tab icon and logic
admin_settings_old_tabs = """        <div className="premium-tabs-container mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            <button 
              className={`premium-tab flex-1 ${activeTab === 'site' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
              onClick={() => setActiveTab('site')}
            >
              <Globe size={18} />
              <span>إعدادات النظام العامة</span>
            </button>
            <button 
              className={`premium-tab flex-1 ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={18} />
              <span>إعدادات الإشعارات</span>
            </button>
          </div>
        </div>"""

admin_settings_new_tabs = """        <div className="premium-tabs-container mb-6 overflow-x-auto">
          <div className="flex min-w-max">
            <button 
              className={`premium-tab flex-1 ${activeTab === 'site' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
              onClick={() => setActiveTab('site')}
            >
              <Globe size={18} />
              <span>إعدادات النظام العامة</span>
            </button>
            <button 
              className={`premium-tab flex-1 ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
              onClick={() => setActiveTab('hr')}
            >
              <Users size={18} />
              <span>الموارد البشرية والرواتب</span>
            </button>
            <button 
              className={`premium-tab flex-1 ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={18} />
              <span>إعدادات الإشعارات</span>
            </button>
          </div>
        </div>"""

# Add state initializer for hrSettings just in case it doesn't exist
admin_settings_old_state = """    jobTitles: [],
    departmentsList: [],
    workShifts: [],
    primaryColor: '#1a8d9b',
    notificationSettings: normalizeNotificationSettings({})
  });"""

admin_settings_new_state = """    jobTitles: [],
    departmentsList: [],
    workShifts: [],
    primaryColor: '#1a8d9b',
    hrSettings: {
      standardWorkHours: 8,
      gracePeriodMinutes: 15,
      workDaysPerMonth: 30,
      overtimeMultiplier: 1.5,
      fullDayAbsenceDeduction: true
    },
    notificationSettings: normalizeNotificationSettings({})
  });"""

# Ensure fetchSettings sets defaults
admin_settings_old_fetch = """      setSettings(data);
      setEmployees(employeeList);"""

admin_settings_new_fetch = """      setSettings({
        ...data,
        hrSettings: data.hrSettings || {
          standardWorkHours: 8,
          gracePeriodMinutes: 15,
          workDaysPerMonth: 30,
          overtimeMultiplier: 1.5,
          fullDayAbsenceDeduction: true
        }
      });
      setEmployees(employeeList);"""

# Add the HR Tab Content before closing tag of `renderContent` or main div
admin_settings_old_content = """        {activeTab === 'site' && (
          <div className="space-y-6">"""

admin_settings_hr_content = """        {activeTab === 'hr' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4">
                <Users className="text-primary" /> إعدادات الرواتب والحضور
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> ساعات العمل الرسمية باليوم</label>
                  <p className="text-xs text-slate-500 mb-2">أي ساعات إضافية عن هذا الرقم ستحسب كعمل إضافي.</p>
                  <input 
                    type="number" 
                    step="0.5"
                    min="1"
                    className="input-field" 
                    value={settings.hrSettings.standardWorkHours} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, standardWorkHours: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> فترة السماح للتأخير (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-2">الدقائق المسموح بها بعد بداية الشفت قبل احتساب تأخير مالي.</p>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={settings.hrSettings.gracePeriodMinutes} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, gracePeriodMinutes: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> عدد أيام العمل في الشهر</label>
                  <p className="text-xs text-slate-500 mb-2">يستخدم لحساب قيمة ساعة العمل للخصومات والمكافآت (غالباً 30).</p>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={settings.hrSettings.workDaysPerMonth} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysPerMonth: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Plus size={16} /> معامل الساعات الإضافية</label>
                  <p className="text-xs text-slate-500 mb-2">قيمة مضاعفة ساعة العمل الإضافي (غالباً 1.5 أو 1.25).</p>
                  <input 
                    type="number" 
                    step="0.05"
                    className="input-field" 
                    value={settings.hrSettings.overtimeMultiplier} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeMultiplier: Number(e.target.value)}})}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <label className="checkbox-group font-bold" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.hrSettings.fullDayAbsenceDeduction}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, fullDayAbsenceDeduction: e.target.checked}})}
                  />
                  <span>خصم يوم كامل تلقائياً عند غياب الموظف (بدون إجازة أو مغادرة معتمدة)</span>
                </label>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">"""

replace_in_file(admin_settings_path, [
    (admin_settings_old_tabs, admin_settings_new_tabs),
    (admin_settings_old_state, admin_settings_new_state),
    (admin_settings_old_fetch, admin_settings_new_fetch),
    (admin_settings_old_content, admin_settings_hr_content)
])

print("HR Settings Injected.")
