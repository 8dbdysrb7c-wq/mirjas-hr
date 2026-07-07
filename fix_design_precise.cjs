const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HRMissingPunches.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Modify customSelectStyles to have borderRadius 10px instead of 8px
content = content.replace("borderRadius: '8px',", "borderRadius: '10px',");

const returnRegex = /return \(\s*<div className="space-y-6">([\s\S]*?)export default HRMissingPunches;/;
const match = content.match(returnRegex);

if (!match) {
    console.error("Could not find the return block.");
    process.exit(1);
}

const newReturnJSX = `return (
    <div className="space-y-6" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Title Row */}
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          طلبات الختمات الناقصة <Fingerprint className="text-[#0f766e]" size={28} />
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Left Side: Submit Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ backgroundColor: '#0f766e', height: '42px' }}
        >
          <Plus size={18} strokeWidth={2.5} /> تقديم طلب جديد
        </button>

        {/* Right Side: Filters */}
        <div className="flex flex-wrap items-center gap-3 ml-auto justify-end">
          
          {/* Employee Name */}
          <div className="w-[300px] shrink-0">
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={customSelectStyles}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                noOptionsMessage={() => "لا يوجد موظف"}
              />
          </div>

          {/* Employee ID */}
          <div className="w-[150px] shrink-0">
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={customSelectStyles}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                noOptionsMessage={() => "لا يوجد رقم"}
              />
          </div>

          {/* Status */}
          <div className="relative shrink-0">
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="border border-slate-200 bg-white text-slate-700 rounded-xl px-4 focus:outline-none shadow-sm appearance-none pr-9 font-bold"
               style={{ height: '42px', minWidth: '160px', fontSize: '0.9rem' }}
             >
               <option value="معلق">الطلبات المعلقة</option>
               <option value="موافق عليه">الموافق عليها</option>
               <option value="مرفوض">المرفوضة</option>
               <option value="الكل">الكل</option>
             </select>
             <ChevronDown size={14} className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Month/Date Picker */}
          {dateMode === 'month' && (
             <MonthPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          )}
          {dateMode === 'day' && (
             <div className="alerts-date-wrapper bg-white border border-slate-200 shadow-sm" style={{ margin: 0, height: '42px', borderRadius: '10px' }}>
                <Calendar className="alerts-search-icon text-[#0f766e]" size={18} />
                <Flatpickr 
                  value={selectedDate}
                  onChange={(dates, dateStr) => setSelectedDate(dateStr)}
                  className="alerts-date-input"
                  options={{ dateFormat: 'Y-m-d' }}
                  placeholder="اختر التاريخ"
                />
             </div>
          )}
          {dateMode === 'range' && (
             <div className="alerts-date-range-container bg-white border border-slate-200 shadow-sm" style={{ margin: 0, height: '42px', borderRadius: '10px' }}>
                <div className="alerts-date-range-field">
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginLeft: '6px' }}>من</span>
                  <Flatpickr 
                    value={startDate}
                    onChange={(dates, dateStr) => setStartDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="البداية"
                    style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
                <div className="alerts-date-range-field">
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginLeft: '6px' }}>إلى</span>
                  <Flatpickr 
                    value={endDate}
                    onChange={(dates, dateStr) => setEndDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="النهاية"
                    style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
             </div>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm" style={{ height: '42px', alignItems: 'center' }}>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'day' ? 'bg-[#e0f2f1] text-[#0f766e]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('day')}
             >
                يومي
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'month' ? 'bg-[#e0f2f1] text-[#0f766e]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('month')}
             >
                شهري
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'range' ? 'bg-[#e0f2f1] text-[#0f766e]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('range')}
             >
                فترة
             </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Total (rightmost) */}
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm shrink-0">
            <Fingerprint size={28} />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-1">إجمالي الطلبات</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{totalCount}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">طلب</p>
          </div>
        </div>

        {/* Pending */}
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
            <Clock size={28} />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات معلقة</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{pendingCount}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">طلب</p>
          </div>
        </div>

        {/* Approved */}
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
            <Check size={28} strokeWidth={2.5} />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات موافق عليها</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{approvedCount}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">طلب</p>
          </div>
        </div>

        {/* Rejected (leftmost) */}
        <div className="glass-card flex items-center justify-between hover:-translate-y-1 transition-transform duration-300" style={{ padding: '20px 24px', borderRadius: '16px' }}>
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
            <X size={28} strokeWidth={2.5} />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-1">طلبات مرفوضة / معادية</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{rejectedCount}</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">طلب</p>
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden" style={{ padding: 0, borderRadius: '16px' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white text-slate-900 border-b border-slate-200 text-sm">
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1 justify-end">الرقم الوظيفي <SortIcon col="employeeId" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-right" style={{ minWidth: '10cm' }} onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1 justify-end">اسم الموظف <SortIcon col="employeeName" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-center gap-1">التاريخ <SortIcon col="date" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">النوع <SortIcon col="type" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الدخول</th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الخروج</th>
                <th className="p-5 font-bold w-1/4 cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => handleSort('reason')}>
                  <div className="flex items-center gap-1 justify-end">السبب <SortIcon col="reason" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">الحالة <SortIcon col="status" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredPunches.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-500 font-bold">لا توجد طلبات مطابقة</td></tr>
              ) : filteredPunches.map(p => {
                const emp = employees.find(e => String(e.id || '').trim() === String(p.employeeId || '').trim() || String(e.name || '').trim() === String(p.employeeName || '').trim());
                const allowedPunches = emp?.allowedMissingPunches ?? 3;

                const pDate = new Date(p.date || p.createdAt);
                const pMonth = pDate.getMonth();
                const pYear = pDate.getFullYear();

                const monthCount = punches.filter(empPunch => {
                  if (String(empPunch.employeeId || '').trim() !== String(p.employeeId || '').trim()) return false;
                  const empDate = new Date(empPunch.date || empPunch.createdAt);
                  return empDate.getMonth() === pMonth && empDate.getFullYear() === pYear;
                }).length;

                const isExhausted = monthCount > allowedPunches;

                // Status dots mapping
                let badgeClass = "bg-slate-50 border-slate-200 text-slate-600";
                let dotClass = "bg-slate-400";
                if (p.status === 'معلق' || p.status === 'قيد المراجعة') {
                  badgeClass = "bg-amber-50 border-amber-100 text-amber-700";
                  dotClass = "bg-amber-500";
                } else if (p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام') {
                  badgeClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
                  dotClass = "bg-emerald-500";
                } else if (p.status === 'مرفوض') {
                  badgeClass = "bg-red-50 border-red-200 text-red-700";
                  dotClass = "bg-red-500";
                }

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-slate-500 font-mono text-sm whitespace-nowrap text-right" dir="ltr" style={{ color: '#0f766e', fontWeight: 'bold' }}>
                      {p.employeeId}
                    </td>
                    <td className="p-5 font-bold text-slate-800 whitespace-nowrap text-right">
                      {p.employeeName}
                    </td>
                    <td className="p-5 whitespace-nowrap text-slate-600 font-medium text-center">
                       <div className="flex items-center justify-center gap-1.5">
                         {p.date}
                         <Calendar size={14} className="text-slate-400" />
                       </div>
                    </td>
                    <td className="p-5 whitespace-nowrap text-center text-sm font-semibold text-slate-700">
                      {p.isVirtual ? 'الي' : 'يدوي'}
                    </td>

                    {/* Check-in Time */}
                    <td className="p-5 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'دخول' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="premium-time-input"
                              style={{ width: 85, height: 28, fontSize: 13 }}
                              value={inlineTimes[\`\${p.id}_in\`] || ''}
                              onChange={(e) => handleInlineTimeChange(\`\${p.id}_in\`, e.target.value)}
                            />
                            <Clock size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'دخول' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, textalign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeIn ? '#1e293b' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeIn || '--:--'}</div>
                            <Clock size={14} style={{ color: p.attendanceRecord?.timeIn ? '#3b82f6' : '#e2e8f0', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Check-out Time */}
                    <td className="p-5 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'خروج' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="premium-time-input"
                              style={{ width: 85, height: 28, fontSize: 13 }}
                              value={inlineTimes[\`\${p.id}_out\`] || ''}
                              onChange={(e) => handleInlineTimeChange(\`\${p.id}_out\`, e.target.value)}
                            />
                            <Clock size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'خروج' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeOut ? '#1e293b' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeOut || '--:--'}</div>
                            <Clock size={14} style={{ color: p.attendanceRecord?.timeOut ? '#3b82f6' : '#e2e8f0', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-5 text-sm text-slate-700 font-semibold text-right">{p.reason}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center">
                        <span className={\`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border \${badgeClass}\`}>
                          <span className={\`w-1.5 h-1.5 rounded-full \${dotClass}\`}></span>
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex gap-2 justify-center items-center flex-nowrap">
                        <button onClick={() => handlePreviewPunch(p)} className="icon-btn shrink-0" style={{ color: '#0ea5e9', background: '#f0f9ff', borderColor: '#bae6fd' }} title="معاينة الطلب">
                          <Eye size={18} strokeWidth={2} />
                        </button>
                        {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                          p.isVirtual ? (
                            <div className="flex items-center gap-2 flex-nowrap">
                              
                              {/* Option Actions Dropdown */}
                              <div className="relative">
                                <select
                                  className="text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all h-[34px] px-3 pl-8 appearance-none rounded-lg"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    e.target.value = "";
                                    handleDropdownAction(p, val);
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>إجراءات أخرى</option>
                                  {p.type === 'خروج' && <option value="early">تسجيل كمغادرة مبكرة</option>}

                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة سنوية') && (
                                    <option value="vacation">خصم إجازة سنوية (الرصيد: {emp?.vacationBalance ?? 14})</option>
                                  )}

                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة مرضية') && (
                                    <option value="sick">خصم إجازة مرضية (الرصيد: {emp?.sickLeaveBalance ?? 14})</option>
                                  )}

                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة غير مدفوعة') && (
                                    <option value="unpaid">إجازة غير مدفوعة</option>
                                  )}

                                  <option value="violation">تسجيل مخالفة مالية</option>
                                </select>
                                <ChevronDown size={12} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>

                              <button
                                onClick={() => handleDropdownAction(p, 'time')}
                                className="flex items-center gap-1 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#0f766e', height: '34px' }}
                              >
                                حفظ الدوام <ChevronDown size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-nowrap">
                              <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="icon-btn icon-btn-success shrink-0" title="موافقة">
                                <Check size={18} strokeWidth={2.5} />
                              </button>
                              <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="icon-btn icon-btn-delete shrink-0" title="رفض">
                                <X size={18} strokeWidth={2.5} />
                              </button>
                              <button onClick={() => handleDelete(p.id)} className="icon-btn icon-btn-delete shrink-0" title="حذف الطلب">
                                <Trash2 size={18} strokeWidth={2.5} />
                              </button>
                              {isExhausted && (
                                <button onClick={() => handleRegisterViolation(p)} className="shrink-0" style={{ background: '#0f766e', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', whiteSpace: 'nowrap' }} title="تحويل لمخالفة">
                                  تسجيل مخالفة
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 flex-nowrap">
                            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">({p.approvedBy || '-'})</span>
                            {!p.isVirtual && (
                              <button onClick={() => handleUpdateStatus(p, 'معلق')} className="icon-btn icon-btn-warning shrink-0" title="تراجع عن القرار">
                                <Undo2 size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {filteredPunches.length > 0 && (
           <div className="flex items-center justify-between p-5 border-t border-slate-100 bg-white">
             {/* Right Side: Page size */}
             <div className="flex items-center gap-2">
               <span className="text-sm font-bold text-slate-500">عرض</span>
               <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm cursor-pointer hover:border-slate-300 transition-colors">
                 <span className="text-sm font-bold text-slate-700">10</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </div>
             </div>

             {/* Middle: Info */}
             <div className="text-sm font-bold text-slate-500">
               من 1 إلى {filteredPunches.length} من أصل {filteredPunches.length} طلب
             </div>

             {/* Left Side: Buttons */}
             <div className="flex items-center gap-2">
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">&laquo;</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border bg-teal-700 text-white font-bold border-teal-700 shadow-sm" style={{ backgroundColor: '#0f766e' }}>1</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">&raquo;</button>
             </div>
           </div>
        )}
      </div>

      {/* Add Missing Punch Modal */}
      <div
        className="modal-overlay"
        style={{ zIndex: 10500, display: showAddModal ? 'flex' : 'none' }}
      >
        <div className="modal-content animate-fade-in" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
          <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Fingerprint className="text-[#0f766e]" size={20} /> طلب ختمة ناقصة
            </h3>
            <button type="button" onClick={() => setShowAddModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto">
            <form onSubmit={handleAddPunch} className="space-y-4">
              <div className="input-group">
                <label>الموظف</label>
                <select
                  className="input-field w-full"
                  value={newPunch.employeeId}
                  onChange={(e) => setNewPunch({ ...newPunch, employeeId: e.target.value })}
                  required
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>التاريخ</label>
                <Flatpickr
                  value={newPunch.date}
                  onChange={(dates, dateStr) => setNewPunch({ ...newPunch, date: dateStr })}
                  className="input-field w-full bg-white"
                  options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today' }}
                  placeholder="اختر التاريخ"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label>نوع الختمة</label>
                  <select
                    className="input-field w-full"
                    value={newPunch.type}
                    onChange={(e) => setNewPunch({ ...newPunch, type: e.target.value })}
                    required
                  >
                    <option value="دخول">دخول</option>
                    <option value="خروج">خروج</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>الوقت</label>
                  <Flatpickr
                    className="input-field w-full bg-white"
                    value={newPunch.time}
                    onChange={([d]) => setNewPunch({ ...newPunch, time: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '' })}
                    options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }}
                    placeholder="اختر الوقت"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>سبب عدم تسجيل الختمة</label>
                <textarea
                  className="input-field w-full"
                  rows="2"
                  placeholder="اذكر السبب بوضوح..."
                  value={newPunch.reason}
                  onChange={(e) => setNewPunch({ ...newPunch, reason: e.target.value })}
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn text-white px-6 font-bold rounded-lg shadow-sm" style={{ backgroundColor: '#0f766e' }}>إرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HRMissingPunches;
`;

content = content.replace(returnRegex, newReturnJSX);
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ تم تطبيق التعديل الدقيق بالكامل وبدون أي أخطاء في المكونات!');
