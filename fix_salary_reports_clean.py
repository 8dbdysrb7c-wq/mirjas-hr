import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_return = """  return (
    <div className="glass-card flex flex-col min-h-[500px]" style={{ padding: '24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
      
      {/* Header & Controls (Hidden in Print) */}
      <div className="no-print mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
              <FileText color="#1a8d9b" size={22} /> تقارير الرواتب
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>إصدار قسائم وكشوفات الرواتب الرسمية</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="month-picker-container" style={{ position: 'relative' }}>
              <div 
                onClick={() => {
                  const [year] = selectedMonth.split('-');
                  setPickerYear(parseInt(year));
                  setIsMonthDropdownOpen(!isMonthDropdownOpen);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', color: '#334155', fontWeight: 'bold' }}
              >
                <Calendar size={18} color="#1a8d9b" />
                <span style={{ minWidth: '90px', textAlign: 'center' }}>{getSelectedMonthLabel()}</span>
                <ChevronDown size={16} color="#94a3b8" style={{ transform: isMonthDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isMonthDropdownOpen && (
                <div className="month-picker-popup"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: '0',
                    width: '280px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    zIndex: 99999,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }} disabled={pickerYear >= currentYear} style={{ padding: '4px', color: pickerYear >= currentYear ? '#cbd5e1' : '#64748b', cursor: pickerYear >= currentYear ? 'not-allowed' : 'pointer', background: 'none', border: 'none' }}><ChevronUp size={20} /></button>
                    <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#1e293b' }}>{pickerYear}</span>
                    <button onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }} style={{ padding: '4px', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none' }}><ChevronDown size={20} /></button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '16px' }}>
                    {arabicMonths.map((m, index) => {
                      const monthVal = `${pickerYear}-${(index + 1).toString().padStart(2, '0')}`;
                      const isSelected = selectedMonth === monthVal;
                      const isCurrentMonth = currentYear === pickerYear && currentMonth === (index + 1);
                      const isFutureMonth = pickerYear > currentYear || (pickerYear === currentYear && (index + 1) > currentMonth);
                      
                      return (
                        <button
                          key={monthVal}
                          disabled={isFutureMonth}
                          onClick={() => { setSelectedMonth(monthVal); setIsMonthDropdownOpen(false); }}
                          style={{
                            padding: '10px 4px',
                            borderRadius: '10px',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            border: '1px solid',
                            borderColor: isCurrentMonth && !isSelected ? 'rgba(26, 141, 155, 0.2)' : 'transparent',
                            backgroundColor: isSelected ? '#1a8d9b' : isCurrentMonth ? 'rgba(26, 141, 155, 0.05)' : 'transparent',
                            color: isFutureMonth ? '#cbd5e1' : isSelected ? '#ffffff' : isCurrentMonth ? '#1a8d9b' : '#475569',
                            cursor: isFutureMonth ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', color: 'white', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Printer size={18} /> طباعة التقرير
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: '#f8fafc', padding: '6px', borderRadius: '14px', width: 'max-content', border: '1px solid #f1f5f9' }}>
          <button 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.875rem', transition: 'all 0.2s', background: activeReportTab === 'slip' ? 'white' : 'transparent', color: activeReportTab === 'slip' ? '#1a8d9b' : '#64748b', boxShadow: activeReportTab === 'slip' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setActiveReportTab('slip')}
          >
            <User size={18} /> قسيمة راتب الموظف
          </button>
          <button 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.875rem', transition: 'all 0.2s', background: activeReportTab === 'sheet' ? 'white' : 'transparent', color: activeReportTab === 'sheet' ? '#1a8d9b' : '#64748b', boxShadow: activeReportTab === 'sheet' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setActiveReportTab('sheet')}
          >
            <Briefcase size={18} /> كشف الرواتب المجمع
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeReportTab === 'slip' ? (
            <>
              <Search color="#94a3b8" size={20} />
              <select 
                value={selectedEmployeeId} 
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {employees.sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <Filter color="#94a3b8" size={20} />
              <select 
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: '#1e293b', fontWeight: 'bold', cursor: 'pointer' }}
              >
                <option value="all">جميع الأقسام</option>
                {Object.entries(departments).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className="print-area">
        {activeReportTab === 'slip' && selectedEmployeeData && (
          <div className="bg-white printable-card print-no-border" style={{ 
            direction: 'rtl', 
            maxWidth: '800px', 
            margin: '0 auto', 
            padding: '40px',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            WebkitPrintColorAdjust: 'exact', 
            printColorAdjust: 'exact' 
          }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #cbd5e1', paddingBottom: '24px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0' }}>قسيمة راتب</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
                  <Calendar size={16} /> {getSelectedMonthLabel()}
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>Mr Sleep</h2>
                <p style={{ color: '#64748b', fontSize: '0.75rem' }}>إدارة الموارد البشرية</p>
              </div>
            </div>
            
            {/* Employee Info Cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
              {[
                { label: 'اسم الموظف', value: selectedEmployeeData.name },
                { label: 'الرقم الوظيفي', value: selectedEmployeeData.id },
                { label: 'القسم', value: selectedEmployeeData.department || '-' },
                { label: 'المسمى الوظيفي', value: selectedEmployeeData.jobTitle || '-' }
              ].map((item, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>{item.label}</p>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>{item.value}</p>
                </div>
              ))}
            </div>
            
            {/* Financial Breakdown */}
            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
              
              {/* Earnings */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
                  الاستحقاقات
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: '0.875rem' }}>الراتب الأساسي</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedEmployeeData.basic} د.أ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: '0.875rem' }}>بدل إضافي <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({selectedEmployeeData.totalOvertimeHours} ساعة)</span></span>
                  <span style={{ fontWeight: 'bold', color: '#059669' }}>{selectedEmployeeData.overtimePay} د.أ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>إجمالي الاستحقاقات</span>
                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedEmployeeData.basic + selectedEmployeeData.overtimePay} د.أ</span>
                </div>
              </div>
              
              {/* Deductions */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
                  الاستقطاعات
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569', fontSize: '0.875rem' }}>الخصومات والمخالفات</span>
                  <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{selectedEmployeeData.totalDeductions} د.أ</span>
                </div>
                {selectedEmployeeData.violationsList?.length > 0 && (
                  <div style={{ padding: '8px 0', fontSize: '0.75rem' }}>
                    {selectedEmployeeData.violationsList.map((v, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '4px', paddingLeft: '8px' }}>
                        <span>- {v.type} ({v.date?.split('-')[2]})</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.875rem' }}>إجمالي الاستقطاعات</span>
                  <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{selectedEmployeeData.totalDeductions} د.أ</span>
                </div>
              </div>
            </div>
            
            {/* Net Salary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#0f172a' }}>صافي الراتب المستحق</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a8d9b', lineHeight: 1 }}>
                  {selectedEmployeeData.netSalary}
                </span>
                <span style={{ fontSize: '1rem', color: '#1a8d9b' }}>د.أ</span>
              </div>
            </div>
            
            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '32px', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '48px' }}>توقيع الموظف المستلم</p>
                <div style={{ borderBottom: '1px solid #cbd5e1' }}></div>
              </div>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '48px' }}>اعتماد الإدارة / المحاسبة</p>
                <div style={{ borderBottom: '1px solid #cbd5e1' }}></div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', fontSize: '0.75rem' }}>
              طبع في: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        )}

        {activeReportTab === 'sheet' && (
          <div className="bg-white printable-card print-no-border" style={{ 
            direction: 'rtl',
            padding: '40px',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            WebkitPrintColorAdjust: 'exact', 
            printColorAdjust: 'exact' 
          }}>
            {/* Awesome Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #cbd5e1', paddingBottom: '20px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>كشف الرواتب المجمع</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {getSelectedMonthLabel()}</span>
                  <span>|</span>
                  <span style={{ color: '#1a8d9b' }}>{selectedDepartment === 'all' ? 'جميع الأقسام' : departments[selectedDepartment]}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>Mr Sleep</h2>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', color: '#475569', width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px', color: '#475569' }}>الموظف</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px' }}>الأساسي</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px' }}>إضافي</th>
                  <th style={{ padding: '12px', color: '#475569', width: '100px' }}>خصومات</th>
                  <th style={{ padding: '12px', color: '#1a8d9b', width: '120px' }}>الصافي</th>
                  <th style={{ padding: '12px', color: '#475569', width: '180px', textAlign: 'center' }}>التوقيع بالاستلام</th>
                </tr>
              </thead>
              <tbody>
                {salaryData
                  .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                  .map((emp, index) => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{emp.name}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{emp.basic}</td>
                      <td style={{ padding: '12px', color: '#059669' }}>{emp.overtimePay}</td>
                      <td style={{ padding: '12px', color: '#e11d48' }}>{emp.totalDeductions}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0f172a' }}>{emp.netSalary}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ borderBottom: '1px solid #cbd5e1', width: '100%', marginTop: '12px' }}></div>
                      </td>
                    </tr>
                  ))}
                
                {/* Totals Row */}
                <tr style={{ background: '#f8fafc', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <td colSpan="2" style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a' }}>المجموع الكلي:</td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a' }}>
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .reduce((sum, e) => sum + e.basic, 0)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#059669' }}>
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .reduce((sum, e) => sum + e.overtimePay, 0)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#e11d48' }}>
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .reduce((sum, e) => sum + e.totalDeductions, 0)}
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 'bold', color: '#0f172a' }}>
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .reduce((sum, e) => sum + e.netSalary, 0)} د.أ
                  </td>
                  <td style={{ padding: '16px 12px' }}></td>
                </tr>
              </tbody>
            </table>
            
            <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', fontSize: '0.75rem' }}>
              طبع في: {new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
"""

pattern = re.compile(r'  return \(\s*<div.*?</div>\s*\);\s*};', re.DOTALL)
new_content = pattern.sub(new_return + '\n};', content)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
