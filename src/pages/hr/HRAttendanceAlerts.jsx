import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Fingerprint, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { getEmployees, getHRAttendance, getReports, getSupervisorReports, getHRLeaves } from '../../store';

const getLocalDateStr = (d) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const HRAttendanceAlerts = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employeeReports, setEmployeeReports] = useState([]);
  const [supervisorReports, setSupervisorReports] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Alerts data
  const [alerts, setAlerts] = useState({
    missingIn: [],
    missingOut: []
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [emps, records, empReps, supReps, allLeaves] = await Promise.all([
        getEmployees(), 
        getHRAttendance(),
        getReports(),
        getSupervisorReports(),
        getHRLeaves()
      ]);
      setEmployees(emps);
      setAttendanceRecords(records);
      setEmployeeReports(empReps || []);
      setSupervisorReports(supReps || []);
      setLeaves(allLeaves || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);
    const approvedLeaves = leaves.filter(l => 
      l.status === 'موافق' && 
      (l.date === selectedDate || (l.startDate <= selectedDate && l.endDate >= selectedDate))
    );

    const missingInList = [];
    const missingOutList = [];

    employees.forEach(emp => {
      // Check if employee is on leave today
      const isOnLeave = approvedLeaves.some(l => l.employeeId === emp.id);
      if (isOnLeave) return; // Skip alerts for employees on approved leave

      const existingRecord = todayRecords.find(r => String(r.employeeId || '').trim() === String(emp.id || '').trim());
      
      let reportedTimeIn = '';
      let reportedTimeOut = '';

      if (existingRecord) {
        reportedTimeIn = existingRecord.timeIn || '';
        reportedTimeOut = existingRecord.timeOut || '';
      } else {
        const empReport = employeeReports.find(r => String(r.userId || '').trim() === String(emp.id || '').trim() && r.date === selectedDate);
        const supReport = supervisorReports.find(r => String(r.supervisorId || '').trim() === String(emp.id || '').trim() && r.date === selectedDate);
        
        if (empReport && empReport.timeIn) reportedTimeIn = empReport.timeIn;
        if (empReport && empReport.timeOut) reportedTimeOut = empReport.timeOut;
        
        if (supReport && supReport.timeIn) reportedTimeIn = supReport.timeIn;
        if (supReport && supReport.timeOut) reportedTimeOut = supReport.timeOut;
      }

      if (!reportedTimeIn) {
        missingInList.push({
          id: emp.id,
          name: emp.name,
          department: emp.department || '-'
        });
      } else if (reportedTimeIn && !reportedTimeOut) {
        missingOutList.push({
          id: emp.id,
          name: emp.name,
          department: emp.department || '-',
          timeIn: reportedTimeIn
        });
      }
    });

    setAlerts({
      missingIn: missingInList,
      missingOut: missingOutList
    });
  }, [selectedDate, attendanceRecords, employees, employeeReports, supervisorReports, leaves, loading]);

  const filterAndSort = (list) => {
    return list.filter(item => 
      item.name?.toLowerCase().includes(search.toLowerCase()) || 
      item.id?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (valA == null) valA = '';
      if (valB == null) valB = '';

      if (sortConfig.key === 'name') {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const numA = Number(strA);
      const numB = Number(strB);

      if (strA !== '' && strB !== '' && !isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (loading && employees.length === 0) return <div className="text-center p-8">جاري التحميل...</div>;

  const sortedMissingIn = filterAndSort(alerts.missingIn);
  const sortedMissingOut = filterAndSort(alerts.missingOut);

  return (
    <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
      <div className="flex-responsive mb-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="text-rose-500" /> تنبيهات الحضور التشغيلية
          </h2>
          <p className="text-muted text-sm mt-1">تنبيهات فورية للموظفين الذين لم يسجلوا بصمة الدخول أو الخروج</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto max-w-md mr-auto">
          <div className="search-wrapper">
            <Calendar className="search-icon" size={18} />
            <Flatpickr 
              value={selectedDate}
              onChange={(dates, dateStr) => setSelectedDate(dateStr)}
              className="input-field search-input"
              options={{ dateFormat: 'Y-m-d' }}
              placeholder="اختر التاريخ"
            />
          </div>
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="بحث باسم أو رقم..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field search-input"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Missing Check In */}
        <div className="bg-rose-50/30 rounded-xl border border-rose-100 p-4">
          <div className="flex items-center gap-2 mb-4 text-rose-700">
            <Fingerprint size={20} />
            <h3 className="font-bold text-lg">لم يسجلوا بصمة دخول ({sortedMissingIn.length})</h3>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-rose-50 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-2">الرقم {renderSortIcon('id')}</div>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">الموظف {renderSortIcon('name')}</div>
                  </th>
                  <th className="p-3 font-semibold text-slate-600">القسم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedMissingIn.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{emp.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-3 text-slate-500">{emp.department}</td>
                  </tr>
                ))}
                {sortedMissingIn.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400">
                      لا يوجد تنبيهات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Missing Check Out */}
        <div className="bg-amber-50/30 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-4 text-amber-700">
            <Fingerprint size={20} />
            <h3 className="font-bold text-lg">لم يسجلوا بصمة خروج ({sortedMissingOut.length})</h3>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-amber-50 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-2">الرقم {renderSortIcon('id')}</div>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">الموظف {renderSortIcon('name')}</div>
                  </th>
                  <th className="p-3 font-semibold text-slate-600">وقت الدخول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedMissingOut.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{emp.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-3 font-mono text-blue-600" dir="ltr">{emp.timeIn}</td>
                  </tr>
                ))}
                {sortedMissingOut.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400">
                      لا يوجد تنبيهات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRAttendanceAlerts;
