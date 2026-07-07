const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HRMissingPunches.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement starts exactly from the return statement
const returnRegex = /return \(\s*<div className="space-y-6">([\s\S]*?)export default HRMissingPunches;/;
const match = content.match(returnRegex);

if (!match) {
    console.error("Could not find the return block.");
    process.exit(1);
}

const newReturnJSX = `return (
    <div className="space-y-6" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      
      {/* Title Row */}
      <div className="flex justify-end items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          طلبات الختمات الناقصة <Fingerprint className="text-teal-600" size={28} style={{ color: '#0f766e' }} />
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        {/* Left Side: Submit Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ backgroundColor: '#0f766e' }}
        >
          <Plus size={18} strokeWidth={2.5} /> تقديم طلب جديد
        </button>

        {/* Right Side: Filters */}
        <div className="flex items-center gap-3 flex-wrap ml-auto justify-end">
          
          {/* Employee Name */}
          <div className="w-[280px]">
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    height: '42px',
                    minHeight: '42px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    '&:hover': { borderColor: '#cbd5e1' }
                  }),
                  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
                  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: '14px' }),
                }}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                noOptionsMessage={() => "لا يوجد موظف"}
              />
          </div>

          {/* Employee ID */}
          <div className="w-[140px]">
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    height: '42px',
                    minHeight: '42px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    '&:hover': { borderColor: '#cbd5e1' }
                  }),
                  valueContainer: (base) => ({ ...base, padding: '0 12px' }),
                  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: '14px' }),
                }}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
                menuPosition="fixed"
                noOptionsMessage={() => "لا يوجد رقم"}
              />
          </div>

          {/* Status */}
          <div className="relative">
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="border border-slate-200 bg-white text-slate-700 rounded-lg px-3 focus:outline-none shadow-sm appearance-none pr-8"
               style={{ height: '42px', minWidth: '150px', fontSize: '14px' }}
             >
               <option value="الكل">الكل</option>
               <option value="معلق">الطلبات المعلقة</option>
               <option value="موافق عليه">الموافق عليها</option>
               <option value="مرفوض">المرفوضة</option>
             </select>
             <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Month/Date Picker */}
          {dateMode === 'month' ? (
             <div className="shadow-sm rounded-lg"><MonthPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} /></div>
          ) : dateMode === 'day' ? (
             <div className="alerts-date-wrapper bg-white border border-slate-200 shadow-sm" style={{ margin: 0, height: '42px', borderRadius: '8px' }}>
                <Calendar className="text-teal-600 ml-2" size={16} />
                <Flatpickr 
                  value={selectedDate}
                  onChange={(dates, dateStr) => setSelectedDate(dateStr)}
                  className="alerts-date-input"
                  options={{ dateFormat: 'Y-m-d' }}
                  placeholder="اختر التاريخ"
                />
             </div>
          ) : (
             <div className="alerts-date-range-container bg-white shadow-sm border border-slate-200" style={{ margin: 0, height: '42px', borderRadius: '8px' }}>
                <div className="alerts-date-range-field">
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginLeft: '6px' }}>من</span>
                  <Flatpickr 
                    value={startDate}
                    onChange={(dates, dateStr) => setStartDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="البداية"
                    style={{ width: '75px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
                <div className="alerts-date-range-field">
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginLeft: '6px' }}>إلى</span>
                  <Flatpickr 
                    value={endDate}
                    onChange={(dates, dateStr) => setEndDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    placeholder="النهاية"
                    style={{ width: '75px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
             </div>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner">
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-md transition-colors \${dateMode === 'day' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}\`}
                onClick={() => setDateMode('day')}
             >
                يومي
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-md transition-colors \${dateMode === 'month' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}\`}
                onClick={() => setDateMode('month')}
             >
                شهري
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-md transition-colors \${dateMode === 'range' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}\`}
                onClick={() => setDateMode('range')}
             >
                فترة
             </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Rejected Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-50 text-red-400">
            <X size={28} strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <p className="text-slate-800 font-bold text-sm mb-2">طلبات مرفوضة / ملغية</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{rejectedCount}</h3>
            <p className="text-slate-400 text-xs mt-2">طلب</p>
          </div>
        </div>

        {/* Approved Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-500">
            <Check size={28} strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <p className="text-slate-800 font-bold text-sm mb-2">طلبات موافق عليها</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{approvedCount}</h3>
            <p className="text-slate-400 text-xs mt-2">طلب</p>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-50 text-amber-500">
            <Clock size={28} />
          </div>
          <div className="text-left">
            <p className="text-slate-800 font-bold text-sm mb-2">طلبات معلقة</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{pendingCount}</h3>
            <p className="text-slate-400 text-xs mt-2">طلب</p>
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-50 text-blue-500">
            <Fingerprint size={28} />
          </div>
          <div className="text-left">
            <p className="text-slate-800 font-bold text-sm mb-2">إجمالي الطلبات</p>
            <h3 className="text-3xl font-bold text-slate-900 leading-none">{totalCount}</h3>
            <p className="text-slate-400 text-xs mt-2">طلب</p>
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white text-slate-900 border-b border-slate-100 text-sm">
                <th className="p-4 font-bold whitespace-nowrap text-center">الإجراء</th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">الحالة <SortIcon col="status" /></div>
                </th>
                <th className="p-4 font-bold cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => handleSort('reason')}>
                  <div className="flex items-center gap-1">السبب <SortIcon col="reason" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap text-center">وقت الخروج</th>
                <th className="p-4 font-bold whitespace-nowrap text-center">وقت الدخول</th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">النوع <SortIcon col="type" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-center" onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-center gap-1">التاريخ <SortIcon col="date" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1">اسم الموظف <SortIcon col="employeeName" /></div>
                </th>
                <th className="p-4 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors text-right" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1">الرقم الوظيفي <SortIcon col="employeeId" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPunches.length === 0 ? (
                <tr><td colSpan="9" className="p-12 text-center text-slate-500 font-bold">لا توجد طلبات مطابقة للعرض</td></tr>
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

                // Status Badge logic
                let badgeClass = "bg-slate-50 border-slate-200 text-slate-600";
                let dotClass = "bg-slate-400";
                if (p.status === 'معلق' || p.status === 'قيد المراجعة') {
                  badgeClass = "bg-[#fefce8] border-[#fef08a] text-yellow-700";
                  dotClass = "bg-yellow-400";
                } else if (p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام') {
                  badgeClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
                  dotClass = "bg-emerald-500";
                } else if (p.status === 'مرفوض') {
                  badgeClass = "bg-red-50 border-red-200 text-red-700";
                  dotClass = "bg-red-500";
                }

                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    
                    {/* Action Column First (Left side in screenshot) */}
                    <td className="p-4">
                      <div className="flex gap-2 justify-center items-center flex-nowrap">
                        {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                          p.isVirtual ? (
                            <div className="flex items-center gap-2 flex-nowrap">
                              <select
                                className="text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer shadow-sm shrink-0 h-[34px] appearance-none text-center px-3"
                                style={{ borderRadius: '6px', width: '130px', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left .7em top 50%', backgroundSize: '.65em auto' }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  e.target.value = "";
                                  handleDropdownAction(p, val);
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>إجراءات أخرى</option>
                                {p.type === 'خروج' && <option value="early">مغادرة مبكرة</option>}
                                {(emp?.allowedLeaveTypes || []).includes('إجازة سنوية') && <option value="vacation">إجازة سنوية</option>}
                                {(emp?.allowedLeaveTypes || []).includes('إجازة مرضية') && <option value="sick">إجازة مرضية</option>}
                                {(emp?.allowedLeaveTypes || []).includes('إجازة غير مدفوعة') && <option value="unpaid">إجازة غير مدفوعة</option>}
                                <option value="violation">تسجيل مخالفة مالية</option>
                              </select>

                              <button
                                onClick={() => handleDropdownAction(p, 'time')}
                                className="flex items-center gap-1.5 px-4 h-[34px] text-white text-xs font-bold shrink-0 transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#0f766e', borderRadius: '6px' }}
                              >
                                حفظ الدوام <ChevronDown size={14} className="opacity-70" />
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
                                <button onClick={() => handleRegisterViolation(p)} className="shrink-0" style={{ background: '#0f766e', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }} title="تحويل لمخالفة">
                                  تسجيل مخالفة
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-center gap-2 flex-nowrap w-full">
                            <span className="text-xs text-slate-400 whitespace-nowrap font-bold">({p.approvedBy || '-'})</span>
                            {!p.isVirtual && (
                              <button onClick={() => handleUpdateStatus(p, 'معلق')} className="text-slate-400 hover:text-amber-500 transition-colors" title="تراجع عن القرار">
                                <Undo2 size={16} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <span className={\`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-sm \${badgeClass}\`}>
                          <div className={\`w-1.5 h-1.5 rounded-full \${dotClass}\`}></div>
                          {p.status}
                        </span>
                      </div>
                    </td>

                    {/* Reason Column */}
                    <td className="p-4 text-sm font-bold text-slate-700 text-right">{p.reason}</td>

                    {/* Check-out Time */}
                    <td className="p-4 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'خروج' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="border border-slate-200 rounded focus:border-teal-500 focus:outline-none"
                              style={{ width: 85, height: 28, fontSize: 13, textAlign: 'center', color: '#334155', fontWeight: 'bold' }}
                              value={inlineTimes[\`\${p.id}_out\`] || ''}
                              onChange={(e) => handleInlineTimeChange(\`\${p.id}_out\`, e.target.value)}
                            />
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'خروج' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeOut ? '#334155' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeOut || '--:--'}</div>
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Check-in Time */}
                    <td className="p-4 font-bold whitespace-nowrap text-center" dir="ltr">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {(p.type === 'دخول' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input
                              type="time"
                              className="border border-slate-200 rounded focus:border-teal-500 focus:outline-none"
                              style={{ width: 85, height: 28, fontSize: 13, textAlign: 'center', color: '#334155', fontWeight: 'bold' }}
                              value={inlineTimes[\`\${p.id}_in\`] || ''}
                              onChange={(e) => handleInlineTimeChange(\`\${p.id}_in\`, e.target.value)}
                            />
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (p.type === 'دخول' && !p.isVirtual) ? (
                          <>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.time}</div>
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        ) : (
                          <>
                            <div style={{ fontWeight: 700, color: p.attendanceRecord?.timeIn ? '#334155' : '#cbd5e1', fontSize: 13, textAlign: 'center', width: 50, padding: 0 }}>{p.attendanceRecord?.timeIn || '--:--'}</div>
                            <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Type Column */}
                    <td className="p-4 whitespace-nowrap text-center font-bold text-sm text-slate-700">
                      {p.isVirtual ? 'الي' : 'يدوي'}
                    </td>

                    {/* Date Column */}
                    <td className="p-4 whitespace-nowrap text-slate-800 font-bold text-center">
                       <div className="flex items-center justify-center gap-1.5">
                         {p.date}
                         <Calendar size={14} className="text-teal-600 opacity-80" />
                       </div>
                    </td>

                    {/* Name Column */}
                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap text-right">
                      {p.employeeName}
                    </td>

                    {/* Employee ID Column */}
                    <td className="p-4 text-teal-700 font-bold font-mono text-sm whitespace-nowrap text-right" dir="ltr">
                      {p.employeeId}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder (Matching the screenshot visually) */}
        {filteredPunches.length > 0 && (
           <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white">
             <div className="flex items-center gap-2">
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400">&laquo;</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border bg-teal-700 text-white font-bold border-teal-700">1</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400">&raquo;</button>
             </div>
             <div className="text-sm font-bold text-slate-500">
               من 1 إلى {filteredPunches.length} من أصل {filteredPunches.length} طلب
             </div>
             <div className="flex items-center gap-2">
               <span className="text-sm font-bold text-slate-500">عرض</span>
               <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm">
                 <span className="text-sm font-bold text-slate-700">10</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </div>
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
              <Fingerprint className="text-teal-600" size={20} /> طلب ختمة ناقصة
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
                <button type="submit" className="btn text-white px-6 font-bold rounded-lg" style={{ backgroundColor: '#0f766e' }}>إرسال الطلب</button>
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

console.log('✅ تم حفظ التعديلات الشاملة على ملف HRMissingPunches.jsx وتطبيق التصميم الجديد بالكامل.');
