import { isActiveEmployee } from '../../utils/employeeStatus';
import { useEffect, useMemo, useState } from 'react';
import { Archive, BellRing, CheckCircle2, ChevronDown, Clock3, RefreshCw, Send, Trash2, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { archiveEmployeeAlert, createEmployeeAlerts, deleteEmployeeAlert, getEmployeeAlerts, getEmployees } from '../../store';
import Select from '../../components/SearchSelect';
import HRDateFilter from '../../components/ui/HRDateFilter';
import { hasPermission } from '../../utils/permissions';

const localDate = date => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
};

const formatDateTime = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day}/${month}/${year} ${time}`;
};

export default function HREmployeeAlerts({ user, refreshCounts }) {
  const canAdd = hasPermission(user, 'hr_employee_alerts', 'add') || hasPermission(user, 'hr_employee_alerts', 'create');
  const canEdit = hasPermission(user, 'hr_employee_alerts', 'edit');
  const canDelete = hasPermission(user, 'hr_employee_alerts', 'delete');

  const [alerts, setAlerts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(localDate(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(localDate(new Date()).slice(0, 7));
  const [dateFrom, setDateFrom] = useState(localDate(new Date()));
  const [dateTo, setDateTo] = useState(localDate(new Date()));
  const [employeeId, setEmployeeId] = useState('all');
  const [status, setStatus] = useState('pending');
  const [showArchived, setShowArchived] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [alertRows, employeeRows] = await Promise.all([getEmployeeAlerts(), getEmployees()]);
      setAlerts(alertRows);
      setEmployees(employeeRows.filter(isActiveEmployee));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => alerts.filter(alert => {
    if (!showArchived && alert.archived) return false;
    if (employeeId !== 'all' && String(alert.employeeId) !== employeeId) return false;
    if (status !== 'all' && alert.status !== status) return false;
    const sentDate = localDate(alert.sentAt);
    if (dateMode === 'day' && sentDate !== selectedDate) return false;
    if (dateMode === 'month' && !sentDate.startsWith(selectedMonth)) return false;
    if (dateMode === 'range' && (sentDate < dateFrom || sentDate > dateTo)) return false;
    return true;
  }), [alerts, showArchived, employeeId, status, dateMode, selectedDate, selectedMonth, dateFrom, dateTo]);

  const archive = async alert => {
    if (!canEdit) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية أرشفة التنبيهات.', 'warning');
    }
    const result = await Swal.fire({ icon: 'question', title: 'أرشفة التنبيه؟', text: 'سيبقى محفوظًا ويمكن عرضه من خيار إظهار المؤرشف.', showCancelButton: true, confirmButtonText: 'أرشفة', cancelButtonText: 'إلغاء', confirmButtonColor: '#64748b' });
    if (!result.isConfirmed) return;
    try { await archiveEmployeeAlert(alert.id, user); await load(); refreshCounts?.(); }
    catch (error) { Swal.fire('تعذر الأرشفة', error.message, 'error'); }
  };

  const removePendingAlert = async alert => {
    if (!canDelete) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية حذف أو سحب التنبيهات.', 'warning');
    }
    const result = await Swal.fire({
      icon: 'warning',
      title: 'سحب وحذف التنبيه؟',
      text: `لن يظهر هذا التنبيه للموظف ${String(alert.employeeName || '')} بعد الحذف.`,
      showCancelButton: true,
      confirmButtonText: 'نعم، اسحب التنبيه',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#dc2626'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteEmployeeAlert(alert.id);
      await load(); refreshCounts?.();
      await Swal.fire({ icon: 'success', title: 'تم سحب التنبيه', timer: 1300, showConfirmButton: false });
    } catch (error) {
      Swal.fire('تعذر حذف التنبيه', error.message || 'حدث خطأ أثناء الحذف.', 'error');
    }
  };

  const sendNewAlert = async () => {
    if (!canAdd) {
      return Swal.fire('غير مصرح', 'ليس لديك صلاحية إرسال تنبيهات جديدة.', 'warning');
    }
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const sortedEmployees = [...employees].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const employeeOptions = sortedEmployees.map(employee => `<label class="direct-alert-person" data-search="${escapeHtml(`${employee.name || ''} ${employee.id}`.toLowerCase())}" style="display:flex;align-items:center;gap:9px;padding:8px 10px;border-bottom:1px solid #f1f5f9;cursor:pointer"><input class="direct-alert-employee" type="checkbox" value="${escapeHtml(employee.id)}"><span><strong>${escapeHtml(employee.name)}</strong> <small style="color:#64748b">— ${escapeHtml(employee.id)}</small></span></label>`).join('');
    const result = await Swal.fire({
      title: 'إرسال تنبيه جديد',
      width: 680,
      html: `<div dir="rtl" style="display:grid;gap:14px;text-align:right">
        <div><div style="font-weight:900;margin-bottom:8px">المستلمون</div><div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:9px;cursor:pointer"><input type="radio" name="direct-alert-mode" value="all" checked> تعميم على الجميع</label>
          <label style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:9px;cursor:pointer"><input type="radio" name="direct-alert-mode" value="exclude"> الجميع ما عدا...</label>
          <label style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:9px;cursor:pointer"><input type="radio" name="direct-alert-mode" value="include"> موظفون محددون</label>
        </div></div>
        <div id="direct-alert-picker" style="display:none"><input id="direct-alert-search" class="swal2-input" style="width:100%;margin:0 0 7px;height:42px" placeholder="ابحث بالاسم أو الرقم..."><div id="direct-alert-people" style="max-height:190px;overflow:auto;border:1px solid #e2e8f0;border-radius:10px">${employeeOptions}</div><small id="direct-alert-selection-summary" style="display:block;margin-top:6px;color:#64748b;font-weight:700">لم يتم تحديد أي موظف</small></div>
        <label style="font-weight:800">نص التنبيه<textarea id="direct-alert-message" class="swal2-textarea" style="width:100%;margin:6px 0 0;min-height:130px" placeholder="اكتب الملاحظة التي تريد إرسالها..."></textarea></label>
      </div>`,
      showCancelButton: true,
      confirmButtonText: 'إرسال التنبيه',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ea580c',
      didOpen: () => {
        const picker = document.getElementById('direct-alert-picker');
        const summary = document.getElementById('direct-alert-selection-summary');
        const checkboxes = [...document.querySelectorAll('.direct-alert-employee')];
        const updatePicker = () => {
          const mode = document.querySelector('input[name="direct-alert-mode"]:checked')?.value;
          picker.style.display = mode === 'all' ? 'none' : 'block';
          const count = checkboxes.filter(input => input.checked).length;
          summary.textContent = count ? `تم تحديد ${count} موظف` : (mode === 'exclude' ? 'لم يتم استثناء أي موظف' : 'لم يتم تحديد أي موظف');
        };
        document.querySelectorAll('input[name="direct-alert-mode"]').forEach(input => input.addEventListener('change', updatePicker));
        checkboxes.forEach(input => input.addEventListener('change', updatePicker));
        document.getElementById('direct-alert-search')?.addEventListener('input', event => {
          const query = event.target.value.trim().toLowerCase();
          document.querySelectorAll('.direct-alert-person').forEach(row => { row.style.display = row.dataset.search.includes(query) ? 'flex' : 'none'; });
        });
        updatePicker();
      },
      preConfirm: () => {
        const mode = document.querySelector('input[name="direct-alert-mode"]:checked')?.value || 'all';
        const selectedIds = [...document.querySelectorAll('.direct-alert-employee:checked')].map(input => input.value);
        const message = document.getElementById('direct-alert-message')?.value.trim() || '';
        if (mode === 'include' && !selectedIds.length) return Swal.showValidationMessage('حدد موظفًا واحدًا على الأقل');
        if (!message) return Swal.showValidationMessage('أدخل نص التنبيه');
        return { mode, selectedIds, message };
      }
    });
    if (!result.isConfirmed) return;
    const selectedSet = new Set(result.value.selectedIds.map(String));
    const recipients = result.value.mode === 'all'
      ? sortedEmployees
      : result.value.mode === 'exclude'
        ? sortedEmployees.filter(employee => !selectedSet.has(String(employee.id)))
        : sortedEmployees.filter(employee => selectedSet.has(String(employee.id)));
    if (!recipients.length) return Swal.fire('لا يوجد مستلمون', 'الاختيارات الحالية لا تتضمن أي موظف.', 'warning');
    try {
      await createEmployeeAlerts({ employees: recipients, message: result.value.message, source: 'تنبيه إداري مباشر', sentById: user?.id || '', sentByName: user?.name || 'الإدارة' });
      await load(); refreshCounts?.();
      await Swal.fire({ icon: 'success', title: 'تم إرسال التنبيه', text: `سيظهر التنبيه لدى ${recipients.length} موظف عند فتح التطبيق.`, confirmButtonColor: '#0f8b8d' });
    } catch (error) { Swal.fire('تعذر الإرسال', error.message || 'حدث خطأ أثناء إرسال التنبيه.', 'error'); }
  };

  const pendingCount = alerts.filter(alert => !alert.archived && alert.status === 'pending').length;
  const receivedCount = alerts.filter(alert => !alert.archived && alert.status === 'received').length;
  const employeeNameOptions = [...employees].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).map(employee => ({ value: String(employee.id), label: employee.name }));
  const employeeIdOptions = [...employees].sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true })).map(employee => ({ value: String(employee.id), label: String(employee.id) }));
  const selectedEmployeeValue = employeeId === 'all' ? '' : employeeId;
  const selectStyles = {
    control: base => ({ ...base, height: 42, minHeight: 42, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,.05)', fontSize: 13, fontWeight: 700 }),
    valueContainer: base => ({ ...base, padding: '0 10px' }),
    indicatorsContainer: base => ({ ...base, height: 40 }),
    placeholder: base => ({ ...base, color: '#94a3b8' })
  };

  return <div dir="rtl" style={{ display: 'grid', gap: 16 }}>
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0, color: '#0f172a' }}>تنبيهات الموظفين</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>سجل موثق لإرسال الملاحظات وتأكيد استلامها.</p></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{canAdd && <button onClick={sendNewAlert} style={{ border: '1px solid #ea580c', background: '#ea580c', color: '#fff', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', display: 'flex', gap: 7, alignItems: 'center', fontWeight: 900 }}><Send size={16}/> إرسال تنبيه جديد</button>}<button onClick={load} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', fontWeight: 800 }}><RefreshCw size={15}/> تحديث</button></div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 16, color: '#9a3412' }}><Clock3 size={22}/><strong style={{ display: 'block', fontSize: 24 }}>{pendingCount}</strong><span>بانتظار الاستلام</span></div>
      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: 16, color: '#047857' }}><CheckCircle2 size={22}/><strong style={{ display: 'block', fontSize: 24 }}>{receivedCount}</strong><span>تم الاستلام</span></div>
    </div>

    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <HRDateFilter mode={dateMode} setMode={setDateMode} date={selectedDate} setDate={setSelectedDate} month={selectedMonth} setMonth={setSelectedMonth} startDate={dateFrom} setStartDate={setDateFrom} endDate={dateTo} setEndDate={setDateTo} allowedModes={['day', 'month', 'range']}/>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: 180 }}><Select options={employeeIdOptions} value={employeeIdOptions.find(option => option.value === selectedEmployeeValue) || null} onChange={selected => setEmployeeId(selected ? selected.value : 'all')} styles={selectStyles} placeholder="رقم الموظف..." isSearchable isClearable/></div>
        <div style={{ width: 250, position: 'relative' }}><div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}><User size={16}/></div><Select options={employeeNameOptions} value={employeeNameOptions.find(option => option.value === selectedEmployeeValue) || null} onChange={selected => setEmployeeId(selected ? selected.value : 'all')} styles={{ ...selectStyles, control: base => ({ ...selectStyles.control(base), paddingLeft: 24 }) }} placeholder="اسم الموظف..." isSearchable isClearable/></div>
        <div style={{ position: 'relative' }}><select value={status} onChange={event => setStatus(event.target.value)} style={{ height: 42, minWidth: 170, fontSize: 13, fontWeight: 700, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 14px 0 34px', appearance: 'none', outline: 'none', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}><option value="pending">بانتظار الاستلام</option><option value="received">تم الاستلام</option><option value="all">جميع الحالات</option></select><ChevronDown size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/></div>
        <label style={{ height: 42, display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#475569', fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)}/> إظهار المؤرشف</label>
      </div>
    </div>

    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}><thead style={{ background: '#f8fafc' }}><tr>{['الموظف','نص التنبيه','تاريخ الإرسال','تاريخ الاستلام','الحالة','المصدر','الإجراء'].map(label => <th key={label} style={{ padding: 13, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan="7" style={{ padding: 30, textAlign: 'center' }}>جاري التحميل...</td></tr> : filtered.length === 0 ? <tr><td colSpan="7" style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>لا توجد تنبيهات مطابقة.</td></tr> : filtered.map(alert => <tr key={alert.id} style={{ background: alert.status === 'pending' ? '#fffaf0' : '#fff', opacity: alert.archived ? .65 : 1 }}>
          <td style={{ padding: 13, borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>{alert.employeeName}</td><td style={{ padding: 13, borderBottom: '1px solid #f1f5f9', maxWidth: 320 }}>{alert.message}</td><td style={{ padding: 13, borderBottom: '1px solid #f1f5f9' }}>{formatDateTime(alert.sentAt)}</td><td style={{ padding: 13, borderBottom: '1px solid #f1f5f9' }}>{formatDateTime(alert.receivedAt)}</td>
          <td style={{ padding: 13, borderBottom: '1px solid #f1f5f9' }}><span style={{ padding: '5px 9px', borderRadius: 999, fontWeight: 900, fontSize: 11, background: alert.status === 'received' ? '#dcfce7' : '#ffedd5', color: alert.status === 'received' ? '#15803d' : '#c2410c' }}>{alert.status === 'received' ? 'تم الاستلام' : 'بانتظار الاستلام'}</span></td><td style={{ padding: 13, borderBottom: '1px solid #f1f5f9' }}>{alert.source}</td>
          <td style={{ padding: 13, borderBottom: '1px solid #f1f5f9' }}>{alert.status === 'received' && !alert.archived ? (canEdit ? <button onClick={() => archive(alert)} title="أرشفة" style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: 7, cursor: 'pointer' }}><Archive size={16}/></button> : 'تم الاستلام') : alert.archived ? 'مؤرشف' : <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BellRing size={17} color="#f97316"/>{canDelete && <button onClick={() => removePendingAlert(alert)} title="سحب وحذف التنبيه" style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', borderRadius: 8, padding: 7, cursor: 'pointer', display: 'flex' }}><Trash2 size={16}/></button>}{!canDelete && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>معاينة</span>}</div>}</td>
        </tr>)}</tbody></table>
    </div>
  </div>;
}
