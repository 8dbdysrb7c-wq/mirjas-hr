import re

filepath = 'c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "        {activeTab === 'hr' && ("
end_marker = "        {activeTab === 'site' && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find HR settings section markers!")
    exit(1)

new_hr_section = """        {activeTab === 'hr' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. قسم الرواتب والحضور الأساسي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-slate-800">
                <Users className="text-primary" /> إعدادات الرواتب والحضور
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> بداية دورة الرواتب (اليوم)</label>
                  <p className="text-xs text-slate-500 mb-2">لتحديد بداية ونهاية الشهر المالي (مثال: 1 يعني من 1 إلى 30).</p>
                  <input 
                    type="number" min="1" max="28" className="input-field" 
                    value={settings.hrSettings.salaryCycleStartDay || 1} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, salaryCycleStartDay: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> آلية احتساب أيام العمل بالشهر</label>
                  <p className="text-xs text-slate-500 mb-2">يستخدم لحساب قيمة يوم وساعة العمل للموظف عند الخصم.</p>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.workDaysStrategy || 'fixed'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysStrategy: e.target.value}})}
                  >
                    <option value="fixed">عدد ثابت لجميع الأشهر (مثال: 30 يوم)</option>
                    <option value="actual">أيام الشهر الفعلية (28, 30, 31)</option>
                  </select>
                  
                  {(!settings.hrSettings.workDaysStrategy || settings.hrSettings.workDaysStrategy === 'fixed') && (
                    <div className="mt-3">
                      <label className="text-sm font-bold mb-1 block">أيام العمل المعتمدة:</label>
                      <input 
                        type="number" min="1" max="31" className="input-field" 
                        value={settings.hrSettings.workDaysPerMonth || 30} 
                        onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysPerMonth: Number(e.target.value)}})}
                      />
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> ساعات العمل الافتراضية</label>
                  <p className="text-xs text-slate-500 mb-2">تستخدم فقط للعمليات الحسابية إذا لم يتم تحديد شفت للموظف.</p>
                  <input 
                    type="number" step="0.5" min="1" className="input-field" 
                    value={settings.hrSettings.standardWorkHours || 8} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, standardWorkHours: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group flex flex-col justify-center">
                  <label className="font-bold flex items-center gap-2 cursor-pointer mt-4">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.salaryApprovalRequired !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, salaryApprovalRequired: e.target.checked}})}
                     />
                     إعتماد الراتب الشهري يدوي وقفل السجلات آلياً
                  </label>
                  <p className="text-xs text-slate-500 mr-6 mt-1">يتطلب مراجعة واعتماد الإدارة قبل الإغلاق لمنع التعديل بأثر رجعي.</p>
                </div>

              </div>
            </div>

            {/* 2. قسم التأخير والمغادرات */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-rose-600">
                <MinusCircle size={20} className="text-rose-500" /> إعدادات التأخير والمغادرات
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="input-group">
                  <label className="font-bold">فترة السماح للتأخير الصباحي (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-1">دقائق مسموحة يومياً لا تحسب كتأخير.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.gracePeriodMinutes || 0} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, gracePeriodMinutes: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold">رصيد المغادرات والتأخير الشهري المسموح (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-1">الرصيد المتاح قبل أن يبدأ النظام بخصم المبالغ المالية.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.monthlyMissionBalanceMinutes || 0} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, monthlyMissionBalanceMinutes: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold">طريقة احتساب التأخير / المغادرات</label>
                  <p className="text-xs text-slate-500 mb-1">آلية التعامل بعد استنفاذ الرصيد الشهري.</p>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.latenessHandling || 'deduct_from_balance'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, latenessHandling: e.target.value}})}
                  >
                    <option value="deduct_from_balance">خصم من الرصيد الشهري أولاً (ثم مالي)</option>
                    <option value="financial_deduction">خصم مالي مباشر (بدون رصيد)</option>
                    <option value="warning_only">تنبيه فقط (لا يوجد خصم مالي)</option>
                  </select>
                </div>
                
              </div>
            </div>

            {/* 3. قسم العمل الإضافي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-emerald-600">
                <PlusCircle size={20} className="text-emerald-500" /> إعدادات العمل الإضافي
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="input-group">
                  <label className="font-bold">هل يتطلب العمل الإضافي موافقة مسبقة؟</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.overtimeRequiresApproval !== false ? 'yes' : 'no'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeRequiresApproval: e.target.value === 'yes'}})}
                  >
                    <option value="yes">نعم، يعتمد الإضافي فقط عبر (طلب عمل إضافي)</option>
                    <option value="no">لا، يتم احتسابه تلقائياً من البصمة (لا ينصح به)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="font-bold">آلية احتساب بدل الإضافي</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.overtimeCalculationMethod || 'hourly_rate'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeCalculationMethod: e.target.value}})}
                  >
                    <option value="hourly_rate">حسب قيمة ساعة الموظف (متغير)</option>
                    <option value="fixed_amount">مبلغ ثابت لكل طلب / يوم</option>
                  </select>
                </div>
              </div>

              {settings.hrSettings.overtimeCalculationMethod === 'fixed_amount' && (
                <div className="input-group w-1/2">
                  <label className="font-bold">قيمة المبلغ الثابت (د.أ)</label>
                  <input 
                    type="number" step="0.5" min="0" className="input-field" 
                    value={settings.hrSettings.overtimeFixedAmount || 10} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeFixedAmount: Number(e.target.value)}})}
                  />
                </div>
              )}

              <div className="input-group mt-4">
                <label className="font-bold">الحد الأقصى للساعات الإضافية اليومية</label>
                <p className="text-xs text-slate-500 mb-2">لمنع إدخال ساعات إضافية مبالغ فيها بالخطأ.</p>
                <input 
                  type="number" step="0.5" min="0" max="24" className="input-field md:w-1/2" 
                  value={settings.hrSettings.maxDailyOvertimeHours || 6} 
                  onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, maxDailyOvertimeHours: Number(e.target.value)}})}
                />
              </div>
            </div>

            {/* 3.5 قسم الضمان الاجتماعي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-blue-600">
                <Shield size={20} className="text-blue-500" /> إعدادات الضمان الاجتماعي
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="input-group">
                  <label className="font-bold text-slate-800">نسبة اقتطاع الموظف (%)</label>
                  <p className="text-xs text-slate-500 mb-2">تخصم من راتب الموظف الخاضع للضمان.</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityEmployeePercentage ?? 7.5} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityEmployeePercentage: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">نسبة مساهمة الشركة (%)</label>
                  <p className="text-xs text-slate-500 mb-2">تظهر في التقارير ولا تؤثر على صافي راتب الموظف.</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityCompanyPercentage ?? 14.25} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityCompanyPercentage: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">إضافة المهن الخطرة للشركة (%)</label>
                  <p className="text-xs text-slate-500 mb-2">نسبة إضافية تدفعها الشركة للموظفين في مهن خطرة (مثال: 1%).</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityHazardousPercentage ?? 1} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityHazardousPercentage: Number(e.target.value)}})}
                  />
                </div>
              </div>
            </div>

            {/* 3.6 إعدادات السلف */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-orange-600">
                <DollarSign size={20} className="text-orange-500" /> إعدادات السلف (المبالغ المقطوعة)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.allowAdvances !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, allowAdvances: e.target.checked}})}
                     />
                     تفعيل نظام السلف للموظفين
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">في حال التعطيل، لن يتمكن الموظفون من طلب سلف من النظام.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">الحد الأقصى المسموح للسلفة (كنسبة من الراتب الأساسي %)</label>
                  <p className="text-xs text-slate-500 mb-2">النظام لن يسمح بتقديم سلفة تتجاوز هذه النسبة (مثال: 50%).</p>
                  <input 
                    type="number" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.maxAdvancePercentage ?? 50} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, maxAdvancePercentage: Number(e.target.value)}})}
                  />
                </div>
              </div>
            </div>

            {/* 4. السياسة الافتراضية للعطل الرسمية */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-purple-600">
                <Calendar size={20} className="text-purple-500" /> السياسة الافتراضية للعطل الرسمية والغياب
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.isPaid !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), isPaid: e.target.checked}}})}
                     />
                     تعتبر العطلة يوم دوام مدفوع الأجر
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">إذا لم يحضر الموظف في العطلة، فلن يتم خصم راتبه.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.exemptFromPunch !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), exemptFromPunch: e.target.checked}}})}
                     />
                     إعفاء الموظف من الختم في العطل
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">لن يتم تسجيل ختمة ناقصة للموظف أيام العطل.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.affectsMonthlyWorkDays === true}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), affectsMonthlyWorkDays: e.target.checked}}})}
                     />
                     تؤثر العطلة على عدد أيام العمل الشهرية
                  </label>
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">حضور الموظف في العطلة يستحق:</label>
                  <select 
                    className="input-field mt-1"
                    value={settings.hrSettings.holidayDefaults?.attendanceCompensation || 'alternative_day_and_overtime'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), attendanceCompensation: e.target.value}}})}
                  >
                    <option value="none">لا شيء</option>
                    <option value="alternative_day">يوم بديل (يضاف لرصيد الإجازات)</option>
                    <option value="overtime_1_25">أجر إضافي فقط (الساعة بساعة وربع 1.25)</option>
                    <option value="overtime_1_5">أجر إضافي فقط (الساعة بساعة ونصف 1.5)</option>
                    <option value="alternative_day_and_overtime_1_25">يوم بديل + أجر إضافي (الساعة بساعة وربع 1.25)</option>
                    <option value="alternative_day_and_overtime_1_5">يوم بديل + أجر إضافي (الساعة بساعة ونصف 1.5)</option>
                  </select>
                </div>
                
                <div className="input-group md:col-span-2">
                  <label className="font-bold">طريقة احتساب الغياب الكامل (بدون عذر)</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.absenceHandling || 'full_day'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, absenceHandling: e.target.value}})}
                  >
                    <option value="full_day">خصم يوم كامل</option>
                    <option value="work_hours">خصم حسب ساعات العمل</option>
                    <option value="needs_approval">يحتاج موافقة / إجراء يدوي من الإدارة</option>
                  </select>
                </div>

              </div>
            </div>

          </div>
        )}

"""

new_content = content[:start_idx] + new_hr_section + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated HR settings UI in AdminSettings.jsx")
