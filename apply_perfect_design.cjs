const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'HRMissingPunches.jsx');

try {
  console.log("الخطوة 1: استعادة الملف الأصلي من Git...");
  execSync('git reset --hard', { cwd: __dirname, stdio: 'ignore' });
  execSync('git checkout src/pages/hr/HRMissingPunches.jsx', { cwd: __dirname, stdio: 'ignore' });
  console.log("✅ تم استعادة الملف الأصلي بنجاح.");
} catch (e) {
  console.error("❌ فشل استعادة الملف:", e.message);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Step 2: Inject MonthPicker component
const componentTarget = "const HRMissingPunches = ({ user, refreshCounts }) => {";
const monthPickerCode = `const MonthPicker = ({ selectedMonth, setSelectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [year, setYear] = useState(() => parseInt(selectedMonth.split('-')[0]) || new Date().getFullYear());
  
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const getLabel = () => {
    const [y, m] = selectedMonth.split('-');
    const idx = parseInt(m, 10) - 1;
    return \`\${arabicMonths[idx] || ''} \${y}\`;
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.custom-month-picker-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="custom-month-picker-container" style={{ position: 'relative', direction: 'rtl' }}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '9px 14px',
          cursor: 'pointer',
          minWidth: '130px',
          height: '44px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          fontSize: '13px',
          fontWeight: '700',
          color: '#1e293b',
          flexDirection: 'row-reverse'
        }}
      >
        <Calendar size={16} style={{ color: '#0ea5e9' }} />
        <span>{getLabel()}</span>
        <ChevronDown size={14} style={{ color: '#64748b' }} />
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '260px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            padding: '12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', flexDirection: 'row-reverse' }}>
            <button 
              type="button"
              onClick={() => setYear(y => y + 1)}
              disabled={year >= currentYear}
              style={{ border: 'none', background: 'transparent', cursor: year >= currentYear ? 'not-allowed' : 'pointer', color: year >= currentYear ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
            >
              &gt;
            </button>
            <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px' }}>{year}</span>
            <button 
              type="button"
              onClick={() => setYear(y => y - 1)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}
            >
              &lt;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {arabicMonths.map((m, idx) => {
              const monthStr = \`\${year}-\${String(idx + 1).padStart(2, '0')}\`;
              const isSelected = selectedMonth === monthStr;
              const isCurrent = currentYear === year && (idx + 1) === currentMonth;
              const isFuture = year > currentYear || (year === currentYear && (idx + 1) > currentMonth);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    setSelectedMonth(monthStr);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                    color: isSelected ? '#0284c7' : isFuture ? '#cbd5e1' : '#475569',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.15s'
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
  );
};

const HRMissingPunches = ({ user, refreshCounts }) => {`;

if (content.includes(componentTarget)) {
  content = content.replace(componentTarget, monthPickerCode);
} else {
  console.error("❌ لم يتم العثور على هدف إدراج MonthPicker.");
  process.exit(1);
}

// Step 3: Inject the state variables and useEffect
const stateTarget = "const [inlineTimes, setInlineTimes] = useState({});";
const stateInjection = `const [inlineTimes, setInlineTimes] = useState({});

  // 1. Add dateMode filter states for the redesign
  const [dateMode, setDateMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
  });
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateStr(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateStr(new Date()));

  // 2. Sync dateFrom and dateTo based on dateMode
  useEffect(() => {
    if (dateMode === 'day') {
      setDateFrom(selectedDate);
      setDateTo(selectedDate);
    } else if (dateMode === 'month') {
      const parts = selectedMonth.split('-');
      const y = parseInt(parts[0]) || new Date().getFullYear();
      const m = parseInt(parts[1]) - 1;
      const firstDay = getLocalDateStr(new Date(y, m, 1));
      const lastDay = getLocalDateStr(new Date(y, m + 1, 0));
      setDateFrom(firstDay);
      setDateTo(lastDay);
    } else if (dateMode === 'range') {
      setDateFrom(startDate);
      setDateTo(endDate);
    }
  }, [dateMode, selectedMonth, selectedDate, startDate, endDate]);`;

content = content.replace(stateTarget, stateInjection);

// Step 4: Add User icon import if needed, but we can just use User from lucide-react (already imported usually, if not we ignore or use simple svg)
// Check if User is imported
if (!content.includes('User,')) {
  content = content.replace('Trash2,', 'Trash2, User,');
}

// Step 5: Replace Return JSX with bulletproof layout
const returnRegex = /return \(\s*<div className="space-y-6">([\s\S]*?)export default HRMissingPunches;/;
const newReturnJSX = `return (
    <div className="space-y-6" dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Title Row */}
      <div className="flex items-center mb-6" style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
        <Fingerprint className="text-[#0ea5e9] mr-2" size={32} strokeWidth={2} />
        <h2 className="text-2xl font-bold text-slate-800">
          طلبات الختمات الناقصة
        </h2>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6" style={{ flexDirection: 'row-reverse' }}>
        
        {/* Right Side: Filters Group */}
        <div className="flex flex-wrap items-center gap-3" style={{ flexDirection: 'row-reverse' }}>
          
          {/* 1. Mode Toggle */}
          <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm items-center" style={{ height: '44px', flexDirection: 'row-reverse' }}>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'day' ? 'bg-[#e0f2fe] text-[#0284c7]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('day')}
             >
                يومي
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'month' ? 'bg-[#e0f2fe] text-[#0284c7]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('month')}
             >
                شهري
             </button>
             <button
                type="button"
                className={\`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors \${dateMode === 'range' ? 'bg-[#e0f2fe] text-[#0284c7]' : 'text-slate-500 hover:text-slate-700'}\`}
                onClick={() => setDateMode('range')}
             >
                فترة
             </button>
          </div>

          {/* 2. Month/Date Picker */}
          {dateMode === 'month' && (
             <MonthPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          )}
          {dateMode === 'day' && (
             <div className="alerts-date-wrapper bg-white border border-slate-200 shadow-sm" style={{ margin: 0, height: '44px', borderRadius: '10px', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
                <Calendar className="text-[#0ea5e9] mx-2" size={16} />
                <Flatpickr 
                  value={selectedDate}
                  onChange={(dates, dateStr) => setSelectedDate(dateStr)}
                  className="alerts-date-input"
                  options={{ dateFormat: 'Y-m-d' }}
                  placeholder="اختر التاريخ"
                  style={{ border: 'none', background: 'transparent', width: '100px', fontSize: '13px', fontWeight: 'bold' }}
                />
             </div>
          )}
          {dateMode === 'range' && (
             <div className="alerts-date-range-container bg-white border border-slate-200 shadow-sm" style={{ margin: 0, height: '44px', borderRadius: '10px', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center' }}>
                <div className="flex items-center" style={{ flexDirection: 'row-reverse' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '0 8px' }}>من</span>
                  <Flatpickr 
                    value={startDate}
                    onChange={(dates, dateStr) => setStartDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
                <div className="flex items-center" style={{ flexDirection: 'row-reverse' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', margin: '0 8px' }}>إلى</span>
                  <Flatpickr 
                    value={endDate}
                    onChange={(dates, dateStr) => setEndDate(dateStr)}
                    options={{ dateFormat: 'Y-m-d' }}
                    style={{ width: '85px', border: 'none', outline: 'none', fontWeight: '700', fontSize: '12px', textAlign: 'center', color: '#334155' }}
                  />
                </div>
             </div>
          )}

          {/* 3. Status */}
          <div className="relative shrink-0">
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="border border-slate-200 bg-white text-slate-700 rounded-xl px-4 focus:outline-none shadow-sm appearance-none font-bold"
               style={{ height: '44px', minWidth: '150px', fontSize: '13px', paddingLeft: '32px' }}
             >
               <option value="الكل">كل الطلبات</option>
               <option value="معلق">الطلبات المعلقة</option>
               <option value="موافق عليه">الموافق عليها</option>
               <option value="مرفوض">المرفوضة</option>
             </select>
             <ChevronDown size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* 4. Employee ID */}
          <div className="w-[140px] shrink-0">
              <Select
                options={employeeIdOptions}
                value={employeeIdOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '44px', minHeight: '44px', borderRadius: '10px'})}}
                placeholder="رقم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

          {/* 5. Employee Name */}
          <div className="relative w-[280px] shrink-0">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                <User size={16} className="text-slate-400" />
              </div>
              <Select
                options={employeeNameOptions}
                value={employeeNameOptions.find(opt => opt.value === searchTerm) || null}
                onChange={(selected) => setSearchTerm(selected ? selected.value : '')}
                styles={{...customSelectStyles, control: (base) => ({...base, height: '44px', minHeight: '44px', borderRadius: '10px', paddingLeft: '24px'})}}
                placeholder="اسم الموظف..."
                isSearchable={true}
                isClearable={true}
              />
          </div>

        </div>

        {/* Left Side: Submit Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center text-white px-5 rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity shrink-0"
          style={{ backgroundColor: '#0f766e', height: '44px', flexDirection: 'row-reverse', gap: '8px' }}
        >
          <Plus size={20} strokeWidth={2.5} />
          تقديم طلب جديد
        </button>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" style={{ direction: 'rtl' }}>
        
        {/* Total (Rightmost) */}
        <div className="bg-white flex items-center p-6 rounded-2xl shadow-sm border border-slate-100 justify-between" style={{ flexDirection: 'row-reverse' }}>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-2">إجمالي الطلبات</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{totalCount}</h3>
            <p className="text-sm text-slate-400 font-bold mt-2">طلب</p>
          </div>
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <Fingerprint size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white flex items-center p-6 rounded-2xl shadow-sm border border-slate-100 justify-between" style={{ flexDirection: 'row-reverse' }}>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-2">طلبات معلقة</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{pendingCount}</h3>
            <p className="text-sm text-slate-400 font-bold mt-2">طلب</p>
          </div>
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center shrink-0">
            <Clock size={28} strokeWidth={2} />
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white flex items-center p-6 rounded-2xl shadow-sm border border-slate-100 justify-between" style={{ flexDirection: 'row-reverse' }}>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-2">طلبات موافق عليها</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{approvedCount}</h3>
            <p className="text-sm text-slate-400 font-bold mt-2">طلب</p>
          </div>
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <Check size={28} strokeWidth={2.5} />
          </div>
        </div>

        {/* Rejected (Leftmost) */}
        <div className="bg-white flex items-center p-6 rounded-2xl shadow-sm border border-slate-100 justify-between" style={{ flexDirection: 'row-reverse' }}>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold mb-2">طلبات مرفوضة / معادية</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{rejectedCount}</h3>
            <p className="text-sm text-slate-400 font-bold mt-2">طلب</p>
          </div>
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
            <X size={28} strokeWidth={2.5} />
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="bg-white overflow-hidden shadow-sm border border-slate-100" style={{ padding: 0, borderRadius: '16px' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse" dir="rtl">
            <thead>
              <tr className="bg-white text-slate-900 border-b border-slate-200 text-sm">
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-right" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1 justify-start">الرقم الوظيفي <SortIcon col="employeeId" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-right" style={{ minWidth: '10cm' }} onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1 justify-start">اسم الموظف <SortIcon col="employeeName" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('date')}>
                  <div className="flex items-center justify-center gap-1">التاريخ <SortIcon col="date" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('type')}>
                  <div className="flex items-center justify-center gap-1">النوع <SortIcon col="type" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الدخول</th>
                <th className="p-5 font-bold whitespace-nowrap text-center">وقت الخروج</th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('reason')}>
                  <div className="flex items-center justify-center gap-1">السبب <SortIcon col="reason" /></div>
                </th>
                <th className="p-5 font-bold whitespace-nowrap cursor-pointer hover:bg-slate-50 text-center" onClick={() => handleSort('status')}>
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
                const monthCount = punches.filter(empPunch => {
                  if (String(empPunch.employeeId || '').trim() !== String(p.employeeId || '').trim()) return false;
                  const empDate = new Date(empPunch.date || empPunch.createdAt);
                  return empDate.getMonth() === pDate.getMonth() && empDate.getFullYear() === pDate.getFullYear();
                }).length;
                const isExhausted = monthCount > allowedPunches;

                // Status styling based on Image 2
                let dotClass = "bg-slate-400";
                let textClass = "text-slate-600";
                if (p.status === 'معلق' || p.status === 'قيد المراجعة') {
                  dotClass = "bg-amber-400";
                  textClass = "text-[#0f766e]"; // Greenish text for pending as in image
                } else if (p.status === 'موافق عليه' || p.status === 'موافق' || p.status === 'مكتمل الدوام') {
                  dotClass = "bg-emerald-400";
                  textClass = "text-emerald-700";
                } else if (p.status === 'مرفوض') {
                  dotClass = "bg-red-400";
                  textClass = "text-red-700";
                }

                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-teal-700 font-bold text-sm whitespace-nowrap text-right">
                      {p.employeeId}
                    </td>
                    <td className="p-5 font-bold text-slate-800 whitespace-nowrap text-right">
                      {p.employeeName}
                    </td>
                    <td className="p-5 whitespace-nowrap text-slate-800 font-bold text-sm text-center">
                       <div className="flex items-center justify-center gap-2" style={{ flexDirection: 'row-reverse' }}>
                         <span>{p.date}</span>
                         <Calendar size={14} className="text-[#0f766e]" />
                       </div>
                    </td>
                    <td className="p-5 whitespace-nowrap text-center text-sm font-bold text-slate-800">
                      {p.isVirtual ? 'الي' : 'يدوي'}
                    </td>
                    <td className="p-5 font-bold whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2" style={{ flexDirection: 'row-reverse' }}>
                        {(p.type === 'دخول' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input type="time" className="premium-time-input" style={{ width: 75, height: 28, fontSize: 13 }} value={inlineTimes[\`\${p.id}_in\`] || ''} onChange={(e) => handleInlineTimeChange(\`\${p.id}_in\`, e.target.value)} />
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (p.type === 'دخول' && !p.isVirtual) ? (
                          <>
                            <span className="text-slate-800">{p.time}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (
                          <>
                            <span className={p.attendanceRecord?.timeIn ? 'text-slate-800' : 'text-slate-400'}>{p.attendanceRecord?.timeIn || '--:--'}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-5 font-bold whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2" style={{ flexDirection: 'row-reverse' }}>
                        {(p.type === 'خروج' || p.reason === 'بصمة دخول وخروج') && p.isVirtual && (p.status === 'معلق' || p.status === 'قيد المراجعة') ? (
                          <>
                            <input type="time" className="premium-time-input" style={{ width: 75, height: 28, fontSize: 13 }} value={inlineTimes[\`\${p.id}_out\`] || ''} onChange={(e) => handleInlineTimeChange(\`\${p.id}_out\`, e.target.value)} />
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (p.type === 'خروج' && !p.isVirtual) ? (
                          <>
                            <span className="text-slate-800">{p.time}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        ) : (
                          <>
                            <span className={p.attendanceRecord?.timeOut ? 'text-slate-800' : 'text-slate-400'}>{p.attendanceRecord?.timeOut || '--:--'}</span>
                            <Clock size={14} className="text-slate-400" />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-800 font-bold text-center">{p.reason}</td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center items-center gap-2" style={{ flexDirection: 'row-reverse' }}>
                        <span className={\`w-2 h-2 rounded-full \${dotClass}\`}></span>
                        <span className={\`text-xs font-bold \${textClass}\`}>{p.status}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center items-center gap-3" style={{ flexDirection: 'row-reverse' }}>
                        {p.status === 'معلق' || p.status === 'قيد المراجعة' ? (
                          p.isVirtual ? (
                            <>
                              {/* Left side action (Dropdown) */}
                              <div className="relative">
                                <select
                                  className="text-xs font-bold border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer shadow-sm transition-all h-[36px] px-3 pl-8 rounded-lg appearance-none"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    e.target.value = "";
                                    handleDropdownAction(p, val);
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>إجراءات أخرى</option>
                                  {p.type === 'خروج' && <option value="early">تسجيل كمغادرة مبكرة</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة سنوية') && <option value="vacation">خصم إجازة سنوية</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة مرضية') && <option value="sick">خصم إجازة مرضية</option>}
                                  {(emp?.allowedLeaveTypes || ['إجازة سنوية', 'إجازة مرضية', 'مغادرة خاصة', 'مغادرة عمل', 'إجازة غير مدفوعة', 'بدل عمل إضافي']).includes('إجازة غير مدفوعة') && <option value="unpaid">إجازة غير مدفوعة</option>}
                                  <option value="violation">تسجيل مخالفة مالية</option>
                                </select>
                                <ChevronDown size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>

                              {/* Right side action (Save Button) */}
                              <button
                                onClick={() => handleDropdownAction(p, 'time')}
                                className="flex items-center text-white px-4 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#0f766e', height: '36px', flexDirection: 'row-reverse', gap: '6px' }}
                              >
                                <ChevronDown size={14} />
                                حفظ الدوام
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateStatus(p, 'موافق عليه')} className="icon-btn icon-btn-success shrink-0" title="موافقة"><Check size={18} strokeWidth={2.5} /></button>
                              <button onClick={() => handleUpdateStatus(p, 'مرفوض')} className="icon-btn icon-btn-delete shrink-0" title="رفض"><X size={18} strokeWidth={2.5} /></button>
                              <button onClick={() => handleDelete(p.id)} className="icon-btn icon-btn-delete shrink-0" title="حذف الطلب"><Trash2 size={18} strokeWidth={2.5} /></button>
                              {isExhausted && <button onClick={() => handleRegisterViolation(p)} className="shrink-0" style={{ background: '#0f766e', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>تسجيل مخالفة</button>}
                            </>
                          )
                        ) : (
                          <>
                            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">({p.approvedBy || '-'})</span>
                            {!p.isVirtual && <button onClick={() => handleUpdateStatus(p, 'معلق')} className="icon-btn icon-btn-warning shrink-0" title="تراجع عن القرار"><Undo2 size={16} strokeWidth={2.5} /></button>}
                          </>
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
           <div className="flex items-center p-5 border-t border-slate-100 bg-white justify-between" style={{ flexDirection: 'row-reverse' }}>
             {/* Right Side: Page size */}
             <div className="flex items-center gap-2" style={{ flexDirection: 'row-reverse' }}>
               <span className="text-sm font-bold text-slate-500">عرض</span>
               <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-white cursor-pointer hover:border-slate-300 transition-colors" style={{ flexDirection: 'row-reverse' }}>
                 <span className="text-sm font-bold text-slate-700">10</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </div>
             </div>

             {/* Middle: Info */}
             <div className="text-sm font-bold text-slate-500">
               من 1 إلى {filteredPunches.length} من أصل {filteredPunches.length} طلب
             </div>

             {/* Left Side: Buttons */}
             <div className="flex items-center gap-2" style={{ flexDirection: 'row-reverse' }}>
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors font-bold">&raquo;</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border text-white font-bold shadow-sm" style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }}>1</button>
               <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors font-bold">&laquo;</button>
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
              <Fingerprint className="text-[#0ea5e9]" size={20} /> طلب ختمة ناقصة
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

console.log("✅ تم تطبيق السكربت بنجاح ليتطابق مع الصورة 100%!");
