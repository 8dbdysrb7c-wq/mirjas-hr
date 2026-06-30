import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update ALL_LEAVE_TYPES everywhere
old_leave_types = """const ALL_LEAVE_TYPES = [
  'إجازة سنوية',
  'إجازة مرضية',
  'مغادرة خاصة',
  'مغادرة عمل',
  'إذن تأخير',
  'خروج مبكر',
  'إجازة بدون راتب',
  'بدل عمل إضافي'
];"""
new_leave_types = """const ALL_LEAVE_TYPES = [
  'إجازة سنوية',
  'إجازة مرضية',
  'مغادرة خاصة',
  'مغادرة عمل',
  'إجازة غير مدفوعة',
  'بدل عمل إضافي'
];"""

old_leave_types_emp = """  const ALL_LEAVE_TYPES = [
    'إجازة سنوية',
    'إجازة مرضية',
    'مغادرة خاصة',
    'مغادرة عمل',
    'إذن تأخير',
    'خروج مبكر',
    'إجازة بدون راتب',
    'بدل عمل إضافي'
  ];"""
new_leave_types_emp = """  const ALL_LEAVE_TYPES = [
    'إجازة سنوية',
    'إجازة مرضية',
    'مغادرة خاصة',
    'مغادرة عمل',
    'إجازة غير مدفوعة',
    'بدل عمل إضافي'
  ];"""

# 2. Add lpSort logic to AdminSettings.jsx
old_state = "  const [mpSortConfig, setMpSortConfig] = useState({ key: 'name', direction: 'ascending' });"
new_state = """  const [mpSortConfig, setMpSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [lpSortConfig, setLpSortConfig] = useState({ key: 'name', direction: 'ascending' });"""

old_handle = """  const handleMpSort = (key) => {"""
new_handle = """  const handleLpSort = (key) => {
    let direction = 'ascending';
    if (lpSortConfig.key === key && lpSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setLpSortConfig({ key, direction });
  };

  const getLpSortIcon = (key) => {
    if (lpSortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-50" />;
    return <ArrowUpDown size={14} className={`text-primary transform transition-transform ${lpSortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />;
  };

  const getLpSortedEmployees = () => {
    const sorted = [...employees];
    if (!lpSortConfig || !lpSortConfig.key) return sorted;
    
    sorted.sort((a, b) => {
      let aVal = a[lpSortConfig.key];
      let bVal = b[lpSortConfig.key];

      if (lpSortConfig.key === 'id') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
        if (aVal < bVal) return lpSortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return lpSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
      
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return lpSortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return lpSortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleMpSort = (key) => {"""

# 3. Update Table Header & Body for Leave Permissions in AdminSettings.jsx
old_table = """                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-4 font-bold">الموظف</th>
                      <th className="p-4 font-bold text-center">الأنواع المسموحة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const _allow = emp.allowedLeaveTypes;
                      const allowed = Array.isArray(_allow) ? _allow : (typeof _allow === 'string' ? [_allow] : ALL_LEAVE_TYPES);
                      return (
                        <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800 w-1/4">
                            <div>{emp.name}</div>
                            <div className="text-xs text-slate-400 font-normal mt-1">{emp.id}</div>
                          </td>"""

new_table = """                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-4 font-bold text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleLpSort('id')}>
                        <div className="flex justify-center items-center gap-2">
                          {getLpSortIcon('id')} الرقم الوظيفي
                        </div>
                      </th>
                      <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleLpSort('name')}>
                        <div className="flex justify-end items-center gap-2">
                          {getLpSortIcon('name')} الاسم
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center">الأنواع المسموحة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLpSortedEmployees().map((emp) => {
                      const _allow = emp.allowedLeaveTypes;
                      const allowed = Array.isArray(_allow) ? _allow : (typeof _allow === 'string' ? [_allow] : ALL_LEAVE_TYPES);
                      return (
                        <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-center text-slate-600 font-mono text-sm">{emp.id}</td>
                          <td className="p-4 font-bold text-slate-800">{emp.name}</td>"""

update_file('src/pages/admin/AdminSettings.jsx', [
    (old_leave_types, new_leave_types),
    (old_state, new_state),
    (old_handle, new_handle),
    (old_table, new_table)
])

# 4. Update HRLeaves.jsx
update_file('src/pages/hr/HRLeaves.jsx', [
    ("إجازة بدون راتب", "إجازة غير مدفوعة")
])

# 5. Update EmployeeDashboard.jsx
update_file('src/pages/EmployeeDashboard.jsx', [
    (old_leave_types_emp, new_leave_types_emp),
    ("إجازة بدون راتب", "إجازة غير مدفوعة")
])
