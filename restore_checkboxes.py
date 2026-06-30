import sys

file_path = 'src/pages/hr/HRSalaryReports.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "{activeReportTab === 'employees' && ("

injection = """{activeReportTab === 'employees' && (
          <>
            <div className="no-print mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">تخصيص أعمدة التقرير:</h3>
              <div className="premium-checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                {Object.keys(employeeReportFields).map(key => {
                  const labelMap = {
                    id: 'الرقم الوظيفي', name: 'اسم الموظف', department: 'القسم الوظيفي', jobTitle: 'المسمى الوظيفي', joinDate: 'تاريخ التعيين', baseSalary: 'الراتب الأساسي', transportation: 'بدل مواصلات', phone: 'رقم الهاتف', directManager: 'المدير المباشر', annualLeaves: 'رصيد الإجازات السنوي', sickLeaves: 'رصيد الإجازات المرضي', socialSecurity: 'الضمان الاجتماعي', workPeriod: 'فترة الدوام', status: 'الحالة'
                  };
                  return (
                    <label key={key} className="premium-checkbox-item" style={{ flexDirection: 'column', justifyContent: 'center', height: '80px', textAlign: 'center', gap: '10px', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', transition: 'all 0.2s', color: '#1e293b' }}>
                      <input 
                        type="checkbox" 
                        checked={employeeReportFields[key]} 
                        onChange={(e) => setEmployeeReportFields(prev => ({ ...prev, [key]: e.target.checked }))} 
                        style={{ width: '18px', height: '18px', accentColor: '#1e293b' }} 
                      />
                      <span style={{ fontSize: '0.8rem', lineHeight: '1.2', fontWeight: '600' }}>{labelMap[key] || key}</span>
                    </label>
                  );
                })}
              </div>
            </div>"""

if "تخصيص أعمدة التقرير:" not in content:
    content = content.replace(target, injection)
    
    # We must also ensure the closing `</div>)}` for employees tab has a closing `</>` since we added `<>`.
    # Let's find the end of employees tab which should be </table></div>)}
    content = content.replace("</table>\n          </div>\n        )}", "</table>\n          </div>\n          </>\n        )}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
