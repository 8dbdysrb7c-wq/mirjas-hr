import React, { useState, useEffect } from 'react';
import { getLogs, isAdmin } from '../../store';
import { getWhatsAppLogs } from '../../utils/whatsappService';
import { 
  ClipboardList, Search, Calendar, User, 
  ArrowUpDown, Filter, Trash2, Shield, 
  Activity, Info, RefreshCw, MessageCircle, CheckCircle, XCircle, Clock
} from 'lucide-react';

const AdminLogs = ({ user }) => {
  const [activeTab, setActiveTab] = useState('system');
  const [logs, setLogs] = useState([]);
  const [waLogs, setWaLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('الكل');
  const [actionFilter, setActionFilter] = useState('الكل');
  const [waStatusFilter, setWaStatusFilter] = useState('الكل');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'system') {
      const data = await getLogs();
      setLogs(data);
    } else {
      const data = await getWhatsAppLogs();
      setWaLogs(data);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === 'الكل' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'الكل' || log.action === actionFilter;

    return matchesSearch && matchesModule && matchesAction;
  }).sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const modules = ['الكل', ...new Set(logs.map(l => l.module))];
  const actions = ['الكل', ...new Set(logs.map(l => l.action))];

  const filteredWaLogs = waLogs.filter(log => {
    const matchesSearch = 
      (log.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.message?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = waStatusFilter === 'الكل' || log.status === waStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const getWaStatusBadge = (status) => {
    switch (status) {
      case 'sent': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };
  
  const getWaStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle size={14} className="mr-1" />;
      case 'pending': return <Clock size={14} className="mr-1" />;
      case 'failed': return <X size={14} strokeWidth={3} className="mr-1" />;
      default: return null;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'إضافة': return 'badge-success';
      case 'تعديل': return 'badge-warning';
      case 'حذف': return 'badge-danger';
      case 'تسجيل دخول': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="loading-spinner" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 m-0">
            <ClipboardList className="text-primary" size={28} />
            سجل العمليات
          </h2>
          <p className="text-muted m-0 mt-1">تتبع كافة التحركات والتغييرات في النظام</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={18} /> تحديث البيانات
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          className={`premium-filter-btn ${activeTab === 'system' ? 'active' : 'inactive'}`}
          onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
        >
          <Activity size={18} />
          سجل النظام
        </button>
        <button
          className={`premium-filter-btn ${activeTab === 'whatsapp' ? 'active' : 'inactive'}`}
          onClick={() => { setActiveTab('whatsapp'); setSearchTerm(''); }}
        >
          <MessageCircle size={18} />
          سجل إشعارات الواتساب
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="input-group mb-0">
            <label className="flex items-center gap-2"><Search size={16} /> بحث عام</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={activeTab === 'system' ? "ابحث باسم المستخدم أو التفاصيل..." : "ابحث برقم الهاتف أو الرسالة..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {activeTab === 'system' ? (
            <>
              <div className="input-group mb-0">
                <label className="flex items-center gap-2"><Filter size={16} /> القسم / الوحدة</label>
                <select 
                  className="input-field"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="input-group mb-0">
                <label className="flex items-center gap-2"><Activity size={16} /> نوع العملية</label>
                <select 
                  className="input-field"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                 <div className="text-xs text-muted w-full text-left font-mono">
                    {filteredLogs.length} عملية مسجلة
                 </div>
              </div>
            </>
          ) : (
            <>
              <div className="input-group mb-0">
                <label className="flex items-center gap-2"><Filter size={16} /> حالة الرسالة</label>
                <select 
                  className="input-field"
                  value={waStatusFilter}
                  onChange={(e) => setWaStatusFilter(e.target.value)}
                >
                  <option value="الكل">الكل</option>
                  <option value="sent">تم الإرسال (sent)</option>
                  <option value="pending">قيد الانتظار (pending)</option>
                  <option value="failed">فشل (failed)</option>
                </select>
              </div>
              <div className="flex items-end md:col-span-2">
                 <div className="text-xs text-muted w-full text-left font-mono">
                    {filteredWaLogs.length} إشعار مسجل
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel p-0 overflow-hidden">
        <div className="table-container">
          {activeTab === 'system' ? (
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('timestamp')} className="cursor-pointer">
                    التاريخ والوقت <ArrowUpDown size={14} className="inline mr-1" />
                  </th>
                  <th onClick={() => handleSort('userName')} className="cursor-pointer">
                    المستخدم <ArrowUpDown size={14} className="inline mr-1" />
                  </th>
                  <th>القسم</th>
                  <th>العملية</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold">{log.date}</span>
                        <span className="text-xs text-muted">{log.time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                          {log.userName?.[0] || 'U'}
                        </div>
                        <span className="font-semibold">{log.userName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div className="text-sm truncate hover:whitespace-normal" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-muted">
                      <Info size={48} className="mx-auto mb-4 opacity-20" />
                      <p>لا توجد عمليات تطابق البحث</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>تاريخ الإضافة</th>
                  <th>رقم الهاتف</th>
                  <th>الرسالة</th>
                  <th>الحالة</th>
                  <th>تاريخ الإرسال</th>
                </tr>
              </thead>
              <tbody>
                {filteredWaLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="text-sm font-bold">
                        {log.createdAt ? new Date(log.createdAt?.seconds * 1000).toLocaleString('ar-EG') : 'غير متوفر'}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm" dir="ltr">{log.phone}</span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div className="text-sm truncate hover:whitespace-normal" title={log.message}>
                        {log.message}
                      </div>
                    </td>
                    <td>
                      <span className={`badge flex items-center w-fit ${getWaStatusBadge(log.status)}`}>
                        {getWaStatusIcon(log.status)}
                        <span className="mr-1">
                          {log.status === 'sent' ? 'تم الإرسال' : log.status === 'pending' ? 'بالانتظار' : 'فشل'}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-muted">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString('ar-EG') : '-'}
                      </div>
                      {log.error && (
                        <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={log.error}>
                          {log.error}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredWaLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-muted">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                      <p>لا توجد إشعارات واتساب مسجلة حتى الآن</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
