import React, { useState, useEffect } from 'react';
import { getOrders, getSalesOrders, getMissions, getSmokingLogs, getGlobalSettings, saveSmokingLog, saveOrder, saveSalesOrder, saveMission, deleteMission, getEmployees, getAttendanceLogs, saveAttendanceLog } from '../../store';
import { CheckCircle2, AlertTriangle, Truck, Package, MessageSquare, Save, Activity, Clock, PlusCircle, Check, X, ClipboardList, ChefHat, ShieldCheck, Eye, Users, UserMinus, UserCheck, User, Calendar , ArrowUpDown, ArrowRight} from 'lucide-react';
import SewingMachineIcon from '../../components/SewingMachineIcon';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const toLocalDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
};

const STATUS_OPTIONS = [
  'جديد', 'قيد الانتظار', 'قيد التنفيذ', 'قيد التجهيز', 'جاهز للتسليم', 'جاهز للتوصيل', 'في الطريق', 'تم التوصيل', 'تم التسليم', 'متوقف', 'مرفوض', 'منتهي', 'تم الإنجاز',
  'ممتاز', 'جيد', 'تنبيه'
];

const AdminLive = ({ user, onBack }) => {
  const [orders, setOrders] = useState([]);
  const [smokingAreaStatus, setSmokingAreaStatus] = useState({ status: 'unknown', logs: [], lastLogTime: null, isOverdue: false });
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [prodOrd, salesOrd, missions, sLogs, sysSettings, emps, aLogs] = await Promise.all([
        getOrders(),
        getSalesOrders(),
        getMissions(),
        getSmokingLogs(),
        getGlobalSettings(),
        getEmployees(),
        getAttendanceLogs()
      ]);
      setSettings(sysSettings);
      setEmployees(emps);

      const todayKey = toLocalDateKey();
      
      const todayAttendance = aLogs.filter(log => log.date === todayKey);
      setAttendanceLogs(todayAttendance);

      // Combine Active Orders
      const activeSalesOrders = salesOrd.filter(o => !['تم التوصيل', 'ملغي', 'مرفوض', 'منتهي'].includes(o.status));
      const activeProductionOrders = prodOrd.filter(o => o.status !== 'منتهي').map(o => ({ ...o, isProduction: true }));
      const activeMissions = missions.filter(m => m.status !== 'تم الإنجاز').map(m => ({
        ...m,
        isMission: true,
        orderNumber: 'توصيل', 
        customerName: m.targetEntity || m.type,
        currentDepartment: 'التوصيل',
        executionStatus: m.status
      }));
      
      setOrders([...activeSalesOrders, ...activeProductionOrders, ...activeMissions].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));

      // Smoking Area Logs
      const todayLogs = sLogs.filter(log => toLocalDateKey(log.timestamp) === todayKey);
      todayLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

      let status = 'unknown';
      let lastLogTime = null;
      let isOverdue = true;

      if (todayLogs.length > 0) {
        const latest = todayLogs[0];
        lastLogTime = new Date(latest.timestamp);
        const hoursSinceLast = (new Date() - lastLogTime) / (1000 * 60 * 60);
        isOverdue = hoursSinceLast >= 2;

        if (latest.status === 'ممتاز ومثالي') {
          status = 'good';
        } else {
          status = 'warning';
        }
      }

      setSmokingAreaStatus({ status, logs: todayLogs, lastLogTime, isOverdue });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching live data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchData();
    const intervalId = window.setInterval(fetchData, 30000); // refresh every 30s
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleUpdateOrderField = async (orderId, field, value) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedOrder = { ...order, [field]: value };
    setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
    
    try {
      if (order.isMission) {
        await saveMission({ ...updatedOrder, status: field === 'status' || field === 'executionStatus' ? value : updatedOrder.status, lastActionBy: user?.name || 'المدير' });
      } else if (order.isProduction) {
        if (field === 'status' || field === 'executionStatus') {
           updatedOrder.status = value;
           updatedOrder.executionStatus = value;
        }
        await saveOrder({ ...updatedOrder, lastActionBy: user?.name || 'المدير' });
      } else {
        if (field === 'status') {
           if ((order.status === 'تم التسليم للتوصيل' || order.status === 'تم تسليمها للتوصيل' || order.status === 'جاهز للتوصيل') && 
               (value !== 'تم التسليم للتوصيل' && value !== 'تم تسليمها للتوصيل' && value !== 'جاهز للتوصيل')) {
             const allMissions = await getMissions();
             const linkedMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);
             if (linkedMission) {
               if (linkedMission.status !== 'بانتظار الاستلام') {
                 MySwal.fire('خطأ', 'لقد قام قسم التوصيل باستلام الطلبية والبدء بها، لا يمكنك التراجع.', 'error');
                 fetchData();
                 return;
               } else {
                 await deleteMission(linkedMission.id);
               }
             }
           }
           await checkAndCreateMission(updatedOrder, value);
        }
        await saveSalesOrder({ ...updatedOrder, lastActionBy: user?.name || 'المدير' });
      }
      fetchData(); // Refresh screen automatically instead of showing notification
    } catch (e) {
      MySwal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const checkAndCreateMission = async (order, newStatus) => {
    if (newStatus === 'تم التسليم للتوصيل' || newStatus === 'تم تسليمها للتوصيل' || newStatus === 'جاهز للتوصيل') {
      try {
        const allMissions = await getMissions();
        const existingMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);
        
        if (!existingMission) {
          const maxNum = allMissions.reduce((max, o) => {
            const str = String(o.missionNumber || '');
            if (str.startsWith('DEL-')) {
              const match = str.match(/DEL-(\d+)/);
              return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }
            return max;
          }, 0);
          const nextMissionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;
          
          await saveMission({
            id: null,
            missionNumber: nextMissionNumber,
            type: 'تسليم طلبية',
            customType: '',
            sourceEntity: 'مرجاس للتجارة - قسم البياضات',
            targetEntity: order.customerName || '',
            details: `توصيل تلقائي لطلبية المبيعات رقم ${order.orderNumber} ${order.orderNotes ? '- ' + order.orderNotes : ''}`,
            assignedEmployeeId: '',
            assignedEmployeeName: '',
            dueDate: toLocalDateKey(),
            status: 'بانتظار الاستلام',
            salesOrderNumber: order.orderNumber
          });
        }
      } catch (err) {
        console.error("Error creating mission for sales order:", err);
      }
    }
  };

  const handleAddSmokingLog = async () => {
    const log = {
      userId: user?.id || 'admin',
      userName: user?.name || 'المدير',
      status: 'مخالف',
      reasons: [],
      notes: '',
      date: toLocalDateKey()
    };
    
    await saveSmokingLog(log);
    MySwal.fire({ title: 'تم الحفظ', text: 'تم تسجيل الحالة كـ مخالف بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    fetchData(); // Refresh
  };

  const handleQuickSave = async () => {
    const log = {
      userId: user?.id || 'admin',
      userName: user?.name || 'المدير',
      status: 'ممتاز ومثالي',
      reasons: [],
      notes: '',
      date: toLocalDateKey()
    };
    await saveSmokingLog(log);
    MySwal.fire({ title: 'تم الحفظ', text: 'تم تسجيل الحالة بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    fetchData(); // Refresh
  };

  const handleAttendanceChange = async (employee, clickedStatus) => {
    const todayKey = toLocalDateKey();
    const updatedLogs = [...attendanceLogs];
    const existingIndex = updatedLogs.findIndex(log => String(log.employeeId || '').trim() === String(employee.id || '').trim() || String(log.employeeName || '').trim() === String(employee.name || '').trim());
    
    const existingLog = existingIndex >= 0 ? updatedLogs[existingIndex] : {};
    const currentStatus = existingLog.status || '';

    let newStatus = clickedStatus;
    if (clickedStatus === 'تأخير') {
       if (currentStatus === 'حضور') newStatus = 'حاضر متأخر';
       else if (currentStatus === 'حاضر متأخر') newStatus = 'حضور';
       else newStatus = 'تأخير';
    } else if (clickedStatus === 'حضور') {
       if (currentStatus === 'تأخير' || currentStatus === 'حاضر متأخر') newStatus = 'حاضر متأخر';
       else newStatus = 'حضور';
    } else if (clickedStatus === 'غياب') {
       newStatus = 'غياب';
    }

    const newLog = {
      ...existingLog,
      employeeId: employee.id,
      employeeName: employee.name,
      status: newStatus,
      date: todayKey
    };
    
    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = newLog;
    } else {
      updatedLogs.push(newLog);
    }
    setAttendanceLogs(updatedLogs);
    
    await saveAttendanceLog(newLog);
    MySwal.fire({ title: 'تم الحفظ', text: `تم تسجيل الحالة لـ ${employee.name}`, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
  };

  const handleAttendanceNotesChange = async (employee, notes) => {
    const todayKey = toLocalDateKey();
    const updatedLogs = [...attendanceLogs];
    const existingIndex = updatedLogs.findIndex(log => String(log.employeeId || '').trim() === String(employee.id || '').trim() || String(log.employeeName || '').trim() === String(employee.name || '').trim());
    
    const existingLog = existingIndex >= 0 ? updatedLogs[existingIndex] : {};
    const newLog = {
      ...existingLog,
      employeeId: employee.id,
      employeeName: employee.name,
      notes: notes,
      date: todayKey,
      status: existingLog.status || ''
    };
    
    if (existingIndex >= 0) {
      updatedLogs[existingIndex] = newLog;
    } else {
      updatedLogs.push(newLog);
    }
    setAttendanceLogs(updatedLogs);
    
    await saveAttendanceLog(newLog);
  };

  const handlePreviewOrder = (order) => {
    MySwal.fire({
      title: `تفاصيل ${order.isMission ? 'مهمة التوصيل' : 'الطلبية'}`,
      html: `
        <div style="text-align: right; direction: rtl; font-size: 14px; line-height: 1.8;">
          <p><strong>الرقم:</strong> ${order.orderNumber || 'غير متوفر'}</p>
          <p><strong>اسم الزبون:</strong> ${order.customerName || 'غير متوفر'}</p>
          <p><strong>القسم المعني:</strong> ${order.isMission ? 'التوصيل' : (order.currentDepartment || 'الإنتاج')}</p>
          <p><strong>الحالة الفورية:</strong> <span class="font-bold text-primary">${order.status || 'غير محدد'}</span></p>
          <p><strong>المسؤول الأخير:</strong> ${order.lastActionBy || 'لم يتم تحديثها بعد'}</p>
          <p><strong>وقت الطلب:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : 'غير محدد'}</p>
        </div>
      `,
      confirmButtonText: 'إغلاق',
      confirmButtonColor: '#0ea5e9'
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="loading-spinner" /></div>;
  }

  const latestLog = smokingAreaStatus.logs && smokingAreaStatus.logs.length > 0 ? smokingAreaStatus.logs[0] : null;
  const isIdeal = latestLog?.status === 'ممتاز ومثالي' || latestLog?.status === 'ممتاز / مثالي';
  const isBad = latestLog?.status === 'مخالف';

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#fcfcfd', minHeight: '100vh', direction: 'rtl' }}>
      
      {/* Header */}
      <div className="flex items-center justify-start gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <h2 className="text-xl font-bold text-slate-800 m-0">التحكم المباشر</h2>
      </div>

      {/* Live Orders Tracking */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Package size={20} className="text-primary" /> تحديث الحالة الفوري للطلبيات والإنتاج
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse bg-white rounded-lg overflow-hidden text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap w-16">#</th>
                <th className="p-4 border-b border-slate-100 font-bold text-right whitespace-nowrap">الزبون</th>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap">القسم المعني</th>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap">المسؤول</th>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap">الحالة الفورية</th>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap">آخر تحديث</th>
                <th className="p-4 border-b border-slate-100 font-bold text-center whitespace-nowrap w-16"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const isStopped = order.executionStatus === 'متوقف' || order.status === 'متوقف';
                const isLate = order.deliveryDate && new Date(order.deliveryDate) < new Date();
                
                const dept = order.isMission ? 'التوصيل' : (order.isProduction ? 'الإنتاج' : 'الطلبيات');
                
                const getDeptIcon = () => {
                  if (dept === 'الإنتاج') return (
                    <SewingMachineIcon size={18} />
                  );
                  if (dept === 'التوصيل') return <Truck size={18} />;
                  if (dept === 'الطلبيات') return <ClipboardList size={18} />;
                  return <ClipboardList size={18} />;
                };
                
                const getDeptStyle = () => {
                  if (dept === 'الإنتاج' || dept === 'المطبخ') return { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', icon: '#9333ea' }; // Purple
                  if (dept === 'التوصيل') return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: '#2563eb' }; // Blue
                  if (dept === 'الطلبيات') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: '#16a34a' }; // Green
                  return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', icon: '#64748b' }; // Gray
                };
                const deptStyle = getDeptStyle();

                const getStatusStyle = (s) => {
                  const status = s || '';
                  if (['جاهز', 'جاهز للتسليم', 'جاهز للتوصيل', 'تم الإنجاز'].some(x => status.includes(x))) return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce3' }; // green
                  if (['قيد', 'متأخر', 'مستعجل'].some(x => status.includes(x))) return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' }; // orange
                  if (['في الطريق', 'جديد', 'مؤكد', 'بانتظار'].some(x => status.includes(x))) return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' }; // blue
                  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }; // gray
                };
                const sStyle = getStatusStyle(order.status || order.executionStatus);

                const person = order.lastActionBy || order.createdBy || order.userName || 'لم يتم اتخاذ إجراء';

                return (
                  <tr key={order.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors bg-white ${isStopped ? 'bg-red-50' : ''} ${isLate && !isStopped ? 'bg-orange-50' : ''}`}>
                    <td className="p-4 font-bold text-slate-800 align-middle text-center">{String(index + 1).padStart(2, '0')}</td>
                    
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end font-bold text-slate-700 text-[15px]">
                        <span className="truncate max-w-[200px]">
                          {order.customerName || 'زبون غير محدد'}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 align-middle text-center">
                      <div 
                        style={{ 
                          backgroundColor: deptStyle.bg, 
                          color: deptStyle.text, 
                          border: `1px solid ${deptStyle.border}`,
                          borderRadius: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          width: '130px',
                          height: '36px',
                          boxSizing: 'border-box'
                        }} 
                        className="flex items-center justify-center gap-1.5 mx-auto font-bold text-[13px]"
                      >
                        {dept} <span style={{ color: deptStyle.icon }}>{getDeptIcon()}</span>
                      </div>
                    </td>

                    <td className="p-4 align-middle text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-bold text-slate-800 text-[16px]">{person}</span>
                      </div>
                    </td>

                    <td className="p-4 align-middle text-center relative">
                      <div className="relative mx-auto" style={{ width: '130px', height: '36px' }}>
                        <select 
                          style={{ 
                            backgroundColor: sStyle.bg, 
                            color: sStyle.text, 
                            border: `1px solid ${sStyle.border}`,
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            width: '130px',
                            height: '36px',
                            boxSizing: 'border-box'
                          }}
                          className="font-bold text-[13px] block px-2 text-center cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 transition-all m-0"
                          value={order.status || order.executionStatus || ''}
                          onChange={(e) => handleUpdateOrderField(order.id, 'status', e.target.value)}
                        >
                          <option value="">اختر حالة...</option>
                          <option value={order.status}>{order.status}</option>
                          {order.executionStatus && order.executionStatus !== order.status && <option value={order.executionStatus}>{order.executionStatus}</option>}
                          <option disabled>───────</option>
                          {dept === 'التوصيل' && (settings?.missionStatuses || []).map(opt => <option key={opt.name || opt} value={opt.name || opt}>{opt.name || opt}</option>)}
                          {dept === 'الإنتاج' && (settings?.productionStatuses || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          {dept === 'الطلبيات' && (settings?.salesStatuses || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          {!['التوصيل', 'الإنتاج', 'الطلبيات'].includes(dept) && STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </td>

                    <td className="p-4 align-middle text-center">
                      <div className="text-slate-600 font-bold text-[13px]">
                        <div>{new Date(order.updatedAt || new Date()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{new Date(order.updatedAt || new Date()).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                    </td>

                    <td className="p-4 align-middle text-center">
                      <button 
                        onClick={() => handlePreviewOrder(order)}
                        className="p-2 text-slate-500 hover:text-primary transition-colors mx-auto cursor-pointer"
                        style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                        title="عرض التفاصيل"
                      >
                        <Eye size={24} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-slate-500 font-medium">لا يوجد طلبيات نشطة حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4 flex items-center gap-1 font-medium bg-slate-50 p-2 rounded-lg inline-flex">
          <MessageSquare size={14} className="text-primary" /> تعديل الحالة هنا ينعكس فورا على النظام كاملاً
        </p>
      </div>

      {/* Smoking Area Widget */}
      <div className="mb-8" style={{ width: '100%' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,0.03)', direction: 'rtl', gap: '24px', position: 'relative' }}>
          
          {smokingAreaStatus.isOverdue && (
            <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderBottomLeftRadius: '8px' }}>
              مطلوب تحديث الحالة (تجاوز ساعتين)
            </div>
          )}

          {/* Right section: Text & Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'linear-gradient(to top right, #3b82f6, #a855f7, #ec4899)', padding: '3px', flexShrink: 0 }}>
              <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="38" height="38" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 14h10" />
                  <path d="M5 14c0-2.76 2.24-5 5-5s5 2.24 5 5" />
                  <path d="M10 9V7" />
                  <rect x="13" y="17" width="8" height="4" rx="1" />
                  <path d="M13 17h-4c-1.1 0-2 .9-2 2s.9 2 2 2h4" />
                  <path d="M19 13c0-1.5 1-2 1-3s-1-1.5-1-3" />
                  <path d="M17 13c0-1 1-1.5 1-2" />
                </svg>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>حالة منطقة الطعام والتدخين (اليوم)</h3>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', margin: '0 0 8px 0' }}>تحديث الحالة الحالية لمنطقة اليوم</p>
              {smokingAreaStatus.lastLogTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>
                  <Clock size={12} /> آخر تحديث: <span dir="ltr" style={{ display: 'inline-block', marginLeft: '4px' }}>{smokingAreaStatus.lastLogTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' AM', ' ص').replace(' PM', ' م')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Left section: Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            {/* Green Button */}
            <button 
              onClick={handleQuickSave}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '250px', height: '84px', padding: '0 20px', borderRadius: '16px', border: isIdeal ? '2px solid #10b981' : '1px solid #e2e8f0', backgroundColor: isIdeal ? '#ecfdf5' : '#fff', opacity: (latestLog && !isIdeal) ? 0.6 : 1, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { if(!isIdeal) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseOut={(e) => { if(!isIdeal) e.currentTarget.style.backgroundColor = '#fff'; }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: isIdeal ? '#15803d' : '#64748b', fontWeight: '900', fontSize: '1.25rem', marginBottom: '4px' }}>ممتاز / مثالي</div>
                <div style={{ color: isIdeal ? '#16a34a' : '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>
                  {isIdeal ? `${latestLog.userName} - ${new Date(latestLog.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : 'الوضع مثالي'}
                </div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isIdeal ? '#10b981' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={28} strokeWidth={3} />
              </div>
            </button>

            {/* Red Button */}
            <button 
              onClick={handleAddSmokingLog}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '250px', height: '84px', padding: '0 20px', borderRadius: '16px', border: isBad || smokingAreaStatus.isOverdue ? '2px solid #ef4444' : '1px solid #e2e8f0', backgroundColor: isBad ? '#fef2f2' : '#fff', opacity: (latestLog && !isBad && !smokingAreaStatus.isOverdue) ? 0.6 : 1, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { if(!isBad) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseOut={(e) => { if(!isBad) e.currentTarget.style.backgroundColor = '#fff'; }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: isBad ? '#dc2626' : '#64748b', fontWeight: '900', fontSize: '1.25rem', marginBottom: '4px' }}>مخالف</div>
                <div style={{ color: isBad ? '#ef4444' : '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>
                  {isBad ? `${latestLog.userName} - ${new Date(latestLog.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : 'يحتاج إلى تحسين'}
                </div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isBad ? '#ef4444' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={28} strokeWidth={3} />
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Employee Attendance Tracking */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-8 relative overflow-hidden">
      {(() => {
        const filteredEmployees = employees.filter(e => {
          const isCurrentUserAdmin = user && (user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin');
          
          if (isCurrentUserAdmin) {
            // Admin sees everyone except top admin accounts
            if (String(e.id) === 'admin' || e.role === 'admin' || e.level === 'admin' || e.level === 'إدارة') return false;
            return true;
          } else {
            // Supervisor sees themselves AND only assigned employees
            if (String(e.id).trim() === String(user?.id).trim()) return true;
            
            const currentUserId = String(user?.id).trim();
            const currentUserData = employees.find(emp => String(emp.id).trim() === currentUserId) || user;
            
            // If they have assigned employees, ONLY show those assigned employees
            if (currentUserData && currentUserData.assignedEmployees && currentUserData.assignedEmployees.length > 0) {
              const assignedIds = currentUserData.assignedEmployees.map(id => String(id).trim());
              return assignedIds.includes(String(e.id).trim());
            }
            
            // If they have no assigned employees, fallback to showing all non-supervisors/admins
            if (e.role === 'admin' || e.level === 'admin' || e.level === 'إدارة' || e.level === 'supervisor' || e.level === 'مشرف' || e.level === 'مشرف قسم') return false;
            
            return true;
          }
        });

        const presentCount = filteredEmployees.filter(e => {
           const s = attendanceLogs.find(l => String(l.employeeId || '').trim() === String(e.id || '').trim() || String(l.employeeName || '').trim() === String(e.name || '').trim())?.status;
           return s === 'حضور' || s === 'تأخير' || s === 'حاضر متأخر';
        }).length;
        const absentCount = filteredEmployees.filter(e => attendanceLogs.find(l => String(l.employeeId || '').trim() === String(e.id || '').trim() || String(l.employeeName || '').trim() === String(e.name || '').trim())?.status === 'غياب').length;
        const lateCount = filteredEmployees.filter(e => {
           const s = attendanceLogs.find(l => String(l.employeeId || '').trim() === String(e.id || '').trim() || String(l.employeeName || '').trim() === String(e.name || '').trim())?.status;
           return s === 'تأخير' || s === 'حاضر متأخر';
        }).length;

        return (
          <>
            {/* Top Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
              
              <div style={{ textAlign: 'right', flex: 1, display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', margin: '0' }}>
                  <div style={{ padding: '10px', backgroundColor: '#eef2ff', color: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={22} strokeWidth={2.5} />
                  </div>
                  متابعة حضور الموظفين
                </h3>


              </div>
              
            </div>

            {/* Counters */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4', padding: '0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #dcfce3', minWidth: '120px' }}>
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>حضور <UserCheck size={14}/></div>
                <div style={{ color: '#16a34a', fontWeight: '900', fontSize: '22px' }}>{presentCount}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb', padding: '0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #fef3c7', minWidth: '120px' }}>
                <div style={{ color: '#d97706', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>غياب <UserMinus size={14}/></div>
                <div style={{ color: '#d97706', fontWeight: '900', fontSize: '22px' }}>{absentCount}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', padding: '0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #ffe4e6', minWidth: '120px' }}>
                <div style={{ color: '#e11d48', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>تأخير <Clock size={14}/></div>
                <div style={{ color: '#e11d48', fontWeight: '900', fontSize: '22px' }}>{lateCount}</div>
              </div>
            </div>

            {/* Employee Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEmployees.map((employee, index) => {
                const currentLog = attendanceLogs.find(log => String(log.employeeId || '').trim() === String(employee.id || '').trim() || String(log.employeeName || '').trim() === String(employee.name || '').trim()) || {};
                const currentStatus = currentLog.status || '';
                const currentNotes = currentLog.notes || '';
                
                const isPresent = currentStatus === 'حضور' || currentStatus === 'حاضر متأخر' || currentStatus === 'تأخير';
                const isLate = currentStatus === 'تأخير' || currentStatus === 'حاضر متأخر';
                const isAbsent = currentStatus === 'غياب';
                
                return (
                  <div key={employee.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', transition: 'box-shadow 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                    {/* Employee Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '900', color: '#334155', fontSize: '15px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={18} strokeWidth={2} />
                      </div>
                      {employee.name}
                    </div>
                    
                    {/* Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'حضور')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s', cursor: 'pointer',
                          backgroundColor: isPresent ? '#dcfce3' : '#f8fafc',
                          color: isPresent ? '#16a34a' : '#64748b',
                          border: isPresent ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                        }}
                      >
                        <Check size={16} strokeWidth={2.5} /> حضور
                      </button>
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'غياب')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s', cursor: 'pointer',
                          backgroundColor: isAbsent ? '#f1f5f9' : '#ffffff',
                          color: isAbsent ? '#334155' : '#94a3b8',
                          border: isAbsent ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
                        }}
                      >
                        <X size={16} strokeWidth={2.5} /> غياب
                      </button>
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'تأخير')}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s', cursor: 'pointer',
                          backgroundColor: isLate ? '#fef3c7' : '#ffffff',
                          color: isLate ? '#d97706' : '#94a3b8',
                          border: isLate ? '1px solid #fde68a' : '1px solid #e2e8f0'
                        }}
                      >
                        <Clock size={16} strokeWidth={2.5} /> تأخير
                      </button>
                    </div>

                    {/* Notes */}
                    {(isLate || isAbsent) ? (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ position: 'absolute', right: '16px', color: '#94a3b8' }}>
                          <MessageSquare size={16} />
                        </div>
                        <input 
                          type="text" 
                          placeholder={isLate ? "اكتب سبب التأخير هنا..." : "اكتب سبب الغياب هنا..."}
                          defaultValue={currentNotes}
                          onBlur={(e) => {
                            if (e.target.value !== currentNotes) {
                              handleAttendanceNotesChange(employee, e.target.value);
                            }
                          }}
                          style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 40px 12px 16px', fontSize: '13px', color: '#475569', outline: 'none', transition: 'all 0.2s' }}
                          onFocus={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 1px #818cf8'; }}
                        />
                      </div>
                    ) : (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', opacity: 0.5, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', right: '16px', color: '#cbd5e1' }}>
                          <MessageSquare size={16} />
                        </div>
                        <input 
                          type="text" 
                          disabled
                          placeholder="لا يتطلب أي معلومات إضافية"
                          style={{ width: '100%', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 40px 12px 16px', fontSize: '13px', color: '#94a3b8', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredEmployees.length === 0 && (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                  <Users size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
                  <p style={{ fontWeight: 'bold', margin: 0, fontSize: '16px' }}>لا يوجد موظفين مسجلين في عهدتك</p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem', paddingBottom: '100px' }}>
              <button 
                onClick={() => {
                  MySwal.fire({ title: 'تم الحفظ', text: 'تم حفظ التغييرات بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#4f46e5', color: '#ffffff', padding: '12px 40px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4338ca'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#4f46e5'}
              >
                حفظ التغييرات
                <Save size={18} />
              </button>
            </div>
          </>
        );
      })()}
      </div>

    </div>
  );
};

export default AdminLive;
