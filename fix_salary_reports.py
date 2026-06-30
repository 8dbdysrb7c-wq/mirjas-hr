import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_print_area = """      {/* Printable Area */}
      <div className="print-area">
        {activeReportTab === 'slip' && selectedEmployeeData && (
          <div className="bg-white p-0 overflow-hidden shadow-2xl border border-slate-100 rounded-3xl max-w-3xl mx-auto printable-card transition-all hover:shadow-[0_20px_50px_rgba(26,141,155,0.15)] print:border-none print:shadow-none print:p-0" style={{ direction: 'rtl', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            
            {/* Header with Gradient */}
            <div className="bg-gradient-to-l from-[#1a8d9b] to-[#126b77] p-8 text-white relative overflow-hidden print:bg-[#1a8d9b] print:text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black mb-3 tracking-tight text-white drop-shadow-md">قسيمة راتب</h1>
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold border border-white/20 shadow-sm">
                    <Calendar size={14} className="text-white"/> {getSelectedMonthLabel()}
                  </div>
                </div>
                <div className="text-left bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-lg">
                  <div className="text-3xl font-black tracking-tighter text-white drop-shadow-lg">Mr Sleep</div>
                  <p className="text-white/90 text-xs mt-1 font-bold tracking-wide uppercase">إدارة الموارد البشرية</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              {/* Employee Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1a8d9b]/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-[#1a8d9b] group-hover:scale-110 transition-transform">
                    <User size={18} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">اسم الموظف</p>
                  <p className="font-black text-slate-800 text-sm truncate" title={selectedEmployeeData.name}>{selectedEmployeeData.name}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1a8d9b]/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-[#1a8d9b] group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">الرقم الوظيفي</p>
                  <p className="font-black text-slate-800 text-sm">{selectedEmployeeData.id}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1a8d9b]/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-[#1a8d9b] group-hover:scale-110 transition-transform">
                    <Briefcase size={18} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">القسم</p>
                  <p className="font-black text-slate-800 text-sm truncate" title={selectedEmployeeData.department}>{selectedEmployeeData.department || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-[#1a8d9b]/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 text-[#1a8d9b] group-hover:scale-110 transition-transform">
                    <Briefcase size={18} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">المسمى الوظيفي</p>
                  <p className="font-black text-slate-800 text-sm truncate" title={selectedEmployeeData.jobTitle}>{selectedEmployeeData.jobTitle || '-'}</p>
                </div>
              </div>
              
              {/* Financial Breakdown */}
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                {/* Earnings */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-5 border-b border-green-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                      <ChevronUp size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-emerald-800">الاستحقاقات</h3>
                      <p className="text-xs text-emerald-600/80 font-medium">تفاصيل المبالغ المضافة</p>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 border-dashed">
                        <span className="text-slate-600 font-bold">الراتب الأساسي</span>
                        <span className="font-black text-slate-800 text-lg">{selectedEmployeeData.basic} <span className="text-sm text-slate-500 font-semibold">د.أ</span></span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 border-dashed">
                        <span className="text-slate-600 font-bold">بدل إضافي <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mr-1">({selectedEmployeeData.totalOvertimeHours} ساعة)</span></span>
                        <span className="font-black text-emerald-600 text-lg">+{selectedEmployeeData.overtimePay} <span className="text-sm font-semibold">د.أ</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-5 mt-auto border-t border-emerald-100/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-800">إجمالي الاستحقاقات</span>
                      <span className="text-2xl font-black text-emerald-700">{selectedEmployeeData.basic + selectedEmployeeData.overtimePay} <span className="text-sm">د.أ</span></span>
                    </div>
                  </div>
                </div>
                
                {/* Deductions */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 p-5 border-b border-red-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-600">
                      <ChevronDown size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-red-800">الاستقطاعات</h3>
                      <p className="text-xs text-red-600/80 font-medium">تفاصيل الخصومات والمخالفات</p>
                    </div>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100 border-dashed">
                        <span className="text-slate-600 font-bold">الخصومات والمخالفات</span>
                        <span className="font-black text-red-600 text-lg">-{selectedEmployeeData.totalDeductions} <span className="text-sm font-semibold">د.أ</span></span>
                      </div>
                      {selectedEmployeeData.violationsList?.length > 0 && (
                        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3 mt-3 shadow-inner">
                          <p className="text-xs font-black text-slate-500 mb-2">تفصيل المخالفات:</p>
                          {selectedEmployeeData.violationsList.map((v, i) => (
                            <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                              <span className="text-slate-700 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 block"></span>
                                {v.type} <span className="text-slate-400 font-medium">({v.date?.split('-')[2]})</span>
                              </span>
                              <span className="font-black text-red-600">{v.deductionAmount} د.أ</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-red-50/50 p-5 mt-auto border-t border-red-100/50">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-800">إجمالي الاستقطاعات</span>
                      <span className="text-2xl font-black text-red-700">{selectedEmployeeData.totalDeductions} <span className="text-sm">د.أ</span></span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Net Salary */}
              <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center mb-12 shadow-2xl shadow-slate-900/20 border border-slate-700 print:bg-slate-800 print:text-white print:border-none print:shadow-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#1a8d9b]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                
                <div className="relative z-10 text-center md:text-right mb-6 md:mb-0">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/5 mb-3">
                    <CheckCircle size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-bold tracking-wider uppercase">الخلاصة المالية</span>
                  </div>
                  <h2 className="text-3xl font-black text-white">صافي الراتب المستحق</h2>
                </div>
                <div className="relative z-10 flex items-center justify-center bg-black/40 px-8 py-5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-inner min-w-[200px]">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 drop-shadow-sm print:text-emerald-400">
                    {selectedEmployeeData.netSalary}
                  </span>
                  <span className="text-2xl font-bold text-emerald-400/80 mr-3">د.أ</span>
                </div>
              </div>
              
              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-10 mt-10 border-t border-slate-200">
                <div className="text-center relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 opacity-5 print:opacity-10 pointer-events-none">
                    <User size={64} className="mx-auto" />
                  </div>
                  <p className="text-slate-500 font-bold mb-16 text-lg">توقيع الموظف المستلم</p>
                  <div className="border-b-2 border-slate-300 border-dashed w-3/4 mx-auto"></div>
                </div>
                <div className="text-center relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 opacity-5 print:opacity-10 pointer-events-none">
                    <Briefcase size={64} className="mx-auto" />
                  </div>
                  <p className="text-slate-500 font-bold mb-16 text-lg">اعتماد الإدارة / المحاسبة</p>
                  <div className="border-b-2 border-slate-300 border-dashed w-3/4 mx-auto"></div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a8d9b]/50"></div>
                <p className="text-xs font-bold tracking-wide">
                  طبع بواسطة نظام <span className="text-[#1a8d9b]">Mr Sleep HR</span> في {new Date().toLocaleDateString('en-GB')}
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a8d9b]/50"></div>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'sheet' && (
          <div className="bg-white p-0 overflow-hidden border border-slate-200 rounded-3xl shadow-2xl printable-card print:border-none print:shadow-none print:p-0" style={{ direction: 'rtl', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {/* Awesome Header */}
            <div className="bg-gradient-to-l from-slate-800 to-slate-900 p-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-700 gap-6 relative overflow-hidden print:bg-slate-800 print:text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#1a8d9b]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1a8d9b] to-[#126b77] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#1a8d9b]/20 border border-white/10">
                  <Briefcase size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white mb-2 tracking-tight">كشف الرواتب المجمع</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-white/10 text-white/90 px-3 py-1 rounded-lg text-sm font-semibold border border-white/5 flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#1a8d9b]"/> {getSelectedMonthLabel()}
                    </span>
                    <span className="bg-[#1a8d9b]/20 text-[#1a8d9b] px-3 py-1 rounded-lg text-sm font-bold border border-[#1a8d9b]/30">
                      {selectedDepartment === 'all' ? 'جميع الأقسام' : departments[selectedDepartment]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left bg-white/5 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-sm relative z-10 shadow-inner">
                <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-lg mb-1">Mr Sleep</h2>
                <p className="text-xs font-semibold text-white/60 tracking-wider">تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full text-sm text-right print:text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                      <th className="py-5 px-5 font-black text-sm w-16 text-center">#</th>
                      <th className="py-5 px-5 font-black text-sm">الموظف</th>
                      <th className="py-5 px-5 font-black text-sm w-32">الأساسي</th>
                      <th className="py-5 px-5 font-black text-sm w-32">إضافي</th>
                      <th className="py-5 px-5 font-black text-sm w-32">خصومات</th>
                      <th className="py-5 px-5 font-black text-sm w-36 text-[#1a8d9b] bg-[#1a8d9b]/5 border-x border-[#1a8d9b]/10">الصافي</th>
                      <th className="py-5 px-5 font-black text-sm text-center w-48">التوقيع بالاستلام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .map((emp, index) => (
                        <tr key={emp.id} className={`hover:bg-slate-50/80 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                          <td className="py-4 px-5 text-slate-400 font-bold text-center">{index + 1}</td>
                          <td className="py-4 px-5 font-bold text-slate-800 group-hover:text-[#1a8d9b] transition-colors">{emp.name}</td>
                          <td className="py-4 px-5 font-semibold text-slate-600">{emp.basic} <span className="text-xs text-slate-400 font-normal">د.أ</span></td>
                          <td className="py-4 px-5 font-bold text-emerald-600 bg-emerald-50/30">+{emp.overtimePay}</td>
                          <td className="py-4 px-5 font-bold text-red-500 bg-red-50/30">-{emp.totalDeductions}</td>
                          <td className="py-4 px-5 font-black text-slate-800 bg-[#1a8d9b]/5 border-x border-[#1a8d9b]/10 text-lg">{emp.netSalary} <span className="text-xs text-[#1a8d9b] font-bold">د.أ</span></td>
                          <td className="py-4 px-5">
                            <div className="border-b-2 border-dashed border-slate-200 w-full mt-4"></div>
                          </td>
                        </tr>
                      ))}
                    
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-[#1a8d9b] to-[#126b77] text-white shadow-lg print:bg-[#1a8d9b] print:text-white">
                      <td colSpan="2" className="py-6 px-5 text-left font-black text-lg">المجموع الكلي للرواتب:</td>
                      <td className="py-6 px-5 font-bold text-white/90 text-lg">
                        {salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.basic, 0)} <span className="text-sm font-normal">د.أ</span>
                      </td>
                      <td className="py-6 px-5 font-black text-emerald-300 text-lg">
                        +{salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.overtimePay, 0)} <span className="text-sm font-normal text-white">د.أ</span>
                      </td>
                      <td className="py-6 px-5 font-black text-red-300 text-lg">
                        -{salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.totalDeductions, 0)} <span className="text-sm font-normal text-white">د.أ</span>
                      </td>
                      <td className="py-6 px-5 font-black text-2xl text-white bg-black/10 shadow-inner border-x border-white/10">
                        {salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.netSalary, 0)} <span className="text-base font-bold text-white/80">د.أ</span>
                      </td>
                      <td className="py-6 px-5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="text-center mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a8d9b]/50"></div>
                <p className="text-xs font-bold tracking-wide">
                  طبع بواسطة نظام <span className="text-[#1a8d9b]">Mr Sleep HR</span> في {new Date().toLocaleDateString('en-GB')}
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a8d9b]/50"></div>
              </div>
            </div>
          </div>
        )}
      </div>"""

new_content = re.sub(r'      \{/\* Printable Area \*/\}.*?      </div>\s*</div>\s*\);\s*};\s*export default HRSalaryReports;', new_print_area + '\n    </div>\n  );\n};\n\nexport default HRSalaryReports;', content, flags=re.DOTALL)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
