import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_print_area = """      {/* Printable Area */}
      <div className="print-area">
        {activeReportTab === 'slip' && selectedEmployeeData && (
          <div className="bg-white printable-card print-no-border" style={{ 
            direction: 'rtl', 
            maxWidth: '800px', 
            margin: '0 auto', 
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(26,141,155,0.15)',
            overflow: 'hidden',
            WebkitPrintColorAdjust: 'exact', 
            printColorAdjust: 'exact' 
          }}>
            
            {/* Header with Gradient */}
            <div style={{
              background: 'linear-gradient(to left, #1a8d9b, #126b77)',
              padding: '2rem',
              color: 'white',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '12px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>قسيمة راتب</h1>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', padding: '6px 16px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <Calendar size={14} color="white" /> {getSelectedMonthLabel()}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <div style={{ fontSize: '1.875rem', fontWeight: '900', textShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Mr Sleep</div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold', letterSpacing: '1px' }}>إدارة الموارد البشرية</p>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {/* Employee Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#1a8d9b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <User size={18} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>اسم الموظف</p>
                  <p style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.875rem' }}>{selectedEmployeeData.name}</p>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#1a8d9b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <FileText size={18} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>الرقم الوظيفي</p>
                  <p style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.875rem' }}>{selectedEmployeeData.id}</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#1a8d9b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <Briefcase size={18} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>القسم</p>
                  <p style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.875rem' }}>{selectedEmployeeData.department || '-'}</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#1a8d9b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <Briefcase size={18} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}>المسمى الوظيفي</p>
                  <p style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.875rem' }}>{selectedEmployeeData.jobTitle || '-'}</p>
                </div>
              </div>
              
              {/* Financial Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                
                {/* Earnings */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)', padding: '1.25rem', borderBottom: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <ChevronUp size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#065f46', margin: 0 }}>الاستحقاقات</h3>
                      <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '500', margin: 0, opacity: 0.8 }}>تفاصيل المبالغ المضافة</p>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed #f1f5f9', marginBottom: '12px' }}>
                      <span style={{ color: '#475569', fontWeight: 'bold' }}>الراتب الأساسي</span>
                      <span style={{ fontWeight: '900', color: '#1e293b', fontSize: '1.125rem' }}>{selectedEmployeeData.basic} <span style={{ fontSize: '0.875rem', color: '#64748b' }}>د.أ</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#475569', fontWeight: 'bold' }}>بدل إضافي <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '999px' }}>({selectedEmployeeData.totalOvertimeHours} ساعة)</span></span>
                      <span style={{ fontWeight: '900', color: '#059669', fontSize: '1.125rem' }}>+{selectedEmployeeData.overtimePay} <span style={{ fontSize: '0.875rem' }}>د.أ</span></span>
                    </div>
                  </div>
                  <div style={{ background: '#ecfdf5', padding: '1.25rem', borderTop: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#065f46' }}>إجمالي الاستحقاقات</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#047857' }}>{selectedEmployeeData.basic + selectedEmployeeData.overtimePay} <span style={{ fontSize: '0.875rem' }}>د.أ</span></span>
                    </div>
                  </div>
                </div>
                
                {/* Deductions */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'linear-gradient(to right, #fef2f2, #fff1f2)', padding: '1.25rem', borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <ChevronDown size={24} strokeWidth={3} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#9f1239', margin: 0 }}>الاستقطاعات</h3>
                      <p style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: '500', margin: 0, opacity: 0.8 }}>تفاصيل الخصومات والمخالفات</p>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px dashed #f1f5f9', marginBottom: '12px' }}>
                      <span style={{ color: '#475569', fontWeight: 'bold' }}>الخصومات والمخالفات</span>
                      <span style={{ fontWeight: '900', color: '#e11d48', fontSize: '1.125rem' }}>-{selectedEmployeeData.totalDeductions} <span style={{ fontSize: '0.875rem' }}>د.أ</span></span>
                    </div>
                    {selectedEmployeeData.violationsList?.length > 0 && (
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginTop: '12px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '8px' }}>تفصيل المخالفات:</p>
                        {selectedEmployeeData.violationsList.map((v, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'white', padding: '8px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '4px' }}>
                            <span style={{ color: '#334155', fontWeight: 'bold' }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#fb7185', marginRight: '4px', marginLeft: '4px' }}></span>
                              {v.type} <span style={{ color: '#94a3b8', fontWeight: '500' }}>({v.date?.split('-')[2]})</span>
                            </span>
                            <span style={{ fontWeight: '900', color: '#e11d48' }}>{v.deductionAmount} د.أ</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#fef2f2', padding: '1.25rem', borderTop: '1px solid #fecdd3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#9f1239' }}>إجمالي الاستقطاعات</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#be123c' }}>{selectedEmployeeData.totalDeductions} <span style={{ fontSize: '0.875rem' }}>د.أ</span></span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Net Salary */}
              <div style={{ background: 'linear-gradient(to left, #0f172a, #1e293b, #0f172a)', borderRadius: '24px', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #334155' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                    <CheckCircle size={14} color="#34d399" />
                    <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>الخلاصة المالية</span>
                  </div>
                  <h2 style={{ fontSize: '1.875rem', fontWeight: '900', color: 'white', margin: 0 }}>صافي الراتب المستحق</h2>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px 32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '3.75rem', fontWeight: '900', color: '#34d399', textShadow: '0 4px 6px rgba(0,0,0,0.3)', lineHeight: 1 }}>
                    {selectedEmployeeData.netSalary}
                  </span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'rgba(52,211,153,0.8)', marginRight: '12px' }}>د.أ</span>
                </div>
              </div>
              
              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', paddingTop: '2.5rem', borderTop: '1px solid #e2e8f0', marginTop: '2.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4rem' }}>توقيع الموظف المستلم</p>
                  <div style={{ borderBottom: '2px dashed #cbd5e1', width: '75%', margin: '0 auto' }}></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#64748b', fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '4rem' }}>اعتماد الإدارة / المحاسبة</p>
                  <div style={{ borderBottom: '2px dashed #cbd5e1', width: '75%', margin: '0 auto' }}></div>
                </div>
              </div>
              
              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
                <Printer size={12} />
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                  طبع بواسطة نظام <span style={{ color: '#1a8d9b' }}>Mr Sleep HR</span> في {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'sheet' && (
          <div className="bg-white printable-card print-no-border" style={{ 
            direction: 'rtl',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(26,141,155,0.15)',
            overflow: 'hidden',
            WebkitPrintColorAdjust: 'exact', 
            printColorAdjust: 'exact' 
          }}>
            {/* Awesome Header */}
            <div style={{
              background: 'linear-gradient(to left, #1e293b, #0f172a)',
              padding: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(to bottom right, #1a8d9b, #126b77)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Briefcase size={32} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.875rem', fontWeight: '900', color: 'white', marginBottom: '8px' }}>كشف الرواتب المجمع</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#1a8d9b" /> {getSelectedMonthLabel()}
                    </span>
                    <span style={{ background: 'rgba(26,141,155,0.2)', color: '#1a8d9b', padding: '4px 12px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 'bold', border: '1px solid rgba(26,141,155,0.3)' }}>
                      {selectedDepartment === 'all' ? 'جميع الأقسام' : departments[selectedDepartment]}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px 24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '900', color: 'white', margin: 0 }}>Mr Sleep</h2>
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            <div style={{ padding: '2rem' }}>
              <div style={{ borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569', width: '64px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569' }}>الموظف</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569', width: '128px' }}>الأساسي</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569', width: '128px' }}>إضافي</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569', width: '128px' }}>خصومات</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#1a8d9b', width: '144px', background: 'rgba(26,141,155,0.05)', borderRight: '1px solid rgba(26,141,155,0.1)', borderLeft: '1px solid rgba(26,141,155,0.1)' }}>الصافي</th>
                      <th style={{ padding: '1.25rem', fontWeight: '900', color: '#475569', width: '192px', textAlign: 'center' }}>التوقيع بالاستلام</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryData
                      .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                      .map((emp, index) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td style={{ padding: '1rem 1.25rem', color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>{index + 1}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: '#1e293b' }}>{emp.name}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 'bold', color: '#475569' }}>{emp.basic} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>د.أ</span></td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: '#059669' }}>+{emp.overtimePay}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: '#e11d48' }}>-{emp.totalDeductions}</td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '900', color: '#1e293b', fontSize: '1.125rem', background: 'rgba(26,141,155,0.05)', borderRight: '1px solid rgba(26,141,155,0.1)', borderLeft: '1px solid rgba(26,141,155,0.1)' }}>{emp.netSalary} <span style={{ fontSize: '0.75rem', color: '#1a8d9b', fontWeight: 'bold' }}>د.أ</span></td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ borderBottom: '2px dashed #e2e8f0', width: '100%', marginTop: '16px' }}></div>
                          </td>
                        </tr>
                      ))}
                    
                    {/* Totals Row */}
                    <tr style={{ background: 'linear-gradient(to right, #1a8d9b, #126b77)', color: 'white' }}>
                      <td colSpan="2" style={{ padding: '1.5rem 1.25rem', fontWeight: '900', fontSize: '1.125rem' }}>المجموع الكلي للرواتب:</td>
                      <td style={{ padding: '1.5rem 1.25rem', fontWeight: 'bold', fontSize: '1.125rem' }}>
                        {salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.basic, 0)} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>د.أ</span>
                      </td>
                      <td style={{ padding: '1.5rem 1.25rem', fontWeight: '900', color: '#6ee7b7', fontSize: '1.125rem' }}>
                        +{salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.overtimePay, 0)} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'white' }}>د.أ</span>
                      </td>
                      <td style={{ padding: '1.5rem 1.25rem', fontWeight: '900', color: '#fda4af', fontSize: '1.125rem' }}>
                        -{salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.totalDeductions, 0)} <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'white' }}>د.أ</span>
                      </td>
                      <td style={{ padding: '1.5rem 1.25rem', fontWeight: '900', fontSize: '1.5rem', background: 'rgba(0,0,0,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                        {salaryData
                          .filter(emp => selectedDepartment === 'all' || emp.department === departments[selectedDepartment] || emp.department === selectedDepartment)
                          .reduce((sum, e) => sum + e.netSalary, 0)} <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>د.أ</span>
                      </td>
                      <td style={{ padding: '1.5rem 1.25rem' }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8' }}>
                <Printer size={12} />
                <p style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                  طبع بواسطة نظام <span style={{ color: '#1a8d9b' }}>Mr Sleep HR</span> في {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>"""

new_content = re.sub(r'      \{/\* Printable Area \*/\}.*?      </div>\s*</div>\s*\);\s*};\s*export default HRSalaryReports;', new_print_area + '\n    </div>\n  );\n};\n\nexport default HRSalaryReports;', content, flags=re.DOTALL)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
