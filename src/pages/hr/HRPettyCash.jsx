import React, { useEffect, useState } from 'react';
import { Plus, Receipt, Trash2, Pencil, Image as ImageIcon, Wallet, TrendingDown, Coins, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import { getEmployees } from '../../store';
import { hasPermission } from '../../utils/permissions';
import { createPettyCash, deletePettyCashExpense, listPettyCash, listPettyCashExpenses, savePettyCashExpense } from '../../services/pettyCash';
import './HRPettyCash.css';

const money = cents => `${((cents || 0) / 100).toFixed(2)} د.أ`;
const emptyExpense = () => ({ date: new Date().toLocaleDateString('en-CA'), description: '', invoiceNumber: '', amount: '', invoiceImage: null });

export default function HRPettyCash({ user }) {
  const canCreate = hasPermission(user, 'hr_petty_cash', 'create');
  const canAddExpense = hasPermission(user, 'hr_petty_cash', 'add_expense');
  const canManageExpense = hasPermission(user, 'hr_petty_cash', 'manage_expense');
  const canViewInvoice = hasPermission(user, 'hr_petty_cash', 'view_invoice');
  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [newAdvance, setNewAdvance] = useState({ employeeId: '', date: new Date().toLocaleDateString('en-CA'), amount: '' });
  const [expenseForm, setExpenseForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = advances.find(item => item.id === selectedId);
  const refresh = async (preferredId) => {
    const rows = await listPettyCash();
    setAdvances(rows);
    setSelectedId(preferredId || selectedId || rows[0]?.id || '');
  };

  useEffect(() => {
    Promise.all([listPettyCash(), getEmployees()]).then(([rows, people]) => {
      setAdvances(rows);
      setEmployees(people);
      setSelectedId(rows[0]?.id || '');
    }).catch(error => Swal.fire('خطأ', error.message, 'error')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setExpenses([]); return; }
    listPettyCashExpenses(selectedId).then(setExpenses).catch(error => Swal.fire('خطأ', error.message, 'error'));
  }, [selectedId]);

  const createAdvance = async event => {
    event.preventDefault();
    if (!canCreate || saving) return;
    const employee = employees.find(item => String(item.id) === String(newAdvance.employeeId));
    if (!employee) return Swal.fire('تنبيه', 'اختر الموظف أو المدير', 'warning');
    setSaving(true);
    try {
      const id = await createPettyCash({ ...newAdvance, employeeName: employee.name });
      await refresh(id);
      setNewAdvance({ employeeId: '', date: new Date().toLocaleDateString('en-CA'), amount: '' });
      Swal.fire('تم', 'تم إنشاء السلفة النثرية', 'success');
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
    finally { setSaving(false); }
  };

  const saveExpense = async event => {
    event.preventDefault();
    if (saving || !(expenseForm.id ? canManageExpense : canAddExpense)) return;
    setSaving(true);
    try {
      await savePettyCashExpense(selectedId, expenseForm, expenseForm.id);
      setExpenseForm(null);
      await Promise.all([refresh(selectedId), listPettyCashExpenses(selectedId).then(setExpenses)]);
      Swal.fire('تم', 'تم حفظ حركة الصرف', 'success');
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
    finally { setSaving(false); }
  };

  const deleteExpense = async expense => {
    if (!canManageExpense || saving) return;
    const result = await Swal.fire({ title: 'حذف حركة الصرف؟', text: expense.description, icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء' });
    if (!result.isConfirmed) return;
    setSaving(true);
    try {
      await deletePettyCashExpense(selectedId, expense.id);
      await Promise.all([refresh(selectedId), listPettyCashExpenses(selectedId).then(setExpenses)]);
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
    finally { setSaving(false); }
  };

  const attachImage = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 500000) return Swal.fire('تنبيه', 'اختر صورة فاتورة بحجم أقل من 500 كيلوبايت', 'warning');
    const reader = new FileReader();
    reader.onload = () => setExpenseForm(current => ({ ...current, invoiceImage: reader.result }));
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="petty-cash-page"><div className="petty-cash-empty">جاري تحميل السلف النثرية...</div></div>;
  return (
    <div dir="rtl" className="petty-cash-page">
      <header className="petty-cash-header"><div className="petty-cash-title-icon"><Receipt size={25} /></div><div><div className="petty-cash-eyebrow">السلفة النثرية</div><h2>السلفة النثرية</h2><p>متابعة السلف والمصروفات والفواتير في مكان واحد</p></div></header>

      {canCreate && <form onSubmit={createAdvance} className="petty-cash-panel petty-cash-create">
        <div className="petty-cash-panel-heading"><div className="petty-cash-section-icon"><Wallet size={20} /></div><div><h3>إنشاء سلفة جديدة</h3><p>حدد صاحب السلفة وتاريخها والمبلغ الأساسي</p></div></div>
        <div className="petty-cash-form-grid">
        <label className="text-sm font-bold">اسم الموظف / المدير<select required className="w-full border rounded-lg p-2 mt-1" value={newAdvance.employeeId} onChange={e => setNewAdvance(v => ({ ...v, employeeId: e.target.value }))}><option value="">اختر الاسم</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></label>
        <label className="text-sm font-bold">تاريخ السلفة<Flatpickr required value={newAdvance.date} onChange={(_, date) => setNewAdvance(v => ({ ...v, date }))} options={{ locale: Arabic, dateFormat: 'Y-m-d', altInput: true, altInputClass: 'petty-cash-date-input', altFormat: 'd/m/Y', disableMobile: true, onReady: (_, __, picker) => picker.calendarContainer.classList.add('petty-cash-calendar') }} placeholder="اختر التاريخ" /></label>
        <label className="text-sm font-bold">مبلغ السلفة الأساسي<input required type="number" min="0.01" step="0.01" className="w-full border rounded-lg p-2 mt-1" value={newAdvance.amount} onChange={e => setNewAdvance(v => ({ ...v, amount: e.target.value }))} /></label>
        <button disabled={saving} className="petty-cash-primary"><Plus size={18} /> إنشاء سلفة</button></div>
      </form>}

      <div className="petty-cash-panel petty-cash-picker">
        <div className="petty-cash-panel-heading"><div className="petty-cash-section-icon"><FileText size={20} /></div><div><h3>سجل السلف</h3><p>اختر السلفة لعرض تفاصيلها وحركات الصرف</p></div></div>
        <label className="petty-cash-select-label">السلفة<select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">اختر سلفة</option>{advances.map(item => <option key={item.id} value={item.id}>{item.employeeName} — {item.date} — {money(item.amountCents)}</option>)}</select></label>
      </div>

      {selected ? <>
        <div className="petty-cash-summary">
          {[[ 'مبلغ السلفة', selected.amountCents, Wallet, 'advance' ], [ 'إجمالي المصروف', selected.spentCents, TrendingDown, 'spent' ], [ 'المبلغ المتبقي', selected.amountCents - (selected.spentCents || 0), Coins, 'remaining' ]].map(([label, value, Icon, tone]) => <div key={label} className={`petty-cash-metric ${tone}`}><div><span>{label}</span><strong>{money(value)}</strong></div><div className="petty-cash-metric-icon"><Icon size={25} /></div></div>)}
        </div>

        <div className="petty-cash-panel petty-cash-expenses">
          <div className="petty-cash-expenses-heading"><div className="petty-cash-panel-heading"><div className="petty-cash-section-icon"><Receipt size={20} /></div><div><h3>حركات الصرف</h3><p>{expenses.length} حركات مسجلة لهذه السلفة</p></div></div>{canAddExpense && <button onClick={() => setExpenseForm(emptyExpense())} className="petty-cash-primary"><Plus size={18} /> إضافة صرف</button>}</div>
          {expenseForm && <form onSubmit={saveExpense} className="petty-cash-expense-form">
            <div className="petty-cash-form-title">{expenseForm.id ? 'تعديل حركة صرف' : 'إضافة حركة صرف جديدة'}</div>
            <label>تاريخ الصرف<Flatpickr required value={expenseForm.date || ''} onChange={(_, date) => setExpenseForm(v => ({ ...v, date }))} options={{ locale: Arabic, dateFormat: 'Y-m-d', altInput: true, altInputClass: 'petty-cash-date-input', altFormat: 'd/m/Y', disableMobile: true, onReady: (_, __, picker) => picker.calendarContainer.classList.add('petty-cash-calendar') }} placeholder="اختر التاريخ" /></label>
            <label>بيان الصرف<input required className="w-full border rounded-lg p-2 mt-1" value={expenseForm.description} onChange={e => setExpenseForm(v => ({ ...v, description: e.target.value }))} /></label>
            <label>رقم الفاتورة<input required className="w-full border rounded-lg p-2 mt-1" value={expenseForm.invoiceNumber} onChange={e => setExpenseForm(v => ({ ...v, invoiceNumber: e.target.value }))} /></label>
            <label>مبلغ الفاتورة<input required type="number" min="0.01" step="0.01" className="w-full border rounded-lg p-2 mt-1" value={expenseForm.amount} onChange={e => setExpenseForm(v => ({ ...v, amount: e.target.value }))} /></label>
            <label className="petty-cash-upload-label">صورة الفاتورة (اختياري)<span className="petty-cash-upload-field"><ImageIcon size={18} /><span>{expenseForm.invoiceImage ? 'تم إرفاق صورة الفاتورة' : 'اختر صورة الفاتورة'}</span><span className="petty-cash-upload-action">استعراض</span></span><input type="file" accept="image/*" onChange={e => attachImage(e.target.files[0])} /></label>
            <div className="petty-cash-form-actions"><button disabled={saving} className="petty-cash-primary">حفظ الصرف</button><button type="button" onClick={() => setExpenseForm(null)} className="petty-cash-secondary">إلغاء</button>{expenseForm.invoiceImage && <span className="petty-cash-attached">صورة مرفقة</span>}</div>
          </form>}
          <div className="petty-cash-table-wrap"><table className="petty-cash-table"><thead><tr><th>تاريخ الصرف</th><th>بيان الصرف</th><th>رقم الفاتورة</th><th>مبلغ الفاتورة</th><th>صورة الفاتورة</th><th>إجراءات</th></tr></thead><tbody>{expenses.map(expense => <tr key={expense.id}><td>{expense.date || expense.createdAt?.slice(0, 10) || '—'}</td><td className="petty-cash-description">{expense.description}</td><td>{expense.invoiceNumber}</td><td className="petty-cash-amount">{money(expense.amountCents)}</td><td>{expense.invoiceImage && canViewInvoice ? <button onClick={() => Swal.fire({ imageUrl: expense.invoiceImage, imageAlt: 'صورة الفاتورة', showConfirmButton: false, showCloseButton: true })} className="petty-cash-image-link"><ImageIcon size={17} /> عرض الصورة</button> : '—'}</td><td>{canManageExpense && <div className="petty-cash-row-actions"><button title="تعديل" onClick={() => setExpenseForm({ ...expense, date: expense.date || expense.createdAt?.slice(0, 10) || '', amount: (expense.amountCents / 100).toFixed(2) })}><Pencil size={17} /></button><button title="حذف" onClick={() => deleteExpense(expense)} className="delete"><Trash2 size={17} /></button></div>}</td></tr>)}</tbody></table>{expenses.length === 0 && <div className="petty-cash-table-empty"><Receipt size={28} /><span>لم تُضف حركات صرف بعد</span></div>}</div>
        </div>
      </> : <div className="petty-cash-empty"><div className="petty-cash-empty-icon"><Wallet size={32} /></div><h3>لا توجد سلف نثرية بعد</h3><p>ابدأ بإنشاء سلفة جديدة ليظهر هنا ملخصها وحركات الصرف الخاصة بها.</p></div>}
    </div>
  );
}
