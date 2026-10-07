import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect } from 'react';
import { startVisiblePolling } from '../../utils/visiblePolling';
import { getActiveOrders, getActiveSalesOrders, getActiveMissions, getSmokingLogs, getGlobalSettings, saveSmokingLog, saveOrder, saveSalesOrder, saveMission, deleteMission, getEmployees, getTodayAttendanceLogs, saveAttendanceLog, getSupervisorReportsByDateRange } from '../../store';
import { CheckCircle2, AlertTriangle, Truck, Package, MessageSquare, Save, Activity, Clock, PlusCircle, Check, X, ClipboardList, ChefHat, ShieldCheck, Eye, Users, UserMinus, UserCheck, User, Calendar, ArrowUpDown, ArrowRight, ChevronDown } from 'lucide-react';
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
      const todayKey = toLocalDateKey();
      const [prodOrd, salesOrd, missions, sLogs, sysSettings, emps, aLogs, wReports] = await Promise.all([
        getActiveOrders(),
        getActiveSalesOrders(),
        getActiveMissions(),
        getSmokingLogs(),
        getGlobalSettings(),
        getEmployees(),
        getTodayAttendanceLogs(),
        getSupervisorReportsByDateRange(todayKey, todayKey)
      ]);
      setSettings(sysSettings);
      setEmployees(emps);
      
      const todayAttendance = aLogs;
      setAttendanceLogs(todayAttendance);

      // Combine Active Orders
      const activeSalesOrders = salesOrd.filter(o => !['تم التوصيل', 'تم التسليم للتوصيل', 'تم تسليمها للتوصيل', 'ملغي', 'مرفوض', 'منتهي'].includes(o.status));
      const activeProductionOrders = prodOrd.filter(o => {
        const isFinished = ['منتهي', 'ملغي', 'تم التسليم', 'تم التوصيل', 'تم التسليم للتوصيل', 'جاهز'].includes(o.status);
        return !isFinished;
      }).map(o => ({ ...o, isProduction: true }));
      
      const activeMissions = missions.filter(m => !['تم الإنجاز', 'ملغي'].includes(m.status)).map(m => ({
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
    return startVisiblePolling(fetchData, 180000);
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
            details: `توصيل تلقائي للطلبية رقم ${order.orderNumber} ${order.orderNotes ? '- ' + order.orderNotes : ''}`,
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
    <div className="p-3 md:p-8 animate-fade-in" style={{ backgroundColor: '#fcfcfd', minHeight: '100vh', paddingBottom: '120px', direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      
      {/* Header with Back button and overdue badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '8px 4px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBack && (
            <button 
              onClick={onBack} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0', 
                color: '#334155',
                cursor: 'pointer',
                outline: 'none'
              }}
              title="رجوع"
            >
              <ArrowRight size={20} />
            </button>
          )}
          <h2 style={{ fontSize: '18px', fontWeight: '850', color: '#1e293b', margin: 0 }}>التحكم المباشر</h2>
        </div>

        {smokingAreaStatus.isOverdue && (
          <div style={{ 
            backgroundColor: '#ef4444', 
            color: '#ffffff', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            padding: '4px 10px', 
            borderRadius: '12px',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)' 
          }}>
            مطلوب تحديث الحالة (كل يوم)
          </div>
        )}
      </div>

      {/* Smoking Area Widget - Food & Kitchen cleanliness */}
      <div className="mb-6" style={{ width: '100%' }}>
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '20px', 
          padding: '16px', 
          border: '1px solid #f1f5f9', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)', 
          direction: 'rtl', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}>
          
          {/* Header row: Gradient Icon on the Left (RTL end) & title on the Right (RTL start) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', padding: '2px', flexShrink: 0 }}>
                <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b' }}>
                  <ChefHat size={22} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: 0 }}>حالة منطقة الطعام والتدخين (اليوم)</h3>
              </div>
            </div>
          </div>

          {/* Two buttons side-by-side (lights up based on selected status) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* ممتاز / مثالي (Green Button) */}
            <button 
              onClick={handleQuickSave}
              type="button"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                height: '72px', 
                padding: '0 16px', 
                borderRadius: '16px', 
                border: isIdeal ? '2px solid #10b981' : '1.5px solid #e2e8f0', 
                backgroundColor: isIdeal ? '#effaf6' : '#ffffff', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: isIdeal ? '#15803d' : '#334155', fontWeight: '900', fontSize: '13px', marginBottom: '2px' }}>ممتاز / مثالي</div>
                <div style={{ color: isIdeal ? '#16a34a' : '#94a3b8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {isIdeal ? (
                    <>
                      <span>{latestLog?.userName || 'المدير'}</span>
                      {smokingAreaStatus.lastLogTime && (
                        <span style={{ fontSize: '9px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '2px' }} dir="ltr">
                          <Clock size={9} />
                          {smokingAreaStatus.lastLogTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' AM', ' ص').replace(' PM', ' م')}
                        </span>
                      )}
                    </>
                  ) : 'الوضع مثالي'}
                </div>
              </div>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: isIdeal ? '#10b981' : '#f1f5f9', 
                color: isIdeal ? '#ffffff' : '#94a3b8', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                border: isIdeal ? 'none' : '1px solid #e2e8f0'
              }}>
                <Check size={18} strokeWidth={3} />
              </div>
            </button>

            {/* مخالف (Red Button) */}
            <button 
              onClick={handleAddSmokingLog}
              type="button"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                height: '72px', 
                padding: '0 16px', 
                borderRadius: '16px', 
                border: isBad ? '2px solid #ef4444' : '1.5px solid #e2e8f0', 
                backgroundColor: isBad ? '#fef2f2' : '#ffffff', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: isBad ? '#dc2626' : '#334155', fontWeight: '900', fontSize: '13px', marginBottom: '2px' }}>مخالف</div>
                <div style={{ color: isBad ? '#ef4444' : '#94a3b8', fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {isBad ? (
                    <>
                      <span>{latestLog?.userName || 'المدير'}</span>
                      {smokingAreaStatus.lastLogTime && (
                        <span style={{ fontSize: '9px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '2px' }} dir="ltr">
                          <Clock size={9} />
                          {smokingAreaStatus.lastLogTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' AM', ' ص').replace(' PM', ' م')}
                        </span>
                      )}
                    </>
                  ) : 'يحتاج إلى تحسين'}
                </div>
              </div>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: isBad ? '#ef4444' : '#f1f5f9', 
                color: isBad ? '#ffffff' : '#94a3b8', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                border: isBad ? 'none' : '1px solid #e2e8f0'
              }}>
                <X size={18} strokeWidth={3} />
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Employee Attendance Tracking Widget */}
      <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] mb-6 relative overflow-hidden">
      {(() => {
        const filteredEmployees = employees.filter(e => {
          // Hide admin account itself, but show all other staff/employees
          if (String(e.id) === 'admin' || e.role === 'admin' || e.level === 'admin' || e.level === 'إدارة') return false;
          // Hide inactive, resigned, or terminated employees
          if (!isActiveEmployee(e)) return false;
          return true;
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


            {/* Counters Row - Compact Grid with dividers */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              border: '1px solid #f1f5f9', 
              padding: '10px 0', 
              marginBottom: '16px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.01)' 
            }}>
              {/* حضور */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#effaf6', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={12} />
                  </div>
                  حضور
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>{presentCount}</div>
              </div>

              {/* غياب */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e11d48', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserMinus size={12} />
                  </div>
                  غياب
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>{absentCount}</div>
              </div>

              {/* تأخير */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={12} />
                  </div>
                  تأخير
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>{lateCount}</div>
              </div>
            </div>

            {/* Employee Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredEmployees.map((employee, index) => {
                const currentLog = attendanceLogs.find(log => String(log.employeeId || '').trim() === String(employee.id || '').trim() || String(log.employeeName || '').trim() === String(employee.name || '').trim()) || {};
                const currentStatus = currentLog.status || '';
                const currentNotes = currentLog.notes || '';
                
                const isPresent = currentStatus === 'حضور' || currentStatus === 'حاضر متأخر' || currentStatus === 'تأخير';
                const isLate = currentStatus === 'تأخير' || currentStatus === 'حاضر متأخر';
                const isAbsent = currentStatus === 'غياب';
                
                return (
                  <div key={employee.id} style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.01)' }}>
                    
                    {/* Index & Name Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '8px', 
                        backgroundColor: '#1a8d9b', 
                        color: '#ffffff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{employee.name}</h4>
                    </div>
                    
                    {/* State Pills Buttons (Compact) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'حضور')}
                        type="button"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '4px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '11px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                          backgroundColor: isPresent ? '#effaf6' : '#ffffff',
                          color: isPresent ? '#16a34a' : '#94a3b8',
                          border: isPresent ? '1.5px solid #16a34a' : '1px solid #e2e8f0'
                        }}
                      >
                        <Check size={12} strokeWidth={3} /> حضور
                      </button>
                      
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'غياب')}
                        type="button"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '4px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '11px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                          backgroundColor: isAbsent ? '#fff1f2' : '#ffffff',
                          color: isAbsent ? '#e11d48' : '#94a3b8',
                          border: isAbsent ? '1.5px solid #e11d48' : '1px solid #e2e8f0'
                        }}
                      >
                        <X size={12} strokeWidth={3} /> غياب
                      </button>
                      
                      <button 
                        onClick={() => handleAttendanceChange(employee, 'تأخير')}
                        type="button"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '4px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '11px', 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                          backgroundColor: isLate ? '#fffbeb' : '#ffffff',
                          color: isLate ? '#d97706' : '#94a3b8',
                          border: isLate ? '1.5px solid #d97706' : '1px solid #e2e8f0'
                        }}
                      >
                        <Clock size={12} strokeWidth={2.5} /> تأخير
                      </button>
                    </div>

                    {/* Inline notes input or select dropdown */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                      {isAbsent ? (
                        <select 
                          value={currentNotes || ''}
                          onChange={(e) => {
                            handleAttendanceNotesChange(employee, e.target.value);
                          }}
                          style={{ 
                            width: '100%', 
                            backgroundColor: '#f8fafc', 
                            border: '1.5px solid #e2e8f0', 
                            borderRadius: '8px', 
                            padding: '8px 12px', 
                            fontSize: '11px', 
                            color: '#475569', 
                            outline: 'none', 
                            transition: 'all 0.2s',
                            boxSizing: 'border-box',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">اختر سبب الغياب...</option>
                          <option value="اجازة سنوية">اجازة سنوية</option>
                          <option value="اجازة غير مدفوعة">اجازة غير مدفوعة</option>
                          <option value="مغادرة عمل">مغادرة عمل</option>
                          <option value="مغادرة شخصية">مغادرة شخصية</option>
                          <option value="غياب بدون سبب">غياب بدون سبب</option>
                          <option value="مغادرة بدون سبب">مغادرة بدون سبب</option>
                        </select>
                      ) : (
                        <>
                          <input 
                            type="text" 
                            placeholder="يفضل أي معلومات إضافية"
                            defaultValue={currentNotes}
                            onBlur={(e) => {
                              if (e.target.value !== currentNotes) {
                                handleAttendanceNotesChange(employee, e.target.value);
                              }
                            }}
                            style={{ 
                              width: '100%', 
                              backgroundColor: '#f8fafc', 
                              border: '1.5px solid #e2e8f0', 
                              borderRadius: '8px', 
                              padding: '8px 12px 8px 36px', 
                              fontSize: '11px', 
                              color: '#475569', 
                              outline: 'none', 
                              transition: 'all 0.2s',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#1a8d9b'; }}
                          />
                          <div style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredEmployees.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                  <Users size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                  <p style={{ fontWeight: 'bold', margin: 0, fontSize: '13px' }}>لا يوجد موظفين مسجلين في عهدتك</p>
                </div>
              )}
            </div>

            {/* Centered Save Changes Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => {
                  MySwal.fire({ title: 'تم الحفظ', text: 'تم حفظ التغييرات بنجاح', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                }}
                type="button"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  backgroundColor: '#1a8d9b', 
                  color: '#ffffff', 
                  padding: '10px 28px', 
                  borderRadius: '10px', 
                  fontWeight: 'bold', 
                  fontSize: '13px', 
                  border: 'none', 
                  cursor: 'pointer', 
                  boxShadow: '0 2px 6px rgba(26, 141, 155, 0.2)',
                  outline: 'none' 
                }}
              >
                <span>حفظ التغييرات</span>
                <Save size={15} />
              </button>
            </div>
          </>
        );
      })()}
      </div>

      {/* Collapsible Live Orders Tracking for Admins/Supervisors */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #f1f5f9', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#475569', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} color="#1a8d9b" />
              <span>تحديث الحالة الفوري للطلبيات والإنتاج (للمسؤولين)</span>
            </div>
            <ChevronDown size={16} />
          </summary>
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table className="w-full text-right border-collapse bg-white rounded-lg overflow-hidden text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap w-12">#</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-right whitespace-nowrap">الزبون</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap">القسم المعني</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap">المسؤول</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap">الحالة الفورية</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap">آخر تحديث</th>
                  <th className="p-3 border-b border-slate-100 font-bold text-center whitespace-nowrap w-12"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const isStopped = order.executionStatus === 'متوقف' || order.status === 'متوقف';
                  const isLate = order.deliveryDate && new Date(order.deliveryDate) < new Date();
                  
                  const dept = order.isMission ? 'التوصيل' : (order.isProduction ? 'الإنتاج' : 'الطلبيات');
                  
                  const getDeptIcon = () => {
                    if (dept === 'الإنتاج') return <SewingMachineIcon size={16} />;
                    if (dept === 'التوصيل') return <Truck size={16} />;
                    if (dept === 'الطلبيات') return <ClipboardList size={16} />;
                    return <Package size={16} />;
                  };
                  
                  const getDeptStyle = () => {
                    if (dept === 'الإنتاج' || dept === 'المطبخ') return { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', icon: '#9333ea' };
                    if (dept === 'التوصيل') return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: '#2563eb' };
                    if (dept === 'الطلبيات') return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: '#16a34a' };
                    return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', icon: '#64748b' };
                  };
                  const deptStyle = getDeptStyle();

                  const getStatusStyle = (s) => {
                    const status = s || '';
                    if (['جاهز', 'جاهز للتسليم', 'جاهز للتوصيل', 'تم الإنجاز'].some(x => status.includes(x))) return { bg: '#f0fdf4', text: '#15803d', border: '#dcfce3' };
                    if (['قيد', 'متأخر', 'مستعجل', 'معلق'].some(x => status.includes(x))) return { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' };
                    if (['في الطريق', 'جديد', 'مؤكد', 'بانتظار'].some(x => status.includes(x))) return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' };
                    return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
                  };
                  const sStyle = getStatusStyle(order.status || order.executionStatus);

                  const person = order.lastActionBy || order.createdBy || order.userName || 'لم يتم اتخاذ إجراء';

                  return (
                    <tr key={order.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors bg-white ${isStopped ? 'bg-red-50' : ''} ${isLate && !isStopped ? 'bg-orange-50' : ''}`}>
                      <td className="p-3 font-bold text-slate-800 align-middle text-center">{String(index + 1).padStart(2, '0')}</td>
                      
                      <td className="p-3 align-middle text-right">
                        <div className="flex items-center justify-end font-bold text-slate-700 text-[14px]">
                          <span className="truncate max-w-[160px]">
                            {order.customerName || 'زبون غير محدد'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 align-middle text-center">
                        <div 
                          style={{ 
                            backgroundColor: deptStyle.bg, 
                            color: deptStyle.text, 
                            border: `1px solid ${deptStyle.border}`,
                            borderRadius: '6px',
                            width: '110px',
                            height: '32px'
                          }} 
                          className="flex items-center justify-center gap-1 mx-auto font-bold text-[12px]"
                        >
                          {dept} <span style={{ color: deptStyle.icon }}>{getDeptIcon()}</span>
                        </div>
                      </td>

                      <td className="p-3 align-middle text-center">
                        <div className="flex items-center justify-center">
                          <span className="font-bold text-slate-800 text-[13px]">{person}</span>
                        </div>
                      </td>

                      <td className="p-3 align-middle text-center relative">
                        <div className="relative mx-auto" style={{ width: '110px', height: '32px' }}>
                          <select 
                            style={{ 
                              backgroundColor: sStyle.bg, 
                              color: sStyle.text, 
                              border: `1px solid ${sStyle.border}`,
                              borderRadius: '6px',
                              WebkitAppearance: 'none',
                              MozAppearance: 'none',
                              appearance: 'none',
                              width: '110px',
                              height: '32px',
                              boxSizing: 'border-box'
                            }}
                            className="font-bold text-[12px] block px-1 text-center cursor-pointer outline-none transition-all m-0"
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

                      <td className="p-3 align-middle text-center">
                        <div className="text-slate-600 font-bold text-[12px] font-sans" dir="ltr">
                          <div>{new Date(order.updatedAt || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{new Date(order.updatedAt || new Date()).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        </div>
                      </td>

                      <td className="p-3 align-middle text-center">
                        <button 
                          onClick={() => handlePreviewOrder(order)}
                          className="p-1 text-slate-400 hover:text-primary transition-colors mx-auto cursor-pointer"
                          style={{ background: 'transparent', border: 'none', boxShadow: 'none', outline: 'none' }}
                          title="عرض التفاصيل"
                        >
                          <Eye size={20} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-slate-500 font-medium">لا يوجد طلبيات نشطة حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </div>

    </div>
  );
};

export default AdminLive;
