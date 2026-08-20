import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar , ArrowUpDown} from 'lucide-react';
import { getHRAuditLogs } from '../../store';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/airbnb.css';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const HRAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateRange, setDateRange] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const data = await getHRAuditLogs();
      setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    // Search
    const searchMatches = matchesSearch(
      [log.user, log.action, log.description, log.module, log.id],
      debouncedSearch
    );
    
    // Module Filter
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

    // Date Filter
    let matchesDate = true;
    if (dateRange.length === 2) {
      const logDate = log.timestamp?.split('T')[0];
      const start = dateRange[0].toISOString().split('T')[0];
      const end = dateRange[1].toISOString().split('T')[0];
      matchesDate = logDate >= start && logDate <= end;
    }

    return searchMatches && matchesModule && matchesDate;
  });

  const getModuleColor = (mod) => {
    if (mod?.includes('حضور')) return 'bg-blue-100 text-blue-700';
    if (mod?.includes('إجازات')) return 'bg-emerald-100 text-emerald-700';
    if (mod?.includes('خصومات')) return 'bg-rose-100 text-rose-700';
    if (mod?.includes('رواتب')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-700';
  };

  const modulesList = [...new Set(logs.map(l => l.module))].filter(Boolean);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">جاري تحميل سجل التدقيق...</div>;

  return (
    <div className="glass-card animate-fade-in min-h-[500px] flex flex-col">
      {/* Header */}
      <div className="flex-responsive mb-6 border-b pb-4 shrink-0">
        <div style={{ flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#1e293b' }}>
            <History className="text-primary" /> سجل التدقيق
          </h2>
          <p className="text-muted text-sm mt-1">تتبع كافة الحركات والتعديلات التي تمت على نظام الموارد البشرية.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          <div className="search-wrapper w-full md:w-auto">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="بحث عن مستخدم، حدث..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field search-input"
            />
          </div>
          
          <div className="input-group mb-0 w-full md:w-auto min-w-[150px]">
            <select 
              className="input-field py-2"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="all">كل الأقسام</option>
              {modulesList.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="input-group mb-0 w-full md:w-auto min-w-[220px]">
            <div className="relative">
               <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <Flatpickr
                 className="input-field py-2 pr-10"
                 placeholder="تصفية حسب التاريخ"
                 options={{ mode: 'range', dateFormat: 'Y-m-d' }}
                 value={dateRange}
                 onChange={(dates) => setDateRange(dates)}
               />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-responsive flex-1">
        <table className="table">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-sm border-b border-slate-200">
              <th className="py-4 px-6 font-bold">تاريخ ووقت الحركة</th>
              <th className="py-4 px-6 font-bold">بواسطة المستخدم</th>
              <th className="py-4 px-6 font-bold">القسم</th>
              <th className="py-4 px-6 font-bold">نوع الإجراء</th>
              <th className="py-4 px-6 font-bold">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const d = new Date(log.timestamp);
              const dateStr = d.toLocaleDateString('en-CA');
              const timeStr = d.toLocaleTimeString('ar-SA');
              
              return (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-3 px-6 whitespace-nowrap">
                    <div className="font-semibold text-slate-700">{dateStr}</div>
                    <div className="text-xs text-slate-400">{timeStr}</div>
                  </td>
                  <td className="py-3 px-6 font-bold text-slate-800">{log.user || 'نظام'}</td>
                  <td className="py-3 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getModuleColor(log.module)}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-semibold text-slate-600">{log.action}</td>
                  <td className="py-3 px-6 text-sm text-slate-500 max-w-md truncate" title={log.description}>{log.description}</td>
                </tr>
              );
            })}
            
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                     <History size={48} className="opacity-20 mb-2" />
                     <p>لا يوجد حركات مسجلة تطابق بحثك</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HRAuditLog;
