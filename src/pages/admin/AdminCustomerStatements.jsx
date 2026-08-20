import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Search, Filter, Printer, MessageCircle,
  Trash2, FileOutput, X, AlertTriangle, CheckCircle, Clock,
  DollarSign, Receipt, CreditCard, Undo2, AlertCircle,
  Eye, Pencil, Calendar, ChevronsUpDown, ArrowRight, ChevronRight, User
} from 'lucide-react';
import {
  getCustomerTransactions, saveCustomerTransaction, deleteCustomerTransaction,
  getCustomers, saveCustomer, canPerformAction, addLog, getGlobalSettings, getEmployees
} from '../../store';
import Swal from 'sweetalert2';
import Select from '../../components/SearchSelect';
import HRDateFilter from '../../components/ui/HRDateFilter';
import flatpickr from 'flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

export default function AdminCustomerStatements({ user }) {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [salesReps, setSalesReps] = useState(['زبائن الشركة']);

  // Filters & Sorting
  const [typeFilter, setTypeFilter] = useState('');
  const [docNumberFilter, setDocNumberFilter] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });

  // Summary Grid State
  const [summarySearch, setSummarySearch] = useState('');
  const debouncedSummarySearch = useDebounce(summarySearch);
  const [summarySort, setSummarySort] = useState({ key: 'balance', direction: 'desc' });

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setDocNumberFilter('');
    setMinAmount('');
    setMaxAmount('');
  }, [selectedCustomer]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let [custs, txs, emps] = await Promise.all([
        getCustomers(),
        getCustomerTransactions(),
        getEmployees()
      ]);

      // Batch seed for 'الزغير هوم سنتر' if requested invoices are not in DB
      let zubeirCust = custs.find(c => c.name && c.name.includes("الزغير"));
      const hasZubeirInvoices = txs.some(t => (t.docNumber === '18506' || t.docNumber === '3921') && t.status !== 'ملغى');

      if (!hasZubeirInvoices) {
        if (!zubeirCust) {
          zubeirCust = await saveCustomer({
            name: "الزغير هوم سنتر",
            type: "عميل",
            city: "عمان",
            phone: ""
          });
        }

        if (zubeirCust && zubeirCust.id) {
          const seedData = [
            { type: "رصيد افتتاحي", docNumber: "", date: "2026-06-01", amount: 138, notes: "رصيد سابق" },
            { type: "فاتورة مبيعات", docNumber: "18506", date: "2026-06-20", amount: 9, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "18509", date: "2026-06-22", amount: 66, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3921", date: "2026-06-29", amount: 124, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3927", date: "2026-07-05", amount: 75, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3930", date: "2026-07-05", amount: 84, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3963", date: "2026-07-05", amount: 90, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3968", date: "2026-07-19", amount: 467, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3971", date: "2026-07-19", amount: 180, notes: "شيك آجل" },
            { type: "فاتورة مبيعات", docNumber: "3980", date: "2026-07-26", amount: 34, notes: "شيك آجل" }
          ];

          for (const item of seedData) {
            await saveCustomerTransaction({
              customerId: zubeirCust.id,
              customerName: zubeirCust.name,
              type: item.type,
              invoiceType: "ذمم",
              paymentMethod: "شيك آجل",
              salesRep: "زبائن الشركة",
              date: item.date,
              docNumber: item.docNumber,
              amount: item.amount,
              notes: item.notes,
              dueDate: "2026-08-31",
              status: "نشط",
              createdBy: "النظام"
            });
          }

          [custs, txs] = await Promise.all([
            getCustomers(),
            getCustomerTransactions()
          ]);
        }
      }

      setCustomers(custs.filter(c => c.type === 'عميل' || !c.type));
      setTransactions(txs);
      
      const reps = emps.filter(e => e.department === 'المبيعات' || e.role === 'مبيعات' || (e.name && e.name.includes('جهاد'))).map(e => e.name);
      setSalesReps(['زبائن الشركة', ...new Set(reps)]);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const getCustomerTxs = () => {
    if (!selectedCustomer) return [];
    let allCustTxs = transactions.filter(t => t.customerId === selectedCustomer.id);

    // Apply filters based on dateMode
    let filterFrom = '';
    let filterTo = '';

    if (dateMode === 'range') {
      filterFrom = startDate;
      filterTo = endDate;
    } else if (dateMode === 'day') {
      filterFrom = selectedDate;
      filterTo = selectedDate;
    } else if (dateMode === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10);
      filterFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      filterTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // 1) Calculate previous balance for all valid transactions BEFORE filterFrom
    let previousBalance = 0;
    if (filterFrom) {
      const prevTxs = allCustTxs.filter(t => t.status !== 'ملغى' && t.date < filterFrom);
      prevTxs.forEach(t => {
        let debit = 0;
        let credit = 0;
        if (t.type === 'فاتورة مبيعات' || t.type === 'رصيد افتتاحي' || t.type === 'تسوية مدينة') {
          debit = Number(t.amount) || 0;
        } else if (t.type === 'دفعة' || t.type === 'مرتجع مبيعات' || t.type === 'تسوية دائنة' || t.type === 'رصيد افتتاحي دائن' || t.type === 'خصم') {
          credit = Number(t.amount) || 0;
        }
        previousBalance += (debit - credit);
      });
    }

    let txs = [...allCustTxs];
    if (filterFrom) txs = txs.filter(t => t.date >= filterFrom);
    if (filterTo) txs = txs.filter(t => t.date <= filterTo);
    if (typeFilter) txs = txs.filter(t => t.type === typeFilter);
    if (docNumberFilter) txs = txs.filter(t => (t.docNumber || '').toString().includes(docNumberFilter));
    if (minAmount) txs = txs.filter(t => Number(t.amount || 0) >= Number(minAmount));
    if (maxAmount) txs = txs.filter(t => Number(t.amount || 0) <= Number(maxAmount));

    // Sort chronologically to calculate running balance
    txs.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      if (dateA - dateB !== 0) return dateA - dateB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    let balance = previousBalance;
    const periodProcessedTxs = txs.map(t => {
      let debit = 0;
      let credit = 0;

      if (t.status !== 'ملغى') {
        if (t.type === 'فاتورة مبيعات' || t.type === 'رصيد افتتاحي' || t.type === 'تسوية مدينة') {
          debit = Number(t.amount) || 0;
        } else if (t.type === 'دفعة' || t.type === 'مرتجع مبيعات' || t.type === 'تسوية دائنة' || t.type === 'رصيد افتتاحي دائن' || t.type === 'خصم') {
          credit = Number(t.amount) || 0;
        }
      }

      balance = balance + debit - credit;
      return { ...t, debit, credit, runningBalance: balance };
    });

    if (filterFrom) {
      const prevRow = {
        id: 'previous-balance-row',
        date: filterFrom,
        docNumber: '-',
        salesRep: '-',
        type: 'رصيد سابق',
        invoiceType: '-',
        notes: '',
        paymentMethod: 'رصيد مدور',
        debit: previousBalance > 0 ? previousBalance : 0,
        credit: previousBalance < 0 ? Math.abs(previousBalance) : 0,
        runningBalance: previousBalance,
        isPreviousBalance: true
      };
      return [prevRow, ...periodProcessedTxs];
    }

    return periodProcessedTxs;
  };

  const filteredTxs = getCustomerTxs();
  // Default to oldest first (chronological) for accounting ledgers
  let displayTxs = [...filteredTxs];

  if (sortConfig.key) {
    displayTxs.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? '';
      let bVal = b[sortConfig.key] ?? '';

      if (['debit', 'credit', 'runningBalance', 'amount'].includes(sortConfig.key)) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Summary logic
  const calcSummary = () => {
    let totalInvoices = 0, totalPayments = 0, totalReturns = 0, dueInvoices = 0, finalBalance = 0;

    let txsToProcess = [];
    if (selectedCustomer) {
      txsToProcess = filteredTxs;
      finalBalance = txsToProcess.length > 0 ? (txsToProcess[txsToProcess.length - 1].runningBalance || 0) : 0;
    } else {
      let filterFrom = '';
      let filterTo = '';
      if (dateMode === 'range') { filterFrom = startDate; filterTo = endDate; }
      else if (dateMode === 'day') { filterFrom = selectedDate; filterTo = selectedDate; }
      else if (dateMode === 'month' && selectedMonth) {
        const [y, m] = selectedMonth.split('-');
        const year = parseInt(y, 10);
        const month = parseInt(m, 10);
        filterFrom = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        filterTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }

      txsToProcess = transactions.filter(t => {
        if (t.status === 'ملغى') return false;
        if (filterFrom && t.date < filterFrom) return false;
        if (filterTo && t.date > filterTo) return false;
        return true;
      });
    }

    txsToProcess.forEach(t => {
      if (t.type === 'فاتورة مبيعات') totalInvoices += Number(t.amount || 0);
      if (t.type === 'دفعة') totalPayments += Number(t.amount || 0);
      if (t.type === 'مرتجع مبيعات') totalReturns += Number(t.amount || 0);
      if (t.type === 'فاتورة مبيعات' && t.dueDate && new Date(t.dueDate) < new Date()) dueInvoices += Number(t.amount || 0);
    });

    return { totalInvoices, totalPayments, totalReturns, dueInvoices, finalBalance };
  };

  const periodTotals = React.useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    filteredTxs.forEach(t => {
      if (!t.isPreviousBalance && t.status !== 'ملغى') {
        totalDebit += Number(t.debit || 0);
        totalCredit += Number(t.credit || 0);
      }
    });
    return { totalDebit, totalCredit };
  }, [filteredTxs]);

  const getCustomerBalances = () => {
    let filterTo = '';
    if (dateMode === 'range') { filterTo = endDate; }
    else if (dateMode === 'day') { filterTo = selectedDate; }
    else if (dateMode === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10);
      const lastDay = new Date(year, month, 0).getDate();
      filterTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const balances = {};

    customers.forEach(c => {
      balances[c.id] = { ...c, balance: 0, lastActivity: null };
    });

    const sortedTxs = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      if (dateA - dateB !== 0) return dateA - dateB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    sortedTxs.forEach(t => {
      if (t.status === 'ملغى' || !balances[t.customerId]) return;
      if (filterTo && t.date > filterTo) return;

      let debit = 0;
      let credit = 0;
      if (t.type === 'فاتورة مبيعات' || t.type === 'رصيد افتتاحي' || t.type === 'تسوية مدينة') {
        debit = Number(t.amount) || 0;
      } else if (t.type === 'دفعة' || t.type === 'مرتجع مبيعات' || t.type === 'تسوية دائنة' || t.type === 'رصيد افتتاحي دائن' || t.type === 'خصم') {
        credit = Number(t.amount) || 0;
      }

      balances[t.customerId].balance += (debit - credit);
      balances[t.customerId].lastActivity = t.date;
    });

    let result = Object.values(balances);
    // Only include customers with active non-zero balance
    result = result.filter(c => Math.abs(c.balance || 0) > 0.001);

    if (debouncedSummarySearch) {
      result = result.filter(c => matchesSearch(
        [c.name, c.phone, c.customerNumber, c.id, c.location],
        debouncedSummarySearch
      ));
    }

    result.sort((a, b) => {
      let aVal = a[summarySort.key];
      let bVal = b[summarySort.key];

      if (summarySort.key === 'balance') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return summarySort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return summarySort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  };

  const handleSummarySort = (key) => {
    setSummarySort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const allCustomerBalances = getCustomerBalances();
  const summary = calcSummary();
  if (!selectedCustomer) {
    summary.finalBalance = allCustomerBalances.reduce((sum, c) => sum + c.balance, 0);
  }

  const handleAddPayment = async () => {
    if (!canPerformAction(user, 'customer_statements', 'add')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لإضافة دفعات', 'error');
    }

    const customerListHtml = customers.map(c =>
      `<li class="swal-customer-item" data-id="${c.id}" data-name="${c.name}${c.phone ? ` - ${c.phone}` : ''}" style="padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">${c.name}${c.phone ? ` - ${c.phone}` : ''}</li>`
    ).join('');

    const defaultCustomerName = selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ''}` : '';
    const defaultCustomerId = selectedCustomer ? selectedCustomer.id : '';

    const { value: formValues } = await Swal.fire({
      title: 'تسجيل دفعة',
      width: 920,
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-6',
        confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm',
        cancelButton: 'btn btn-outline px-6 py-2.5 rounded-xl font-bold text-sm',
        actions: 'flex justify-center gap-4 mt-6 w-full'
      },
      buttonsStyling: false,
      html: `
        <div style="text-align: right; direction: rtl; font-family: Tajawal, sans-serif; padding-top: 10px;">
          <div style="margin-bottom: 14px; position: relative;" id="swal-custom-select-container">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">الزبون *</label>
            <input type="hidden" id="swal-customer-hidden-val" value="${defaultCustomerId}">
            <div id="swal-customer-display" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span id="swal-customer-text" style="color: ${defaultCustomerId ? '#1e293b' : '#94a3b8'}">${defaultCustomerName || 'ابحث أو اختر زبون...'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div id="swal-customer-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; flex-direction: column;">
              <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <input type="text" id="swal-customer-search" placeholder="بحث باسم الزبون أو الهاتف..." style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; background: #f8fafc;">
              </div>
              <ul id="swal-customer-list" style="list-style: none; margin: 0; padding: 0; max-height: 280px; overflow-y: auto;">
                ${customerListHtml}
              </ul>
            </div>
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">تاريخ الدفعة *</label>
            <input type="text" id="swal-date" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;" placeholder="اختر تاريخ الحركة">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">المبلغ *</label>
            <input type="number" id="swal-amount" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" step="0.001" min="0" placeholder="0.000">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">طريقة الدفع *</label>
            <select id="swal-notes" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
              <option value="نقدي">نقدي</option>
              <option value="كليك">كليك</option>
              <option value="شيك صرف">شيك صرف</option>
              <option value="شيك آجل">شيك آجل</option>
              <option value="تحويل بنكي">تحويل بنكي</option>
              <option value="فيزا">فيزا</option>
              <option value="دفعات مجزئة">دفعات مجزئة</option>
            </select>
          </div>
          <div style="margin-bottom: 14px; display: none;" id="swal-cheque-details-div">
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;">
                <div><strong style="color:#0f172a;font-size:14px;">جدول الشيكات</strong><small style="display:block;color:#64748b;margin-top:2px;">أضف العدد المطلوب، وسيُحسب إجمالي الدفعة تلقائيًا.</small></div>
                <button type="button" id="swal-add-cheque" style="border:0;border-radius:9px;background:#0f766e;color:#fff;padding:8px 13px;font-weight:800;cursor:pointer;white-space:nowrap;">+ إضافة شيك</button>
              </div>
              <div style="overflow-x:auto;">
                <table style="width:100%;min-width:760px;border-collapse:separate;border-spacing:0 6px;text-align:center;font-size:12px;">
                  <thead><tr style="color:#475569;"><th>#</th><th>نوع الشيك</th><th>المبلغ *</th><th>رقم الشيك *</th><th>تاريخ الشيك *</th><th>البنك *</th><th></th></tr></thead>
                  <tbody id="swal-cheques-body"></tbody>
                </table>
              </div>
              <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px;padding-top:10px;border-top:1px dashed #cbd5e1;"><span style="font-weight:800;color:#475569;">إجمالي الشيكات:</span><strong id="swal-cheques-total" style="font-size:18px;color:#0f766e;">0.000 د.أ</strong></div>
            </div>
          </div>
          <div style="margin-bottom: 14px; display: none;" id="swal-partial-notes-div">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">ملاحظات (اختياري)</label>
            <input type="text" id="swal-partial-notes" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" placeholder="أدخل أي ملاحظات حول الدفعة المجزئة...">
          </div>
        </div>
      `,
      didOpen: () => {
        const display = document.getElementById('swal-customer-display');
        const dropdown = document.getElementById('swal-customer-dropdown');
        const search = document.getElementById('swal-customer-search');
        const list = document.getElementById('swal-customer-list');
        const hiddenVal = document.getElementById('swal-customer-hidden-val');
        const textDisplay = document.getElementById('swal-customer-text');

        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
          if (dropdown.style.display === 'flex') {
            search.value = '';
            search.dispatchEvent(new Event('input'));
            search.focus();
          }
        });

        search.addEventListener('input', (e) => {
          const term = e.target.value;
          const items = list.querySelectorAll('.swal-customer-item');
          items.forEach(item => {
            const name = item.getAttribute('data-name');
            item.style.display = matchesSearch(name, term) ? 'block' : 'none';
          });
        });

        list.addEventListener('click', (e) => {
          const item = e.target.closest('.swal-customer-item');
          if (item) {
            hiddenVal.value = item.getAttribute('data-id');
            textDisplay.textContent = item.getAttribute('data-name');
            textDisplay.style.color = '#1e293b';
            dropdown.style.display = 'none';
          }
        });

        document.addEventListener('click', (e) => {
          const container = document.getElementById('swal-custom-select-container');
          if (container && !container.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });

        list.querySelectorAll('.swal-customer-item').forEach(item => {
          item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f1f5f9');
          item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        });

        flatpickr('#swal-date', {
          dateFormat: 'Y-m-d',
          locale: Arabic,
          defaultDate: new Date()
        });

        const amountInput = document.getElementById('swal-amount');
        if (amountInput) {
          amountInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.includes('.')) {
              const parts = val.split('.');
              if (parts[1] && parts[1].length > 3) {
                e.target.value = parts[0] + '.' + parts[1].substring(0, 3);
              }
            }
          });
        }

        const notesSelect = document.getElementById('swal-notes');
        const chequeDetailsDiv = document.getElementById('swal-cheque-details-div');
        const partialNotesDiv = document.getElementById('swal-partial-notes-div');
        const chequesBody = document.getElementById('swal-cheques-body');
        const chequesTotal = document.getElementById('swal-cheques-total');
        let chequeRowCounter = 0;
        const updateChequeTotal = () => {
          const total = [...chequesBody.querySelectorAll('.swal-cheque-amount')].reduce((sum, input) => sum + (Number(input.value) || 0), 0);
          chequesTotal.textContent = `${total.toFixed(3)} د.أ`;
          amountInput.value = total ? total.toFixed(3) : '';
        };
        const refreshChequeRowNumbers = () => {
          [...chequesBody.querySelectorAll('tr')].forEach((row, index) => { row.querySelector('.swal-cheque-row-number').textContent = index + 1; });
        };
        const addChequeRow = (defaultType = notesSelect.value) => {
          chequeRowCounter += 1;
          const row = document.createElement('tr');
          row.className = 'swal-cheque-row';
          row.innerHTML = `
            <td class="swal-cheque-row-number" style="font-weight:900;color:#64748b;"></td>
            <td><select class="swal-cheque-type" style="width:105px;height:36px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;"><option value="شيك آجل" ${defaultType === 'شيك آجل' ? 'selected' : ''}>شيك آجل</option><option value="شيك صرف" ${defaultType === 'شيك صرف' ? 'selected' : ''}>شيك صرف</option></select></td>
            <td><input type="number" min="0.001" step="0.001" class="swal-cheque-amount" placeholder="0.000" style="width:100px;height:36px;border:1px solid #cbd5e1;border-radius:7px;text-align:center;font:inherit;font-weight:800;"></td>
            <td><input type="text" class="swal-cheque-number" placeholder="رقم الشيك" style="width:120px;height:36px;border:1px solid #cbd5e1;border-radius:7px;padding:0 7px;font:inherit;"></td>
            <td><input type="text" id="swal-cheque-date-${chequeRowCounter}" class="swal-cheque-date" placeholder="تاريخ الشيك" style="width:115px;height:36px;border:1px solid #cbd5e1;border-radius:7px;padding:0 7px;font:inherit;text-align:center;cursor:pointer;"></td>
            <td><input type="text" class="swal-cheque-bank" placeholder="اسم البنك" style="width:145px;height:36px;border:1px solid #cbd5e1;border-radius:7px;padding:0 7px;font:inherit;"></td>
            <td><button type="button" class="swal-remove-cheque" style="width:32px;height:32px;border:1px solid #fecaca;border-radius:7px;background:#fef2f2;color:#dc2626;cursor:pointer;font-weight:900;">×</button></td>`;
          chequesBody.appendChild(row);
          flatpickr(`#swal-cheque-date-${chequeRowCounter}`, { dateFormat: 'Y-m-d', locale: Arabic });
          row.querySelector('.swal-cheque-amount').addEventListener('input', updateChequeTotal);
          row.querySelector('.swal-remove-cheque').addEventListener('click', () => {
            row.remove(); refreshChequeRowNumbers(); updateChequeTotal();
            if (!chequesBody.children.length) addChequeRow(notesSelect.value);
          });
          refreshChequeRowNumbers();
        };
        document.getElementById('swal-add-cheque').addEventListener('click', () => addChequeRow(notesSelect.value));
        if (notesSelect && chequeDetailsDiv) {
          notesSelect.addEventListener('change', (e) => {
            if (e.target.value === 'شيك صرف' || e.target.value === 'شيك آجل') {
              chequeDetailsDiv.style.display = 'block';
              amountInput.readOnly = true;
              amountInput.style.backgroundColor = '#f1f5f9';
              if (!chequesBody.children.length) addChequeRow(e.target.value);
              if (partialNotesDiv) partialNotesDiv.style.display = 'none';
            } else if (e.target.value === 'دفعات مجزئة') {
              chequeDetailsDiv.style.display = 'none';
              amountInput.readOnly = false;
              amountInput.style.backgroundColor = '#fff';
              if (partialNotesDiv) partialNotesDiv.style.display = 'block';
            } else {
              chequeDetailsDiv.style.display = 'none';
              amountInput.readOnly = false;
              amountInput.style.backgroundColor = '#fff';
              if (partialNotesDiv) partialNotesDiv.style.display = 'none';
            }
          });
          notesSelect.dispatchEvent(new Event('change'));
        }
      },
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const customerId = document.getElementById('swal-customer-hidden-val').value;
        const date = document.getElementById('swal-date').value;
        const amount = document.getElementById('swal-amount').value;
        const notes = document.getElementById('swal-notes').value;

        if (!customerId || !date || !amount) {
          Swal.showValidationMessage('الرجاء إدخال الحقول الإجبارية واختيار الزبون من القائمة');
          return false;
        }

        const decimalPart = amount.includes('.') ? amount.split('.')[1] : '';
        if (decimalPart.length > 3) {
          Swal.showValidationMessage('المبلغ بالفلسات لا يجب أن يتجاوز 3 خانات');
          return false;
        }

        let combinedNotes = notes;
        let cheques = [];
        if (notes === 'شيك صرف' || notes === 'شيك آجل') {
          cheques = [...document.querySelectorAll('#swal-cheques-body .swal-cheque-row')].map(row => ({
            type: row.querySelector('.swal-cheque-type').value,
            amount: Number(row.querySelector('.swal-cheque-amount').value) || 0,
            chequeNumber: row.querySelector('.swal-cheque-number').value.trim(),
            chequeDate: row.querySelector('.swal-cheque-date').value,
            bank: row.querySelector('.swal-cheque-bank').value.trim()
          }));
          if (!cheques.length || cheques.some(cheque => !(cheque.amount > 0) || !cheque.chequeNumber || !cheque.chequeDate || !cheque.bank)) {
            Swal.showValidationMessage('الرجاء تعبئة النوع والمبلغ والرقم والتاريخ والبنك لكل شيك');
            return false;
          }
          const duplicateNumbers = cheques.map(cheque => cheque.chequeNumber).filter((number, index, all) => all.indexOf(number) !== index);
          if (duplicateNumbers.length) {
            Swal.showValidationMessage(`رقم الشيك مكرر: ${duplicateNumbers[0]}`);
            return false;
          }
          const chequeTotal = cheques.reduce((sum, cheque) => sum + cheque.amount, 0);
          combinedNotes = `${cheques.length} شيك — ${cheques.map(cheque => `${cheque.type} رقم ${cheque.chequeNumber} (${cheque.amount.toFixed(3)} د.أ، ${cheque.bank}، ${cheque.chequeDate})`).join(' | ')}`;
          return { customerId, type: 'دفعة', date, docNum: '', amount: chequeTotal.toFixed(3), notes: combinedNotes, paymentMethod: 'شيكات متعددة', cheques, dueDate: '', origInv: '' };
        } else if (notes === 'دفعات مجزئة') {
          const partialNotes = document.getElementById('swal-partial-notes').value.trim();
          if (partialNotes) {
            combinedNotes = `${notes} - ${partialNotes}`;
          }
        }

        return { customerId, type: 'دفعة', date, docNum: '', amount, notes: combinedNotes, paymentMethod: notes, cheques, dueDate: '', origInv: '' };
      }
    });

    if (formValues) {
      setLoading(true);
      const chosenCustomer = customers.find(c => c.id === formValues.customerId);
      const newTx = {
        customerId: formValues.customerId,
        customerName: chosenCustomer.name,
        type: formValues.type,
        date: formValues.date,
        docNumber: formValues.docNum,
        amount: Number(formValues.amount),
        notes: formValues.notes,
        paymentMethod: formValues.paymentMethod,
        cheques: formValues.cheques || [],
        dueDate: formValues.dueDate,
        originalInvoice: formValues.origInv,
        status: 'معتمد',
        createdBy: user.name
      };

      await saveCustomerTransaction(newTx);
      await addLog(user.name, 'تسجيل دفعة', `تسجيل دفعة من الزبون ${chosenCustomer.name} بقيمة ${formValues.amount}`);
      await fetchData();

      if (!selectedCustomer || selectedCustomer.id !== formValues.customerId) {
        setSelectedCustomer(chosenCustomer);
      }

      Swal.fire('تمت الإضافة', 'تم تسجيل الدفعة بنجاح', 'success');
    }
  };

  const handleAddDiscount = async () => {
    if (!canPerformAction(user, 'customer_statements', 'add')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لإضافة خصومات', 'error');
    }

    const customerListHtml = customers.map(c =>
      `<li class="swal-customer-item" data-id="${c.id}" data-name="${c.name}${c.phone ? ` - ${c.phone}` : ''}" style="padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">${c.name}${c.phone ? ` - ${c.phone}` : ''}</li>`
    ).join('');

    const defaultCustomerName = selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ''}` : '';
    const defaultCustomerId = selectedCustomer ? selectedCustomer.id : '';

    const { value: formValues } = await Swal.fire({
      title: 'خصم',
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-6',
        confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm',
        cancelButton: 'btn btn-outline px-6 py-2.5 rounded-xl font-bold text-sm',
        actions: 'flex justify-center gap-4 mt-6 w-full'
      },
      buttonsStyling: false,
      html: `
        <div style="text-align: right; direction: rtl; font-family: Tajawal, sans-serif; padding-top: 10px;">
          <div style="margin-bottom: 14px; position: relative;" id="swal-custom-select-container">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">الزبون *</label>
            <input type="hidden" id="swal-customer-hidden-val" value="${defaultCustomerId}">
            <div id="swal-customer-display" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span id="swal-customer-text" style="color: ${defaultCustomerId ? '#1e293b' : '#94a3b8'}">${defaultCustomerName || 'ابحث أو اختر زبون...'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div id="swal-customer-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; flex-direction: column;">
              <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <input type="text" id="swal-customer-search" placeholder="بحث باسم الزبون أو الهاتف..." style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; background: #f8fafc;">
              </div>
              <ul id="swal-customer-list" style="list-style: none; margin: 0; padding: 0; max-height: 280px; overflow-y: auto;">
                ${customerListHtml}
              </ul>
            </div>
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">تاريخ الخصم *</label>
            <input type="text" id="swal-date" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;" placeholder="اختر تاريخ الخصم">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">المبلغ *</label>
            <input type="number" id="swal-amount" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" step="0.001" min="0" placeholder="0.000">
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">سبب الخصم / ملاحظات (اختياري)</label>
            <input type="text" id="swal-notes" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" placeholder="مثال: خصم خاص، ترضية، الخ...">
          </div>
        </div>
      `,
      didOpen: () => {
        const display = document.getElementById('swal-customer-display');
        const dropdown = document.getElementById('swal-customer-dropdown');
        const search = document.getElementById('swal-customer-search');
        const list = document.getElementById('swal-customer-list');
        const hiddenVal = document.getElementById('swal-customer-hidden-val');
        const textDisplay = document.getElementById('swal-customer-text');

        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
          if (dropdown.style.display === 'flex') {
            search.value = '';
            search.dispatchEvent(new Event('input'));
            search.focus();
          }
        });

        search.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          const items = list.querySelectorAll('.swal-customer-item');
          items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            item.style.display = matchesSearch(name, term) ? 'block' : 'none';
          });
        });

        list.addEventListener('click', (e) => {
          const item = e.target.closest('.swal-customer-item');
          if (item) {
            hiddenVal.value = item.getAttribute('data-id');
            textDisplay.textContent = item.getAttribute('data-name');
            textDisplay.style.color = '#1e293b';
            dropdown.style.display = 'none';
          }
        });

        document.addEventListener('click', (e) => {
          const container = document.getElementById('swal-custom-select-container');
          if (container && !container.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });

        list.querySelectorAll('.swal-customer-item').forEach(item => {
          item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f1f5f9');
          item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        });

        flatpickr('#swal-date', {
          dateFormat: 'Y-m-d',
          locale: Arabic,
          defaultDate: new Date()
        });

        const amountInput = document.getElementById('swal-amount');
        if (amountInput) {
          amountInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.includes('.')) {
              const parts = val.split('.');
              if (parts[1] && parts[1].length > 3) {
                e.target.value = parts[0] + '.' + parts[1].substring(0, 3);
              }
            }
          });
        }
      },
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const customerId = document.getElementById('swal-customer-hidden-val').value;
        const date = document.getElementById('swal-date').value;
        const amount = document.getElementById('swal-amount').value;
        const notes = document.getElementById('swal-notes').value;

        if (!customerId || !date || !amount) {
          Swal.showValidationMessage('الرجاء إدخال الحقول الإجبارية واختيار الزبون من القائمة');
          return false;
        }

        const decimalPart = amount.includes('.') ? amount.split('.')[1] : '';
        if (decimalPart.length > 3) {
          Swal.showValidationMessage('المبلغ بالفلسات لا يجب أن يتجاوز 3 خانات');
          return false;
        }

        return { customerId, type: 'خصم', date, docNum: '', amount, notes: notes, dueDate: '', origInv: '' };
      }
    });

    if (formValues) {
      setLoading(true);
      const chosenCustomer = customers.find(c => c.id === formValues.customerId);
      const newTx = {
        customerId: formValues.customerId,
        customerName: chosenCustomer.name,
        type: formValues.type,
        date: formValues.date,
        docNumber: formValues.docNum,
        amount: Number(formValues.amount),
        notes: formValues.notes,
        dueDate: formValues.dueDate,
        originalInvoice: formValues.origInv,
        status: 'معتمد',
        createdBy: user.name
      };

      await saveCustomerTransaction(newTx);
      await addLog(user.name, 'منح خصم', `خصم للزبون ${chosenCustomer.name} بقيمة ${formValues.amount}`);
      await fetchData();

      if (!selectedCustomer || selectedCustomer.id !== formValues.customerId) {
        setSelectedCustomer(chosenCustomer);
      }

      Swal.fire('تمت الإضافة', 'تم منح الخصم بنجاح', 'success');
    }
  };

  const handleAddTransaction = async () => {
    if (!canPerformAction(user, 'customer_statements', 'add')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لإضافة حركات مالية', 'error');
    }

    const customerListHtml = customers.map(c =>
      `<li class="swal-customer-item" data-id="${c.id}" data-name="${c.name}${c.phone ? ` - ${c.phone}` : ''}" style="padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">${c.name}${c.phone ? ` - ${c.phone}` : ''}</li>`
    ).join('');

    const defaultCustomerName = selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ''}` : '';
    const defaultCustomerId = selectedCustomer ? selectedCustomer.id : '';
    
    const salesRepOptionsHtml = salesReps.map(rep => `<option value="${rep}">${rep}</option>`).join('');

    const { value: formValues } = await Swal.fire({
      title: 'إضافة حركة',
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-6',
        confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm',
        cancelButton: 'btn btn-outline px-6 py-2.5 rounded-xl font-bold text-sm',
        actions: 'flex justify-center gap-4 mt-6 w-full'
      },
      buttonsStyling: false,
      html: `
        <div style="text-align: right; direction: rtl; font-family: Tajawal, sans-serif; padding-top: 10px;">
          <div style="margin-bottom: 14px; position: relative;" id="swal-custom-select-container">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">الزبون *</label>
            <input type="hidden" id="swal-customer-hidden-val" value="${defaultCustomerId}">
            <div id="swal-customer-display" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span id="swal-customer-text" style="color: ${defaultCustomerId ? '#1e293b' : '#94a3b8'}">${defaultCustomerName || 'ابحث أو اختر زبون...'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div id="swal-customer-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; flex-direction: column;">
              <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <input type="text" id="swal-customer-search" placeholder="بحث باسم الزبون أو الهاتف..." style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; background: #f8fafc;">
              </div>
              <ul id="swal-customer-list" style="list-style: none; margin: 0; padding: 0; max-height: 280px; overflow-y: auto;">
                ${customerListHtml}
              </ul>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
            <div id="swal-type-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">نوع الحركة *</label>
              <select id="swal-type" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="فاتورة مبيعات">فاتورة مبيعات</option>
                <option value="مرتجع مبيعات">مرتجع مبيعات</option>
                <option value="رصيد افتتاحي">رصيد افتتاحي</option>
              </select>
            </div>
            <div id="swal-opening-type-div" style="display: none;">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">نوع الرصيد الافتتاحي *</label>
              <select id="swal-opening-type" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="مدين">مدين (لنا عليه)</option>
                <option value="دائن">دائن (عليه لنا)</option>
              </select>
            </div>
            <div id="swal-date-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">تاريخ الحركة *</label>
              <input type="text" id="swal-date" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;" placeholder="اختر تاريخ الحركة">
            </div>
            <div id="swal-doc-num-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">رقم المستند *</label>
              <input type="text" id="swal-doc-num" maxlength="6" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" placeholder="مثال: 123456">
            </div>
            <div id="swal-amount-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">المبلغ *</label>
              <input type="number" id="swal-amount" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" step="0.001" min="0" placeholder="0.000">
            </div>
            <div id="swal-sales-rep-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">اسم المندوب *</label>
              <select id="swal-sales-rep" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                ${salesRepOptionsHtml}
              </select>
            </div>
            <div id="swal-invoice-type-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">نوع الفاتورة *</label>
              <select id="swal-invoice-type" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="ذمم">ذمم</option>
                <option value="نقدي">نقدي</option>
              </select>
            </div>
            <div id="swal-payment-method-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">طريقة الدفع *</label>
              <select id="swal-notes" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="نقدي">نقدي</option>
                <option value="كليك">كليك</option>
                <option value="شيك صرف">شيك صرف</option>
                <option value="شيك آجل">شيك آجل</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="فيزا">فيزا</option>
                <option value="دفعات مجزئة">دفعات مجزئة</option>
              </select>
            </div>
            <div id="swal-due-date-div" style="display: none;">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">تاريخ الاستحقاق</label>
              <input type="text" id="swal-due-date" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;" placeholder="اختر تاريخ الاستحقاق">
            </div>
            <div id="swal-original-inv-div" style="display: none;">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">رقم الفاتورة الأصلية (للمرتجعات)</label>
              <input type="text" id="swal-original-inv" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" placeholder="رقم الفاتورة الأصلية">
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        // Custom Dropdown Logic
        const display = document.getElementById('swal-customer-display');
        const dropdown = document.getElementById('swal-customer-dropdown');
        const search = document.getElementById('swal-customer-search');
        const list = document.getElementById('swal-customer-list');
        const hiddenVal = document.getElementById('swal-customer-hidden-val');
        const textDisplay = document.getElementById('swal-customer-text');

        display.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
          if (dropdown.style.display === 'flex') {
            search.value = '';
            search.dispatchEvent(new Event('input'));
            search.focus();
          }
        });

        search.addEventListener('input', (e) => {
          const term = e.target.value.toLowerCase();
          const items = list.querySelectorAll('.swal-customer-item');
          items.forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            item.style.display = matchesSearch(name, term) ? 'block' : 'none';
          });
        });

        list.addEventListener('click', (e) => {
          const item = e.target.closest('.swal-customer-item');
          if (item) {
            hiddenVal.value = item.getAttribute('data-id');
            textDisplay.textContent = item.getAttribute('data-name');
            textDisplay.style.color = '#1e293b';
            dropdown.style.display = 'none';
          }
        });

        document.addEventListener('click', (e) => {
          const container = document.getElementById('swal-custom-select-container');
          if (container && !container.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });

        list.querySelectorAll('.swal-customer-item').forEach(item => {
          item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f1f5f9');
          item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
        });

        flatpickr('#swal-date', {
          dateFormat: 'Y-m-d',
          locale: Arabic,
          defaultDate: new Date(),
          disableMobile: true
        });

        flatpickr('#swal-due-date', {
          dateFormat: 'Y-m-d',
          locale: Arabic,
          disableMobile: true
        });

        const typeSelect = document.getElementById('swal-type');
        const dueDateDiv = document.getElementById('swal-due-date-div');
        const origInvDiv = document.getElementById('swal-original-inv-div');
        const docNumDiv = document.getElementById('swal-doc-num-div');
        const paymentMethodDiv = document.getElementById('swal-payment-method-div');
        const openingTypeDiv = document.getElementById('swal-opening-type-div');

        const updateFieldsAdd = () => {
          const type = typeSelect.value;
          const invType = document.getElementById('swal-invoice-type') ? document.getElementById('swal-invoice-type').value : 'ذمم';
          const isInvOrReturn = type === 'فاتورة مبيعات' || type === 'مرتجع مبيعات';
          
          if (openingTypeDiv) openingTypeDiv.style.display = type === 'رصيد افتتاحي' ? 'block' : 'none';
          if (dueDateDiv) dueDateDiv.style.display = type === 'فاتورة مبيعات' ? 'block' : 'none';
          if (origInvDiv) origInvDiv.style.display = type === 'مرتجع مبيعات' ? 'block' : 'none';
          if (docNumDiv) docNumDiv.style.display = type === 'رصيد افتتاحي' ? 'none' : 'block';
          
          const invoiceTypeDiv = document.getElementById('swal-invoice-type-div');
          if (invoiceTypeDiv) invoiceTypeDiv.style.display = isInvOrReturn ? 'block' : 'none';
          
          if (paymentMethodDiv) {
            paymentMethodDiv.style.display = type === 'رصيد افتتاحي' ? 'none' : 'block';
          }
        };

        typeSelect.addEventListener('change', updateFieldsAdd);
        const invoiceTypeSelect = document.getElementById('swal-invoice-type');
        if (invoiceTypeSelect) invoiceTypeSelect.addEventListener('change', updateFieldsAdd);
        const notesSelect = document.getElementById('swal-notes');
        if (notesSelect) notesSelect.addEventListener('change', updateFieldsAdd);
        updateFieldsAdd();
        typeSelect.dispatchEvent(new Event('change'));

        // Real-time truncation of decimals beyond 3 places
        const amountInput = document.getElementById('swal-amount');
        if (amountInput) {
          amountInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.includes('.')) {
              const parts = val.split('.');
              if (parts[1] && parts[1].length > 3) {
                e.target.value = parts[0] + '.' + parts[1].substring(0, 3);
              }
            }
          });
        }
      },
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const customerId = document.getElementById('swal-customer-hidden-val').value;
        const type = document.getElementById('swal-type').value;
        const invoiceType = document.getElementById('swal-invoice-type') ? document.getElementById('swal-invoice-type').value : 'ذمم';
        const date = document.getElementById('swal-date').value;
        const docNum = document.getElementById('swal-doc-num').value.trim();
        const amount = document.getElementById('swal-amount').value;
        const notes = document.getElementById('swal-notes') ? document.getElementById('swal-notes').value : '';
        const dueDate = document.getElementById('swal-due-date').value;
        const origInv = document.getElementById('swal-original-inv').value;
        const salesRep = document.getElementById('swal-sales-rep') ? document.getElementById('swal-sales-rep').value : 'زبائن الشركة';

        if (!customerId || !date || !amount) {
          Swal.showValidationMessage('الرجاء إدخال الحقول الإجبارية واختيار الزبون من القائمة');
          return false;
        }

        if (type !== 'رصيد افتتاحي' && !docNum) {
          Swal.showValidationMessage('الرجاء إدخال رقم المستند');
          return false;
        }

        if (docNum && docNum.length > 6) {
          Swal.showValidationMessage('رقم المستند يجب ألا يتجاوز 6 خانات');
          return false;
        }

        const decimalPart = amount.includes('.') ? amount.split('.')[1] : '';
        if (decimalPart.length > 3) {
          Swal.showValidationMessage('المبلغ بالفلسات لا يجب أن يتجاوز 3 خانات');
          return false;
        }

        let finalType = type;
        let finalNotes = notes;

        if (type === 'رصيد افتتاحي') {
          const openingType = document.getElementById('swal-opening-type').value;
          if (openingType === 'دائن') {
            finalType = 'رصيد افتتاحي دائن';
          }
        }

        const isInvOrReturnAdd = type === 'فاتورة مبيعات' || type === 'مرتجع مبيعات';

        if (docNum) {
          const isDuplicateDoc = transactions.some(t =>
            t.status !== 'ملغى' &&
            t.docNumber &&
            t.docNumber.toString().trim().toLowerCase() === docNum.toLowerCase()
          );

          if (isDuplicateDoc) {
            const existingTx = transactions.find(t =>
              t.status !== 'ملغى' &&
              t.docNumber &&
              t.docNumber.toString().trim().toLowerCase() === docNum.toLowerCase()
            );
            const custName = existingTx ? existingTx.customerName || 'زبون آخر' : '';
            Swal.showValidationMessage(`رقم المستند/الفاتورة (${docNum}) مستخدم مسبقاً ${custName ? `لـ (${custName})` : 'في النظام'}`);
            return false;
          }
        }

        return { customerId, type: finalType, invoiceType, date, docNum: type === 'رصيد افتتاحي' ? '' : docNum, amount, notes: finalNotes, dueDate, origInv, salesRep };
      }
    });

    if (formValues) {
      setLoading(true);
      const chosenCustomer = customers.find(c => c.id === formValues.customerId);
      const newTx = {
        customerId: formValues.customerId,
        customerName: chosenCustomer.name,
        type: formValues.type,
        invoiceType: formValues.invoiceType,
        paymentMethod: formValues.notes,
        salesRep: formValues.salesRep,
        date: formValues.date,
        docNumber: formValues.docNum,
        amount: Number(formValues.amount),
        notes: formValues.notes,
        dueDate: formValues.dueDate,
        originalInvoice: formValues.origInv,
        status: 'معتمد',
        createdBy: user.name
      };

      await saveCustomerTransaction(newTx);
      await addLog(user.name, 'إضافة حركة', `حركة جديدة للزبون ${chosenCustomer.name} بقيمة ${formValues.amount}`);
      await fetchData();

      // Auto-select the customer if they weren't selected
      if (!selectedCustomer || selectedCustomer.id !== formValues.customerId) {
        setSelectedCustomer(chosenCustomer);
      }

      Swal.fire('تمت الإضافة', 'تمت إضافة الحركة بنجاح', 'success');
    }
  };

  const handleCancelTransaction = async (tx) => {
    if (!canPerformAction(user, 'customer_statements', 'delete')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لإلغاء الحركات', 'error');
    }

    if (tx.status === 'ملغى') return;

    const result = await Swal.fire({
      title: 'إلغاء حركة',
      text: 'إلغاء هذه الحركة سيعكس تأثيرها على الرصيد ولن يتم حذفها من السجل. هل أنت متأكد؟',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، إلغاء',
      cancelButtonText: 'تراجع',
      confirmButtonColor: '#e11d48'
    });

    if (result.isConfirmed) {
      setLoading(true);
      await saveCustomerTransaction({
        ...tx,
        status: 'ملغى',
        cancelledBy: user.name,
        cancelledAt: new Date().toISOString()
      });
      await addLog(user.name, 'إلغاء حركة', `إلغاء المستند ${tx.docNumber} للزبون ${selectedCustomer?.name}`);
      await fetchData();
    }
  };

  const handlePreviewTransaction = (tx) => {
    Swal.fire({
      title: `<div style="display:flex; align-items:center; justify-content:center; gap:8px; color:var(--primary); font-weight:800; font-size:18px;"><span>📄</span> تفاصيل المستند #${tx.docNumber}</div>`,
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-6',
        confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm'
      },
      buttonsStyling: false,
      confirmButtonText: 'إغلاق',
      html: `
        <div style="text-align: right; direction: rtl; font-family: Tajawal, sans-serif; padding-top: 14px;">
          <div style="border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 13.5px;">
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="width: 38%; padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">نوع الحركة</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #1e293b;">${tx.type}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">رقم المستند</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #0284c7;">${tx.docNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">تاريخ الحركة</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #1e293b;">${tx.date}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">المبلغ</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 900; color: #0d9488;">${formatCurrency(tx.amount)}</td>
                </tr>
                ${tx.dueDate ? `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #fffbeb; font-weight: 700; color: #b45309;">تاريخ الاستحقاق</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #d97706;">${tx.dueDate}</td>
                </tr>` : ''}
                ${tx.originalInvoice ? `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #fff1f2; font-weight: 700; color: #be123c;">رقم الفاتورة الأصلية</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #e11d48;">${tx.originalInvoice}</td>
                </tr>` : ''}
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">طريقة الدفع</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #1e293b;">${tx.notes || '-'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">الحالة</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: ${tx.status === 'ملغى' ? '#e11d48' : '#16a34a'};">${tx.status || 'معتمد'}</td>
                </tr>
                ${tx.createdBy ? `
                <tr>
                  <td style="padding: 11px 14px; background-color: #f8fafc; font-weight: 700; color: #475569;">أُنشئت بواسطة</td>
                  <td style="padding: 11px 14px; background-color: #ffffff; font-weight: 800; color: #64748b;">${tx.createdBy}</td>
                </tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
      `
    });
  };

  const handleEditTransaction = async (tx) => {
    if (!canPerformAction(user, 'customer_statements', 'edit') && !canPerformAction(user, 'customer_statements', 'add')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لتعديل الحركات', 'error');
    }

    const currentNotes = tx.notes || 'نقدي';

    const customerListHtml = customers.map(c =>
      `<li class="swal-edit-customer-item" data-id="${c.id}" data-name="${c.name}${c.phone ? ` - ${c.phone}` : ''}" style="padding: 10px 14px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">${c.name}${c.phone ? ` - ${c.phone}` : ''}</li>`
    ).join('');

    const initialCustomer = customers.find(c => c.id === tx.customerId) || selectedCustomer;
    const defaultCustomerId = initialCustomer ? initialCustomer.id : (tx.customerId || '');
    const defaultCustomerName = initialCustomer ? `${initialCustomer.name}${initialCustomer.phone ? ` - ${initialCustomer.phone}` : ''}` : (tx.customerName || 'اختر زبون...');

    const editSalesRepOptionsHtml = salesReps.map(rep => 
      `<option value="${rep}" ${(!tx.salesRep && rep === 'زبائن الشركة') || tx.salesRep === rep ? 'selected' : ''}>${rep}</option>`
    ).join('');

    const { value: formValues } = await Swal.fire({
      title: 'تعديل الحركة',
      customClass: {
        popup: 'rounded-2xl shadow-2xl p-6',
        confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-bold text-sm',
        cancelButton: 'btn btn-outline px-6 py-2.5 rounded-xl font-bold text-sm',
        actions: 'flex justify-center gap-4 mt-6 w-full'
      },
      buttonsStyling: false,
      html: `
        <div style="text-align: right; direction: rtl; font-family: Tajawal, sans-serif; padding-top: 10px;">
          <div style="margin-bottom: 14px; position: relative;" id="swal-edit-custom-select-container">
            <label style="display:block; margin-bottom: 6px; font-size: 13px; font-weight: 700; color: #475569;">اسم الزبون *</label>
            <input type="hidden" id="swal-edit-customer-hidden-val" value="${defaultCustomerId}">
            <div id="swal-edit-customer-display" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 14px; font-weight: 600; color: #1e293b; background-color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span id="swal-edit-customer-text" style="color: ${defaultCustomerId ? '#1e293b' : '#94a3b8'}">${defaultCustomerName}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #64748b;"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div id="swal-edit-customer-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; margin-top: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 50; flex-direction: column;">
              <div style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <input type="text" id="swal-edit-customer-search" placeholder="بحث باسم الزبون أو الهاتف..." style="width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; background: #f8fafc;">
              </div>
              <ul id="swal-edit-customer-list" style="list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto;">
                ${customerListHtml}
              </ul>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
            <div>
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">نوع الحركة *</label>
              <select id="swal-edit-type" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="فاتورة مبيعات" ${tx.type === 'فاتورة مبيعات' ? 'selected' : ''}>فاتورة مبيعات</option>
                <option value="دفعة" ${tx.type === 'دفعة' ? 'selected' : ''}>دفعة من الزبون</option>
                <option value="مرتجع مبيعات" ${tx.type === 'مرتجع مبيعات' ? 'selected' : ''}>مرتجع مبيعات</option>
                <option value="رصيد افتتاحي" ${tx.type === 'رصيد افتتاحي' ? 'selected' : ''}>رصيد افتتاحي</option>
                <option value="تسوية مدينة" ${tx.type === 'تسوية مدينة' ? 'selected' : ''}>تسوية مدينة (زيادة الرصيد)</option>
                <option value="تسوية دائنة" ${tx.type === 'تسوية دائنة' ? 'selected' : ''}>تسوية دائنة (تنقيص الرصيد)</option>
              </select>
            </div>
            <div>
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">تاريخ الحركة *</label>
              <input type="text" id="swal-edit-date" value="${tx.date || ''}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;">
            </div>
            <div>
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">رقم المستند *</label>
              <input type="text" id="swal-edit-doc-num" value="${tx.docNumber || ''}" maxlength="6" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
            </div>
            <div>
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">المبلغ *</label>
              <input type="number" id="swal-edit-amount" value="${tx.amount || 0}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;" step="0.001" min="0">
            </div>
            <div id="swal-edit-sales-rep-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">اسم المندوب *</label>
              <select id="swal-edit-sales-rep" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                ${editSalesRepOptionsHtml}
              </select>
            </div>
            <div id="swal-edit-invoice-type-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">نوع الفاتورة *</label>
              <select id="swal-edit-invoice-type" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="ذمم" ${(!tx.invoiceType || tx.invoiceType === 'ذمم') ? 'selected' : ''}>ذمم</option>
                <option value="نقدي" ${tx.invoiceType === 'نقدي' ? 'selected' : ''}>نقدي</option>
              </select>
            </div>
            <div id="swal-edit-payment-method-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">طريقة الدفع *</label>
              <select id="swal-edit-notes" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
                <option value="نقدي" ${currentNotes.startsWith('نقدي') ? 'selected' : ''}>نقدي</option>
                <option value="كليك" ${currentNotes.startsWith('كليك') ? 'selected' : ''}>كليك</option>
                <option value="شيك صرف" ${currentNotes.includes('شيك صرف') ? 'selected' : ''}>شيك صرف</option>
                <option value="شيك آجل" ${currentNotes.includes('شيك آجل') ? 'selected' : ''}>شيك آجل</option>
                <option value="تحويل بنكي" ${currentNotes.startsWith('تحويل بنكي') ? 'selected' : ''}>تحويل بنكي</option>
                <option value="فيزا" ${currentNotes.startsWith('فيزا') ? 'selected' : ''}>فيزا</option>
                <option value="دفعات مجزئة" ${currentNotes.startsWith('دفعات مجزئة') ? 'selected' : ''}>دفعات مجزئة</option>
              </select>
            </div>
            <div style="display: ${tx.type === 'فاتورة مبيعات' ? 'block' : 'none'};" id="swal-edit-due-date-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">تاريخ الاستحقاق</label>
              <input type="text" id="swal-edit-due-date" value="${tx.dueDate || ''}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none; cursor: pointer;">
            </div>
            <div style="display: ${tx.type === 'مرتجع مبيعات' ? 'block' : 'none'};" id="swal-edit-original-inv-div">
              <label style="display:block; margin-bottom: 4px; font-size: 12.5px; font-weight: 700; color: #475569;">رقم الفاتورة الأصلية (للمرتجعات)</label>
              <input type="text" id="swal-edit-original-inv" value="${tx.originalInvoice || ''}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; color: #1e293b; background-color: #fff; outline: none;">
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        // Customer Select Dropdown Event Listeners
        const display = document.getElementById('swal-edit-customer-display');
        const dropdown = document.getElementById('swal-edit-customer-dropdown');
        const search = document.getElementById('swal-edit-customer-search');
        const list = document.getElementById('swal-edit-customer-list');
        const hiddenVal = document.getElementById('swal-edit-customer-hidden-val');
        const textDisplay = document.getElementById('swal-edit-customer-text');

        if (display && dropdown && search && list) {
          display.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
            if (dropdown.style.display === 'flex') {
              search.value = '';
              search.dispatchEvent(new Event('input'));
              search.focus();
            }
          });

          search.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = list.querySelectorAll('.swal-edit-customer-item');
            items.forEach(item => {
              const name = item.getAttribute('data-name').toLowerCase();
              item.style.display = matchesSearch(name, term) ? 'block' : 'none';
            });
          });

          list.addEventListener('click', (e) => {
            const item = e.target.closest('.swal-edit-customer-item');
            if (item) {
              hiddenVal.value = item.getAttribute('data-id');
              textDisplay.textContent = item.getAttribute('data-name');
              textDisplay.style.color = '#1e293b';
              dropdown.style.display = 'none';
            }
          });

          document.addEventListener('click', (e) => {
            const container = document.getElementById('swal-edit-custom-select-container');
            if (container && !container.contains(e.target)) {
              dropdown.style.display = 'none';
            }
          });

          list.querySelectorAll('.swal-edit-customer-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f1f5f9');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
          });
        }

        flatpickr('#swal-edit-date', { dateFormat: 'Y-m-d', locale: Arabic });
        flatpickr('#swal-edit-due-date', { dateFormat: 'Y-m-d', locale: Arabic });

        const typeSelect = document.getElementById('swal-edit-type');
        const dueDateDiv = document.getElementById('swal-edit-due-date-div');
        const origInvDiv = document.getElementById('swal-edit-original-inv-div');

        const updateFieldsEdit = () => {
          const type = typeSelect.value;
          const isInvOrReturn = type === 'فاتورة مبيعات' || type === 'مرتجع مبيعات';
          
          if (dueDateDiv) dueDateDiv.style.display = type === 'فاتورة مبيعات' ? 'block' : 'none';
          if (origInvDiv) origInvDiv.style.display = type === 'مرتجع مبيعات' ? 'block' : 'none';
          
          const invoiceTypeDiv = document.getElementById('swal-edit-invoice-type-div');
          if (invoiceTypeDiv) invoiceTypeDiv.style.display = isInvOrReturn ? 'block' : 'none';
          
          const paymentMethodDiv = document.getElementById('swal-edit-payment-method-div');
          if (paymentMethodDiv) {
            paymentMethodDiv.style.display = type === 'رصيد افتتاحي' ? 'none' : 'block';
          }
        };

        typeSelect.addEventListener('change', updateFieldsEdit);
        const invoiceTypeSelect = document.getElementById('swal-edit-invoice-type');
        if (invoiceTypeSelect) invoiceTypeSelect.addEventListener('change', updateFieldsEdit);
        const notesSelect = document.getElementById('swal-edit-notes');
        if (notesSelect) notesSelect.addEventListener('change', updateFieldsEdit);
        updateFieldsEdit();
      },
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const customerId = document.getElementById('swal-edit-customer-hidden-val').value;
        const type = document.getElementById('swal-edit-type').value;
        const invoiceType = document.getElementById('swal-edit-invoice-type') ? document.getElementById('swal-edit-invoice-type').value : 'ذمم';
        const date = document.getElementById('swal-edit-date').value;
        const docNum = document.getElementById('swal-edit-doc-num').value.trim();
        const amount = document.getElementById('swal-edit-amount').value;
        const notes = document.getElementById('swal-edit-notes').value;
        const dueDate = document.getElementById('swal-edit-due-date').value;
        const origInv = document.getElementById('swal-edit-original-inv').value;
        const salesRep = document.getElementById('swal-edit-sales-rep') ? document.getElementById('swal-edit-sales-rep').value : 'زبائن الشركة';

        if (!customerId || !date || !docNum || !amount) {
          Swal.showValidationMessage('الرجاء إدخال الحقول الإجبارية واختيار الزبون من القائمة');
          return false;
        }

        if (docNum) {
          const isDuplicateDoc = transactions.some(t =>
            t.id !== tx.id &&
            t.status !== 'ملغى' &&
            t.docNumber &&
            t.docNumber.toString().trim().toLowerCase() === docNum.toLowerCase()
          );

          if (isDuplicateDoc) {
            const existingTx = transactions.find(t =>
              t.id !== tx.id &&
              t.status !== 'ملغى' &&
              t.docNumber &&
              t.docNumber.toString().trim().toLowerCase() === docNum.toLowerCase()
            );
            const custName = existingTx ? existingTx.customerName || 'زبون آخر' : '';
            Swal.showValidationMessage(`رقم المستند/الفاتورة (${docNum}) مستخدم مسبقاً ${custName ? `لـ (${custName})` : 'في النظام'}`);
            return false;
          }
        }

        return { customerId, type, invoiceType, date, docNum, amount: Number(amount), notes, dueDate, origInv, salesRep };
      }
    });

    if (formValues) {
      setLoading(true);
      const chosenCustomer = customers.find(c => c.id === formValues.customerId);
      const updatedTx = {
        ...tx,
        customerId: formValues.customerId,
        customerName: chosenCustomer ? chosenCustomer.name : tx.customerName,
        type: formValues.type,
        invoiceType: formValues.invoiceType,
        paymentMethod: formValues.notes,
        salesRep: formValues.salesRep,
        date: formValues.date,
        docNumber: formValues.docNum,
        amount: formValues.amount,
        notes: formValues.notes,
        dueDate: formValues.dueDate,
        originalInvoice: formValues.origInv,
        updatedBy: user.name
      };

      await saveCustomerTransaction(updatedTx);
      await addLog(user.name, 'تعديل حركة', `تعديل المستند ${formValues.docNum} للزبون ${chosenCustomer ? chosenCustomer.name : tx.customerName}`);
      await fetchData();
      Swal.fire('تم الحفظ', 'تمت التعديلات بنجاح', 'success');
    }
  };

  const handleDeleteOrCancelTransaction = async (tx) => {
    if (!canPerformAction(user, 'customer_statements', 'delete')) {
      return Swal.fire('عذراً', 'لا تملك صلاحية لتنفيذ هذا الإجراء', 'error');
    }

    const result = await Swal.fire({
      title: 'إلغاء أو حذف الحركة',
      text: `المستند رقم: ${tx.docNumber} بقيمة ${formatCurrency(tx.amount)}`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'إلغاء الحركة',
      denyButtonText: 'حذف نهائي',
      cancelButtonText: 'تراجع',
      confirmButtonColor: '#ea580c',
      denyButtonColor: '#e11d48'
    });

    if (result.isConfirmed) {
      setLoading(true);
      await saveCustomerTransaction({
        ...tx,
        status: 'ملغى',
        cancelledBy: user.name,
        cancelledAt: new Date().toISOString()
      });
      await addLog(user.name, 'إلغاء حركة', `إلغاء المستند ${tx.docNumber} للزبون ${selectedCustomer?.name}`);
      await fetchData();
      Swal.fire('تم الإلغاء', 'تم إلغاء الحركة وتحديث الرصيد بنجاح', 'success');
    } else if (result.isDenied) {
      setLoading(true);
      await deleteCustomerTransaction(tx.id);
      await addLog(user.name, 'حذف حركة', `حذف المستند ${tx.docNumber} للزبون ${selectedCustomer?.name}`);
      await fetchData();
      Swal.fire('تم الحذف', 'تم حذف الحركة من النظام بنجاح', 'success');
    }
  };

  const handlePrint = (targetCust = null) => {
    const cust = (targetCust && targetCust.id) ? targetCust : selectedCustomer;
    if (!cust) {
      return Swal.fire('تنبيه', 'الرجاء اختيار زبون أولاً لطباعة كشف الحساب', 'warning');
    }

    let txsForPrint = [];
    if (cust.id === selectedCustomer?.id) {
      txsForPrint = displayTxs;
    } else {
      let rawTxs = transactions.filter(t => t.customerId === cust.id && t.status !== 'ملغى');
      rawTxs.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        if (dateA - dateB !== 0) return dateA - dateB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      let running = 0;
      txsForPrint = rawTxs.map(t => {
        let debit = 0, credit = 0;
        if (t.type === 'فاتورة مبيعات' || t.type === 'رصيد افتتاحي' || t.type === 'تسوية مدينة') {
          debit = Number(t.amount) || 0;
        } else if (t.type === 'دفعة' || t.type === 'مرتجع مبيعات' || t.type === 'تسوية دائنة' || t.type === 'رصيد افتتاحي دائن' || t.type === 'خصم') {
          credit = Number(t.amount) || 0;
        }
        running += debit - credit;
        return { ...t, debit, credit, runningBalance: running };
      });
    }

    const printPortal = document.getElementById('print-portal');
    if (!printPortal) {
      window.print();
      return;
    }

    let dateRangeText = 'كافة الفترات';
    if (dateMode === 'day' && selectedDate) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${selectedDate}</span>`;
    } else if (dateMode === 'month' && selectedMonth) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${selectedMonth}</span>`;
    } else if (dateMode === 'range' && startDate && endDate) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${startDate}</span> <span style="margin: 0 4px; font-weight: bold;">إلى</span> <span dir="ltr" style="display: inline-block;">${endDate}</span>`;
    } else if (dateMode === 'range' && (startDate || endDate)) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${startDate || '-'}</span> <span style="margin: 0 4px; font-weight: bold;">إلى</span> <span dir="ltr" style="display: inline-block;">${endDate || '-'}</span>`;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const issueDateText = `<span dir="ltr" style="display: inline-block;">${yyyy}-${mm}-${dd}</span>`;

    const periodTxsOnly = txsForPrint.filter(tx => !tx.isPreviousBalance);
    const totalDebitSum = periodTxsOnly.reduce((acc, tx) => acc + Number(tx.debit || 0), 0);
    const totalCreditSum = periodTxsOnly.reduce((acc, tx) => acc + Number(tx.credit || 0), 0);
    const finalBalance = txsForPrint.length > 0 ? (txsForPrint[txsForPrint.length - 1].runningBalance || 0) : 0;

    const printHtml = `
      <div class="statement-print-layout" style="direction: rtl; font-family: 'Tajawal', sans-serif; background: #ffffff; color: #0f172a; width: 100%; box-sizing: border-box; padding: 20px 30px;">
        
        <!-- Large Centered Title -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">كشف حساب</h1>
        </div>

        <!-- Top Metadata Grid (Two symmetric boxes matching reference) -->
        <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px;">
          <!-- Right Table (الجهة / العملة) -->
          <table style="flex: 1; border-collapse: collapse; border: 1.5px solid #0f766e; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1.5px solid #0f766e;">
                <td style="width: 30%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 14px; text-align: right !important; border-left: 1.5px solid #0f766e;">الجهة</td>
                <td style="width: 70%; background-color: #ffffff; font-weight: 800; color: #0f172a; padding: 8px 14px; text-align: right !important;">${cust.name}</td>
              </tr>
              <tr>
                <td style="width: 30%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 14px; text-align: right !important; border-left: 1.5px solid #0f766e;">العملة</td>
                <td style="width: 70%; background-color: #ffffff; font-weight: 800; color: #0f172a; padding: 8px 14px; text-align: right !important;">دينار أردني</td>
              </tr>
            </tbody>
          </table>

          <!-- Left Table (الفترة / تاريخ الإصدار) -->
          <table style="flex: 1; border-collapse: collapse; border: 1.5px solid #0f766e; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1.5px solid #0f766e;">
                <td style="width: 35%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 14px; text-align: right !important; border-left: 1.5px solid #0f766e;">الفترة</td>
                <td style="width: 65%; background-color: #ffffff; font-weight: 800; color: #0f172a; padding: 8px 14px; text-align: right !important;">${dateRangeText}</td>
              </tr>
              <tr>
                <td style="width: 35%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 14px; text-align: right !important; border-left: 1.5px solid #0f766e;">تاريخ الإصدار</td>
                <td style="width: 65%; background-color: #ffffff; font-weight: 800; color: #0f172a; padding: 8px 14px; text-align: right !important;">${issueDateText}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Main Transactions Table -->
        <table class="main-tx-table" style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12.5px; border: 1.5px solid #0f766e;">
          <thead style="display: table-header-group !important;">
            <tr style="background-color: #0f766e !important; color: #ffffff !important;">
              <th style="padding: 9px 4px; text-align: center !important; font-weight: 900; width: 5%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">م</th>
              <th style="padding: 9px 12px; text-align: center !important; font-weight: 900; width: 35%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">البيان</th>
              <th style="padding: 9px 6px; text-align: center !important; font-weight: 900; width: 16%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">التاريخ</th>
              <th style="padding: 9px 6px; text-align: center !important; font-weight: 900; width: 14%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">المرجع</th>
              <th style="padding: 9px 6px; text-align: center !important; font-weight: 900; width: 10%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">مدين</th>
              <th style="padding: 9px 6px; text-align: center !important; font-weight: 900; width: 10%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">دائن</th>
              <th style="padding: 9px 6px; text-align: center !important; font-weight: 900; width: 10%; border: 1px solid #0f766e; background-color: #0f766e !important; color: #ffffff !important;">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${txsForPrint.length > 0 ? txsForPrint.map((tx, idx) => `
              <tr style="border-bottom: 1px solid #cbd5e1; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''} ${tx.status === 'ملغى' ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                <td style="padding: 8px 4px; text-align: center !important; font-weight: 800; color: #64748b; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 8px 12px; text-align: right !important; font-weight: 700; color: #1e293b; border: 1px solid #cbd5e1;">${tx.type}</td>
                <td style="padding: 8px 6px; text-align: center !important; font-weight: 600; color: #334155; border: 1px solid #cbd5e1;" dir="ltr">${tx.date || '-'}</td>
                <td style="padding: 8px 6px; text-align: center !important; font-weight: 700; color: #334155; border: 1px solid #cbd5e1;">${tx.docNumber || '-'}</td>
                <td style="padding: 8px 6px; text-align: center !important; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1;">${tx.debit ? Number(tx.debit).toFixed(3) : '-'}</td>
                <td style="padding: 8px 6px; text-align: center !important; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1;">${tx.credit ? Number(tx.credit).toFixed(3) : '-'}</td>
                <td style="padding: 8px 6px; text-align: center !important; font-weight: 900; color: #059669; border: 1px solid #cbd5e1;">${Number(tx.runningBalance || 0).toFixed(3)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7" style="padding: 20px; text-align: center !important; color: #94a3b8; font-weight: 700; border: 1px solid #cbd5e1;">لا توجد حركات في الكشف</td>
              </tr>
            `}
            <!-- Total Summary Row -->
            <tr style="background-color: #f1f5f9; border-top: 2px solid #94a3b8; font-weight: 900;">
              <td colspan="4" style="padding: 10px 12px; text-align: center !important; font-size: 13.5px; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">الإجمالي</td>
              <td style="padding: 10px 6px; text-align: center !important; font-size: 13px; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${totalDebitSum.toFixed(3)}</td>
              <td style="padding: 10px 6px; text-align: center !important; font-size: 13px; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${totalCreditSum.toFixed(3)}</td>
              <td style="padding: 10px 6px; text-align: center !important; font-size: 14px; color: #059669; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${finalBalance.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Footer Legal Notice -->
        <div style="margin-top: 28px; text-align: right !important; font-size: 12px; font-weight: 700; color: #0f766e;">
          يُعد هذا الكشف صحيحاً ما لم يتم الاعتراض عليه خلال 7 أيام من تاريخ الإصدار، باستثناء السهو أو الخطأ.
        </div>
      </div>
    `;

    printPortal.innerHTML = printHtml;
    
    // We add a setTimeout to give the mobile browser time to render the DOM
    // before the print dialog opens, fixing the blank page issue on mobile.
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const buildStatementHtml = () => {
    let dateRangeText = 'كافة الفترات';
    if (dateMode === 'day' && selectedDate) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${selectedDate}</span>`;
    } else if (dateMode === 'month' && selectedMonth) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${selectedMonth}</span>`;
    } else if (dateMode === 'range' && startDate && endDate) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${startDate}</span> <span style="margin: 0 4px; font-weight: bold;">إلى</span> <span dir="ltr" style="display: inline-block;">${endDate}</span>`;
    } else if (dateMode === 'range' && (startDate || endDate)) {
      dateRangeText = `<span dir="ltr" style="display: inline-block;">${startDate || '-'}</span> <span style="margin: 0 4px; font-weight: bold;">إلى</span> <span dir="ltr" style="display: inline-block;">${endDate || '-'}</span>`;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const issueDateText = `<span dir="ltr" style="display: inline-block;">${yyyy}-${mm}-${dd}</span>`;

    const totalDebitSum = displayTxs.reduce((acc, tx) => acc + Number(tx.debit || 0), 0);
    const totalCreditSum = displayTxs.reduce((acc, tx) => acc + Number(tx.credit || 0), 0);
    const finalBalance = summary ? summary.finalBalance : 0;

    return {
      html: `
      <div class="statement-pdf-layout" style="direction: rtl; font-family: Arial, 'Tajawal', sans-serif; background: #ffffff; color: #0f172a; width: 760px; box-sizing: border-box; padding: 20px 30px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a;">كشف حساب</h1>
        </div>

        <!-- Metadata: use a single outer table for safe rendering in html2canvas -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f766e;">
                  <tbody>
                    <tr style="border-bottom: 1.5px solid #0f766e;">
                      <td style="width: 35%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 12px; text-align: right; border-left: 1.5px solid #0f766e;">الجهة</td>
                      <td style="background-color: #ffffff; font-weight: 700; color: #0f172a; padding: 8px 12px; text-align: right;">${selectedCustomer.name}</td>
                    </tr>
                    <tr>
                      <td style="width: 35%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 12px; text-align: right; border-left: 1.5px solid #0f766e;">العملة</td>
                      <td style="background-color: #ffffff; font-weight: 700; color: #0f172a; padding: 8px 12px; text-align: right;">دينار أردني</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f766e;">
                  <tbody>
                    <tr style="border-bottom: 1.5px solid #0f766e;">
                      <td style="width: 40%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 12px; text-align: right; border-left: 1.5px solid #0f766e;">الفترة</td>
                      <td style="background-color: #ffffff; font-weight: 700; color: #0f172a; padding: 8px 12px; text-align: right;">${dateRangeText}</td>
                    </tr>
                    <tr>
                      <td style="width: 40%; background-color: #0f766e; color: #ffffff; font-weight: 800; padding: 8px 12px; text-align: right; border-left: 1.5px solid #0f766e;">تاريخ الإصدار</td>
                      <td style="background-color: #ffffff; font-weight: 700; color: #0f172a; padding: 8px 12px; text-align: right;">${issueDateText}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Main Transactions Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; border: 1.5px solid #0f766e; table-layout: fixed;">
          <colgroup>
            <col style="width: 5%">
            <col style="width: 35%">
            <col style="width: 16%">
            <col style="width: 14%">
            <col style="width: 10%">
            <col style="width: 10%">
            <col style="width: 10%">
          </colgroup>
          <thead>
            <tr style="background-color: #0f766e; color: #ffffff;">
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">م</th>
              <th style="padding: 8px 8px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">البيان</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">التاريخ</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">المرجع</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">مدين</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">دائن</th>
              <th style="padding: 8px 4px; text-align: center; font-weight: 900; border: 1px solid #0f766e; color: #ffffff; background-color: #0f766e;">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${displayTxs.length > 0 ? displayTxs.map((tx, idx) => `
              <tr style="border-bottom: 1px solid #cbd5e1; background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; ${tx.status === 'ملغى' ? 'text-decoration: line-through; opacity: 0.5;' : ''}">
                <td style="padding: 7px 4px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #cbd5e1;">${idx + 1}</td>
                <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #1e293b; border: 1px solid #cbd5e1; word-break: break-word;">${tx.type}</td>
                <td style="padding: 7px 4px; text-align: center; font-weight: 600; color: #334155; border: 1px solid #cbd5e1;" dir="ltr">${tx.date || '-'}</td>
                <td style="padding: 7px 4px; text-align: center; font-weight: 700; color: #334155; border: 1px solid #cbd5e1;">${tx.docNumber || '-'}</td>
                <td style="padding: 7px 4px; text-align: center; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1;">${tx.debit ? Number(tx.debit).toFixed(3) : '-'}</td>
                <td style="padding: 7px 4px; text-align: center; font-weight: 800; color: #1e293b; border: 1px solid #cbd5e1;">${tx.credit ? Number(tx.credit).toFixed(3) : '-'}</td>
                <td style="padding: 7px 4px; text-align: center; font-weight: 900; color: #059669; border: 1px solid #cbd5e1;">${Number(tx.runningBalance || 0).toFixed(3)}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="7" style="padding: 16px; text-align: center; color: #94a3b8; font-weight: 700; border: 1px solid #cbd5e1;">لا توجد حركات في الكشف</td></tr>
            `}
            <tr style="background-color: #f1f5f9; border-top: 2px solid #94a3b8;">
              <td colspan="4" style="padding: 9px 10px; text-align: center; font-size: 13px; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">الإجمالي</td>
              <td style="padding: 9px 4px; text-align: center; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${totalDebitSum.toFixed(3)}</td>
              <td style="padding: 9px 4px; text-align: center; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${totalCreditSum.toFixed(3)}</td>
              <td style="padding: 9px 4px; text-align: center; font-weight: 900; color: #059669; border: 1px solid #cbd5e1; background-color: #f1f5f9;">${finalBalance.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 24px; text-align: right; font-size: 11px; font-weight: 700; color: #0f766e;">
          يُعد هذا الكشف صحيحاً ما لم يتم الاعتراض عليه خلال 7 أيام من تاريخ الإصدار، باستثناء السهو أو الخطأ.
        </div>
      </div>
    `, issueDateText
    };
  };

  const handleWhatsApp = async () => {
    if (!selectedCustomer) {
      return Swal.fire('تنبيه', 'الرجاء اختيار زبون أولاً', 'warning');
    }

    const portal = document.getElementById('print-portal');
    if (!portal) {
      return Swal.fire('خطأ', 'تعذر العثور على منطقة الطباعة', 'error');
    }

    Swal.fire({
      title: 'جاري تجهيز كشف الحساب...',
      html: 'يرجى الانتظار لحين إنشاء ملف PDF ومشاركته.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const { html: printHtml, issueDateText } = buildStatementHtml();
      portal.innerHTML = printHtml;

      const printEl = portal.querySelector('.statement-pdf-layout');

      // Save portal styles
      const savedStyles = {
        display: portal.style.display,
        position: portal.style.position,
        top: portal.style.top,
        left: portal.style.left,
        zIndex: portal.style.zIndex,
        width: portal.style.width,
        direction: portal.style.direction,
      };

      // Make portal visible but off-screen for html2pdf capture
      portal.style.display = 'block';
      portal.style.position = 'absolute';
      portal.style.top = '0';
      portal.style.right = '0';
      portal.style.left = 'auto';
      portal.style.width = '800px';
      portal.style.zIndex = '-9999';
      portal.style.setProperty('direction', 'rtl', 'important'); // override direction: ltr !important from CSS

      const savedElWidth = printEl.style.width;
      const savedElMinWidth = printEl.style.minWidth;
      printEl.style.width = '800px';
      printEl.style.minWidth = '800px';

      const { default: html2pdf } = await import('html2pdf.js');

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `كشف_حساب_${selectedCustomer.name}_${issueDateText.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800, width: 800 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(printEl).output('blob');

      // Restore styles
      printEl.style.width = savedElWidth;
      printEl.style.minWidth = savedElMinWidth;
      Object.assign(portal.style, savedStyles);
      setTimeout(() => { portal.innerHTML = ''; }, 300);

      Swal.close();

      const fileName = `كشف_حساب_${selectedCustomer.name}_${issueDateText.replace(/\//g, '-')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كشف حساب - ${selectedCustomer.name}`,
          text: `مرفق كشف حساب ${selectedCustomer.name} بتاريخ ${issueDateText}`
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.click();
        Swal.fire({ icon: 'success', title: 'تم تحميل الملف', text: 'تم تحميل ملف PDF بنجاح. يمكنك مشاركته يدوياً عبر واتساب.' });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error generating statement PDF:', error);
        Swal.fire({ icon: 'error', title: 'فشلت المشاركة', text: 'حدث خطأ أثناء إنشاء ملف PDF.' });
      } else {
        Swal.close();
      }
    }
  };

  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  return (
    <div className="animate-fade-in" style={{ direction: 'rtl' }}>
      {loading && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Top Header & Customer Selection (Only when no customer is selected) */}
      {!selectedCustomer && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem', marginBottom: '1.5rem', padding: isMobile ? '0 0.5rem' : '0' }} className="print:hidden">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#0f172a' }}>
                <FileText color="#0f766e" /> كشوفات سريعة
              </h2>
              {isMobile && (
                <button
                  id="btn-print-statement"
                  onClick={handlePrint}
                  style={{ backgroundColor: 'white', color: '#0f766e', border: '1px solid #0f766e', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Printer size={18} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: isMobile ? '0.25rem' : '0' }}>
              {canPerformAction(user, 'customer_statements', 'add') && (
                <>
                  <button
                    onClick={handleAddDiscount}
                    style={{ flex: 1, backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={isMobile ? 14 : 18} /> خصم
                  </button>
                  <button
                    onClick={handleAddPayment}
                    style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={isMobile ? 14 : 18} /> دفعة
                  </button>
                  <button
                    onClick={handleAddTransaction}
                    style={{ flex: 1.5, backgroundColor: '#0f766e', color: 'white', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={isMobile ? 14 : 18} /> إضافة حركة
                  </button>
                </>
              )}
              {!isMobile && (
                <button
                  id="btn-print-statement"
                  onClick={handlePrint}
                  style={{ backgroundColor: 'white', color: '#0f766e', border: '1px solid #0f766e', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Printer size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection & Filters */}
          <div className="glass-panel mb-6 print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:py-3 md:px-4 relative z-40">
            <div className="w-full md:flex-1 md:max-w-[450px] relative z-50">
              <Select
                options={customers.map(c => ({ value: c, label: c.name + (c.phone ? ` - ${c.phone}` : '') }))}
                onChange={(opt) => setSelectedCustomer(opt ? opt.value : null)}
                placeholder="اختر زبون..."
                isClearable
                isSearchable

                className="react-select-container"
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#cbd5e1' }
                  })
                }}
              />
            </div>

            <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0">
              <HRDateFilter
                mode={dateMode}
                setMode={setDateMode}
                date={selectedDate}
                setDate={setSelectedDate}
                month={selectedMonth}
                setMonth={setSelectedMonth}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                allowedModes={['day', 'month', 'range']}
              />
            </div>
          </div>
        </>
      )}

      {/* Print Header (Only visible on print) */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">كشف حساب زبون</h2>
        {selectedCustomer && (
          <div className="flex justify-between text-lg mt-4">
            <div><strong>اسم الزبون:</strong> {selectedCustomer.name}</div>
            {selectedCustomer.phone && <div><strong>رقم الهاتف:</strong> {selectedCustomer.phone}</div>}
          </div>
        )}
      </div>

      {/* Summary Cards (Always Visible) */}
      <div className="mb-6">
        {isMobile ? (
          /* Mobile Summary Cards (Only when no customer is selected) */
          !selectedCustomer && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '0 8px 16px 8px' }}>
              {/* Card 5: الرصيد المطلوب (Spans full width) */}
              <div style={{ gridColumn: 'span 2', backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ color: '#1e293b', fontSize: '13px', fontWeight: '900' }}>الرصيد المطلوب النهائي</span>
                  <div style={{ color: '#0d9488', fontSize: '20px', fontWeight: '900' }} dir="ltr">
                    {formatCurrency(summary.finalBalance)} <span style={{ fontSize: '11px', fontWeight: 'bold' }}>د.أ</span>
                  </div>
                </div>
              </div>

              {/* Card 4: إجمالي الفواتير */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} />
                  </div>
                  <span style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>إجمالي الفواتير</span>
                </div>
                <div style={{ color: '#16a34a', fontSize: '16px', fontWeight: '900', textAlign: 'right' }} dir="ltr">
                  {formatCurrency(summary.totalInvoices)} <span style={{ fontSize: '10px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>

              {/* Card 3: إجمالي الدفعات */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={16} />
                  </div>
                  <span style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>إجمالي الدفعات</span>
                </div>
                <div style={{ color: '#2563eb', fontSize: '16px', fontWeight: '900', textAlign: 'right' }} dir="ltr">
                  {formatCurrency(summary.totalPayments)} <span style={{ fontSize: '10px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>

              {/* Card 2: المرتجعات */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Undo2 size={16} />
                  </div>
                  <span style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>المرتجعات</span>
                </div>
                <div style={{ color: '#dc2626', fontSize: '16px', fontWeight: '900', textAlign: 'right' }} dir="ltr">
                  {formatCurrency(summary.totalReturns)} <span style={{ fontSize: '8px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>

              {/* Card 1: مستحقات متأخرة */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} />
                  </div>
                  <span style={{ color: '#1e293b', fontSize: '12px', fontWeight: '900' }}>مستحقات متأخرة</span>
                </div>
                <div style={{ color: '#ea580c', fontSize: '16px', fontWeight: '900', textAlign: 'right' }} dir="ltr">
                  {formatCurrency(summary.dueInvoices)} <span style={{ fontSize: '10px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Desktop Summary Cards - Side by side with shared border */
          <div style={{
            display: 'flex',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            fontFamily: 'Tajawal, sans-serif'
          }}>
            {/* Card 1: الرصيد النهائي المطلوب */}
            <div className="transition-all hover:brightness-95" style={{
              flex: 1,
              backgroundColor: '#f0fdfa',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderLeft: '1.5px solid #e2e8f0',
              cursor: 'default'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ccfbf1', color: '#0d9488' }}>
                <DollarSign size={20} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>الرصيد النهائي المطلوب</div>
              <div style={{ color: '#0d9488', fontSize: '1.1rem', fontWeight: '900' }} dir="ltr">{formatCurrency(summary.finalBalance)}</div>
            </div>

            {/* Card 2: إجمالي الفواتير */}
            <div className="transition-all hover:brightness-95" style={{
              flex: 1,
              backgroundColor: '#f0fdf4',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderLeft: '1.5px solid #e2e8f0',
              cursor: 'default'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                <Receipt size={20} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>إجمالي الفواتير</div>
              <div style={{ color: '#16a34a', fontSize: '1.1rem', fontWeight: '900' }} dir="ltr">{formatCurrency(summary.totalInvoices)}</div>
            </div>

            {/* Card 3: إجمالي الدفعات */}
            <div className="transition-all hover:brightness-95" style={{
              flex: 1,
              backgroundColor: '#eff6ff',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderLeft: '1.5px solid #e2e8f0',
              cursor: 'default'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                <CreditCard size={20} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>إجمالي الدفعات</div>
              <div style={{ color: '#2563eb', fontSize: '1.1rem', fontWeight: '900' }} dir="ltr">{formatCurrency(summary.totalPayments)}</div>
            </div>

            {/* Card 4: المرتجعات */}
            <div className="transition-all hover:brightness-95" style={{
              flex: 1,
              backgroundColor: '#fef2f2',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderLeft: '1.5px solid #e2e8f0',
              cursor: 'default'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <Undo2 size={20} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>المرتجعات</div>
              <div style={{ color: '#dc2626', fontSize: '1.1rem', fontWeight: '900' }} dir="ltr">{formatCurrency(summary.totalReturns)}</div>
            </div>

            {/* Card 5: مستحقات متأخرة */}
            <div className="print:hidden transition-all hover:brightness-95" style={{
              flex: 1,
              backgroundColor: '#fff7ed',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'default'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffedd5', color: '#ea580c' }}>
                <Clock size={20} />
              </div>
              <div style={{ color: '#64748b', fontSize: '11.5px', fontWeight: '700', textAlign: 'center', lineHeight: '1.3' }}>مستحقات متأخرة</div>
              <div style={{ color: '#ea580c', fontSize: '1.1rem', fontWeight: '900' }} dir="ltr">{formatCurrency(summary.dueInvoices)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {selectedCustomer ? (
        isMobile ? (
          /* Mobile Customer Statement Preview matching design */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'Tajawal, sans-serif', paddingBottom: '80px' }}>
            
            {/* 1. Mobile Header Row: Back button, Customer Name, Month Filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Back Button */}
                <div style={{ alignSelf: 'flex-start' }}>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '6px 12px',
                      fontWeight: '800',
                      fontSize: '13px',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowRight size={15} color="#0f766e" />
                    <span>رجوع للقائمة</span>
                  </button>
                </div>

                {/* Customer Name */}
                <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a', lineHeight: '1.4' }}>
                    {selectedCustomer.name}
                  </h3>
                </div>
              </div>

              {/* Month / Date Filter */}
              <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'center' }}>
                <HRDateFilter
                  mode={dateMode}
                  setMode={setDateMode}
                  date={selectedDate}
                  setDate={setSelectedDate}
                  month={selectedMonth}
                  setMonth={setSelectedMonth}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  allowedModes={['day', 'month', 'range']}
                />
              </div>
            </div>

            {/* 2. Top 3 Summary Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {/* Card 1: إجمالي الفواتير */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={14} />
                </div>
                <span style={{ color: '#475569', fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }}>إجمالي الفواتير</span>
                <div style={{ color: '#16a34a', fontSize: '11.5px', fontWeight: '900' }} dir="ltr">
                  {formatCurrency(summary.totalInvoices)} <span style={{ fontSize: '8px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>

              {/* Card 2: إجمالي الدفعات */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={14} />
                </div>
                <span style={{ color: '#475569', fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }}>إجمالي الدفعات</span>
                <div style={{ color: '#2563eb', fontSize: '11.5px', fontWeight: '900' }} dir="ltr">
                  {formatCurrency(summary.totalPayments)} <span style={{ fontSize: '8px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>

              {/* Card 3: الرصيد المطلوب */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={14} />
                </div>
                <span style={{ color: '#475569', fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }}>الرصيد المطلوب</span>
                <div style={{ color: '#dc2626', fontSize: '11.5px', fontWeight: '900' }} dir="ltr">
                  {formatCurrency(Math.abs(summary.finalBalance))} <span style={{ fontSize: '8px', fontWeight: 'bold' }}>د.أ</span>
                </div>
              </div>
            </div>

            {/* Quick Action Bar for Admin (Print, Payment, Transaction) */}
            <div style={{ display: 'grid', gridTemplateColumns: canPerformAction(user, 'customer_statements', 'add') ? 'repeat(4, 1fr)' : '1fr', gap: '6px' }} className="no-print">
              {canPerformAction(user, 'customer_statements', 'add') && (
                <>
                  <button onClick={handleAddPayment} style={{ height: '36px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '11.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer', padding: '0 2px' }}>
                    <Plus size={13} /> <span>دفعة</span>
                  </button>
                  <button onClick={handleAddDiscount} style={{ height: '36px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '11.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer', padding: '0 2px' }}>
                    <Plus size={13} /> <span>خصم</span>
                  </button>
                  <button onClick={handleAddTransaction} style={{ height: '36px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '11.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer', padding: '0 2px' }}>
                    <Plus size={13} /> <span>إضافة حركة</span>
                  </button>
                </>
              )}
              <button onClick={handlePrint} style={{ height: '36px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '11.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer', padding: '0 2px' }}>
                <Printer size={13} /> <span>طباعة</span>
              </button>
            </div>

            {/* 4. Movement Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#475569', flexShrink: 0 }}>
                <Filter size={15} color="#0f766e" />
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="رقم المستند..."
                  value={docNumberFilter}
                  onChange={(e) => setDocNumberFilter(e.target.value)}
                  style={{ width: '100%', height: '34px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 28px 0 8px', fontSize: '11.5px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 'bold' }}
                />
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', fontWeight: 'bold', flexShrink: 0 }}>
                <span>من:</span>
                <div style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={13} color="#64748b" />
                </div>
              </div>
            </div>

            {/* 5. Movements Table (Mobile Optimized - Guaranteed No Overflow) */}
            <style>{`
              .mobile-statement-table {
                display: table !important;
                table-layout: fixed !important;
                width: 100% !important;
                max-width: 100vw !important;
                border-collapse: collapse !important;
                margin: 0 !important;
              }
              table.mobile-statement-table thead,
              table.mobile-statement-table tbody,
              table.mobile-statement-table thead tr,
              table.mobile-statement-table tbody tr {
                display: contents; /* fallback */
              }
              table.mobile-statement-table thead {
                display: table-header-group !important;
                position: static !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
                width: auto !important;
                clip: auto !important;
                overflow: visible !important;
              }
              table.mobile-statement-table tbody {
                display: table-row-group !important;
              }
              table.mobile-statement-table tr {
                display: table-row !important;
                position: static !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              table.mobile-statement-table th,
              table.mobile-statement-table td {
                display: table-cell !important;
                padding: 6px 2px !important;
                border: none !important;
                border-bottom: 1px solid #f1f5f9 !important;
                text-align: center !important;
                vertical-align: middle !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                color: #334155 !important;
                line-height: 1.2 !important;
                box-sizing: border-box !important;
              }
              .mobile-statement-table th {
                background-color: #f8fafc !important;
                color: #1e293b !important;
                padding-top: 8px !important;
                padding-bottom: 8px !important;
                font-size: 10px !important;
              }
              
              /* Exact Percentages summing to 100% */
              .mobile-statement-table th:nth-child(1), .mobile-statement-table td:nth-child(1) { width: 20% !important; } /* التاريخ */
              .mobile-statement-table th:nth-child(2), .mobile-statement-table td:nth-child(2) { width: 13% !important; } /* رقم */
              .mobile-statement-table th:nth-child(3), .mobile-statement-table td:nth-child(3) { width: 19% !important; } /* النوع */
              .mobile-statement-table th:nth-child(4), .mobile-statement-table td:nth-child(4) { width: 15% !important; } /* مدين */
              .mobile-statement-table th:nth-child(5), .mobile-statement-table td:nth-child(5) { width: 15% !important; } /* دائن */
              .mobile-statement-table th:nth-child(6), .mobile-statement-table td:nth-child(6) { width: 18% !important; } /* الرصيد */

              /* Prevent Wrapping on Dates and Numbers */
              .mobile-statement-table th:nth-child(1), .mobile-statement-table td:nth-child(1),
              .mobile-statement-table th:nth-child(2), .mobile-statement-table td:nth-child(2),
              .mobile-statement-table th:nth-child(4), .mobile-statement-table td:nth-child(4),
              .mobile-statement-table th:nth-child(5), .mobile-statement-table td:nth-child(5),
              .mobile-statement-table th:nth-child(6), .mobile-statement-table td:nth-child(6) {
                white-space: nowrap !important;
                word-break: keep-all !important;
              }
              /* Type can wrap if needed */
              .mobile-statement-table th:nth-child(3), .mobile-statement-table td:nth-child(3) {
                white-space: normal !important;
                word-break: break-word !important;
              }

              /* Specific Colors */
              .mobile-statement-table td:nth-child(2) { color: #0d9488 !important; } /* رقم */
              .mobile-statement-table td:nth-child(4) { color: #dc2626 !important; } /* مدين */
              .mobile-statement-table td:nth-child(5) { color: #16a34a !important; } /* دائن */
              .mobile-statement-table td:nth-child(6) { color: #0f766e !important; } /* الرصيد */

              /* Extreme compression for 360px and below */
              @media (max-width: 380px) {
                .mobile-statement-table th,
                .mobile-statement-table td {
                  font-size: 8.5px !important;
                  padding: 4px 1px !important;
                  letter-spacing: -0.2px !important;
                }
                .mobile-statement-table th {
                  font-size: 8.5px !important;
                }
              }
            `}</style>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
              <table className="mobile-statement-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>رقم</th>
                    <th>النوع</th>
                    <th>مدين</th>
                    <th>دائن</th>
                    <th>الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTxs.length > 0 ? (
                    displayTxs.map((tx) => {
                      const fmtNum = (val) => {
                        if (val === undefined || val === null || val === '') return '-';
                        const num = Number(val);
                        if (isNaN(num) || num === 0) return '-';
                        return num % 1 === 0 ? num.toString() : num.toFixed(2);
                      };

                      const typeMap = {
                        'فاتورة مبيعات': 'فاتورة',
                        'مرتجع مبيعات': 'مرتجع',
                        'دفعة': 'دفعة',
                        'خصم': 'خصم',
                        'حركة': 'حركة',
                        'مصروف': 'مصروف',
                      };

                      const typeText = tx.isPreviousBalance
                        ? 'رصيد سابق'
                        : (typeMap[tx.type] || tx.type || '-');

                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: tx.isPreviousBalance ? '#fffbeb' : '#ffffff' }}>
                          <td style={{ color: '#475569' }}>
                            {tx.date}
                          </td>
                          <td style={{ color: '#0d9488' }}>
                            {tx.docNumber && tx.docNumber !== '-' ? tx.docNumber : '-'}
                          </td>
                          <td style={{ color: '#334155' }}>
                            {typeText}
                          </td>
                          <td style={{ color: '#dc2626' }}>
                            {fmtNum(tx.debit)}
                          </td>
                          <td style={{ color: '#16a34a' }}>
                            {fmtNum(tx.credit)}
                          </td>
                          <td style={{ color: '#0f766e' }}>
                            {tx.runningBalance !== undefined ? fmtNum(tx.runningBalance) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
                        لا توجد حركات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>



          </div>
        ) : (
          <div className="space-y-6">

            {/* Customer Header & Back Button */}
            <div className="flex items-center justify-between mb-6 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="btn btn-secondary flex items-center gap-2 shadow-sm transition-all hover:bg-slate-100"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  title="رجوع للقائمة الرئيسية"
                >
                  <ArrowRight size={18} style={{ color: 'var(--primary, #0f766e)' }} />
                  <span>رجوع</span>
                </button>
                <h2 className="text-xl font-black text-slate-800" style={{ color: '#1e293b', margin: 0 }}>
                  {selectedCustomer.name}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canPerformAction(user, 'customer_statements', 'add') && (
                  <>
                    <button
                      onClick={handleAddDiscount}
                      style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      className="shadow-sm transition-all active:scale-95 hover:brightness-105"
                    >
                      <Plus size={16} /> خصم
                    </button>
                    <button
                      onClick={handleAddPayment}
                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      className="shadow-sm transition-all active:scale-95 hover:brightness-105"
                    >
                      <Plus size={16} /> دفعة
                    </button>
                    <button
                      onClick={handleAddTransaction}
                      style={{ backgroundColor: '#0f766e', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                      className="shadow-sm transition-all active:scale-95 hover:brightness-105"
                    >
                      <Plus size={16} /> إضافة حركة
                    </button>
                  </>
                )}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:brightness-105"
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                  title="طباعة كشف الحساب"
                >
                  <Printer size={18} />
                  <span>طباعة</span>
                </button>
                <HRDateFilter
                  mode={dateMode}
                  setMode={setDateMode}
                  date={selectedDate}
                  setDate={setSelectedDate}
                  month={selectedMonth}
                  setMonth={setSelectedMonth}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  allowedModes={['day', 'month', 'range']}
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="glass-panel p-4 print:hidden flex flex-wrap gap-4 mb-4 rounded-2xl border border-slate-200/80 bg-white items-center shadow-sm">
              <div className="flex items-center gap-2 text-slate-700 font-bold whitespace-nowrap ml-2">
                <Filter size={18} className="text-emerald-600" />
                <span className="text-sm">تصفية الحركات:</span>
              </div>

              <div className="flex flex-wrap items-center" style={{ gap: '16px' }}>
                <div
                  className="flex items-center gap-2 px-3 transition-all hover:border-slate-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    height: '38px',
                    width: '180px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <Search className="text-slate-400 shrink-0" size={15} />
                  <input
                    type="text"
                    placeholder="رقم المستند..."
                    value={docNumberFilter}
                    onChange={(e) => setDocNumberFilter(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 font-medium"
                    style={{ border: 'none', padding: 0, margin: 0, boxShadow: 'none', outline: 'none' }}
                  />
                </div>

                <div className="flex items-center" style={{ gap: '10px' }}>
                  <span className="text-xs text-slate-600 font-bold whitespace-nowrap">من:</span>
                  <div
                    className="flex items-center px-2.5 transition-all hover:border-slate-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      height: '38px',
                      width: '85px',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <input
                      type="number"
                      placeholder=""
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-800 font-bold text-center"
                      style={{ border: 'none', padding: 0, margin: 0, boxShadow: 'none', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: '10px' }}>
                  <span className="text-xs text-slate-600 font-bold whitespace-nowrap">إلى:</span>
                  <div
                    className="flex items-center px-2.5 transition-all hover:border-slate-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      height: '38px',
                      width: '85px',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <input
                      type="number"
                      placeholder=""
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full bg-transparent border-none text-xs text-slate-800 font-bold text-center"
                      style={{ border: 'none', padding: 0, margin: 0, boxShadow: 'none', outline: 'none' }}
                    />
                  </div>
                </div>

                {(docNumberFilter || minAmount || maxAmount) && (
                  <button
                    onClick={() => {
                      setDocNumberFilter('');
                      setMinAmount('');
                      setMaxAmount('');
                    }}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl px-2.5 py-1.5 transition-all font-bold cursor-pointer"
                    title="إلغاء الفلاتر"
                  >
                    <X size={14} /> مسح الفلتر
                  </button>
                )}
              </div>
            </div>

            {/* Transactions Table Desktop */}
            <div className="table-container glass-panel print:border-none print:shadow-none overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <table className="w-full text-right whitespace-nowrap print:text-sm text-sm">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold text-[13px] print:bg-transparent">
                    <th onClick={() => handleSort('date')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>التاريخ</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'date' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('docNumber')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>رقم المستند</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'docNumber' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('salesRep')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>المندوب</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'salesRep' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('type')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>نوع الحركة</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'type' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('invoiceType')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>نوع الفاتورة</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'invoiceType' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('notes')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>طريقة الدفع</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'notes' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('dueDate')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>تاريخ الاستحقاق</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'dueDate' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('debit')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>مدين (د.أ)</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'debit' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('credit')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>دائن (د.أ)</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'credit' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('runningBalance')} className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span>الرصيد التراكمي</span>
                        <ChevronsUpDown size={14} className={`text-slate-400 ${sortConfig.key === 'runningBalance' ? 'text-primary font-bold' : ''}`} />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center print:hidden" style={{ width: '130px' }}>
                      إجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayTxs.length > 0 ? (
                    displayTxs.map((tx) => (
                      <tr key={tx.id} className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${tx.isPreviousBalance ? 'bg-amber-50/60 font-bold text-amber-950 border-b-2 border-amber-200' : ''} ${tx.status === 'ملغى' ? 'bg-rose-50/50 print:hidden' : ''}`}>
                        <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={tx.isPreviousBalance ? 'font-bold text-amber-900' : ''}>{tx.date}</span>
                            {tx.status === 'ملغى' && <span className="text-xs text-rose-500 font-bold mr-1">(ملغاة)</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-[#0284c7]">
                          {tx.docNumber}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {tx.salesRep || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(() => {
                            if (tx.isPreviousBalance) {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">رصيد سابق</span>;
                            }
                            const tType = tx.type || 'فاتورة مبيعات';
                            if (tType === 'فاتورة مبيعات') {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700">فاتورة مبيعات</span>;
                            } else if (tType === 'مرتجع مبيعات') {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700">مرتجع مبيعات</span>;
                            } else if (tType === 'دفعة') {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-700">دفعة</span>;
                            } else if (tType === 'خصم') {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-700">خصم</span>;
                            } else if (tType.includes('افتتاحي')) {
                              return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700">رصيد افتتاحي</span>;
                            }
                            return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">{tType}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {tx.invoiceType || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                          {tx.paymentMethod || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-medium text-slate-600">
                          {tx.dueDate || '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                          {tx.debit ? formatCurrency(tx.debit) : '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                          {tx.credit ? formatCurrency(tx.credit) : '-'}
                        </td>
                        <td className="px-4 py-3.5 text-center font-black text-slate-900" dir="ltr">
                          {formatCurrency(Math.abs(tx.runningBalance))} {tx.runningBalance > 0 ? '(عليه)' : tx.runningBalance < 0 ? '(له)' : ''}
                        </td>
                        <td className="px-4 py-3.5 text-center print:hidden">
                          {tx.isPreviousBalance ? (
                            <span className="text-slate-400 font-bold text-xs">-</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handlePreviewTransaction(tx)} className="icon-btn icon-btn-add" title="معاينة الحركة">
                                <Eye size={18} />
                              </button>
                              {tx.status !== 'ملغى' && (
                                <button onClick={() => handleEditTransaction(tx)} className="icon-btn icon-btn-success" title="تعديل الحركة">
                                  <Pencil size={18} />
                                </button>
                              )}
                              <button onClick={() => handleDeleteOrCancelTransaction(tx)} className="icon-btn icon-btn-delete" title="حذف / إلغاء الحركة">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="text-center p-8 text-muted">
                        لا توجد حركات مالية مسجلة لهذا الزبون
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
    ) : isMobile ? (
        /* Mobile Summary List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'Tajawal, sans-serif' }}>
          {/* Mobile Search and Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', marginTop: '0.5rem', padding: '0 0.5rem' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', 
                backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', 
                flex: 1, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', transition: 'all 0.2s'
              }}
            >
              <Search size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="ابحث باسم الزبون..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                style={{ width: '100%', backgroundColor: 'transparent', border: 'none', fontSize: '0.875rem', color: '#1e293b', outline: 'none', margin: 0, padding: 0 }}
              />
            </div>
            <button style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              backgroundColor: '#0f766e', color: '#fff', width: '2.5rem', height: '2.5rem', 
              borderRadius: '0.75rem', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer'
            }}>
              <Filter size={18} color="#fff" />
            </button>
          </div>

          {/* Mobile Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 5.5rem', backgroundColor: '#f8fafc', padding: '0.5rem 0', borderRadius: '12px', marginBottom: '0.5rem', fontSize: '10px', fontWeight: '800', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.02)' }}>
            <div style={{ paddingRight: '0.5rem', textAlign: 'right' }}>الزبون</div>
            <div style={{ textAlign: 'center' }}>الرصيد الحالي</div>
            <div style={{ textAlign: 'center', paddingLeft: '8px' }}>الإجراءات</div>
          </div>

          {/* Mobile List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '6rem' }}>
            {allCustomerBalances.length > 0 ? (
              allCustomerBalances.map(c => (
                <div key={c.id} style={{ 
                  backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #f1f5f9', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: '1.3fr 1fr 5.5rem', alignItems: 'stretch', minHeight: '65px', cursor: 'pointer' 
                }} onClick={() => setSelectedCustomer(c)}>
                  
                  {/* الزبون */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0.5rem', borderLeft: '1px solid rgba(241,245,249,0.8)', overflow: 'hidden' }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', marginLeft: '0.5rem' }}>
                      <User size={14} color="#fff" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', wordBreak: 'break-word', lineHeight: '1.4' }} title={c.name}>{c.name}</span>
                    </div>
                  </div>

                  {/* الرصيد الحالي */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(241,245,249,0.8)', padding: '0.25rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(Math.abs(c.balance))}</span>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap' }}>{c.balance > 0 ? '(عليه)' : c.balance < 0 ? '(له)' : '-'}</span>
                  </div>

                  {/* الإجراءات */}
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0.25rem', paddingLeft: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0d9488', padding: '2px' }} onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}>
                      <Eye size={17} color="#0d9488" />
                      <span style={{ fontSize: '9.5px', fontWeight: '800', marginTop: '2px' }}>عرض</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0284c7', padding: '2px' }} onClick={(e) => { e.stopPropagation(); handlePrint(c); }}>
                      <Printer size={17} color="#0284c7" />
                      <span style={{ fontSize: '9.5px', fontWeight: '800', marginTop: '2px' }}>طباعة</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontWeight: '700', backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                لا يوجد زبائن مطابقين للبحث
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop Summary List */
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm w-full mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap shrink-0">
              ملخص ذمم الزبائن
            </h3>
            <div
              className="flex items-center gap-2.5 px-3.5 py-1.5 transition-all hover:border-slate-400 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 flex-1 w-full"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                height: '40px',
                width: '100%',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
              }}
            >
              <Search className="text-slate-400 shrink-0" size={18} />
              <input
                type="text"
                placeholder="بحث باسم الزبون أو رقم الهاتف..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="w-full bg-transparent border-none text-sm text-slate-800 placeholder-slate-400 font-medium"
                style={{ border: 'none', padding: 0, margin: 0, boxShadow: 'none', outline: 'none' }}
              />
            </div>
          </div>

          <div className="table-container glass-panel overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <table className="w-full text-right whitespace-nowrap text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold text-[13px]">
                  <th onClick={() => handleSummarySort('name')} className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-start">
                      <span>اسم الزبون</span>
                      <ChevronsUpDown size={14} className={`text-slate-400 ${summarySort.key === 'name' ? 'text-primary font-bold' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSummarySort('phone')} className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-start">
                      <span>رقم الهاتف</span>
                      <ChevronsUpDown size={14} className={`text-slate-400 ${summarySort.key === 'phone' ? 'text-primary font-bold' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSummarySort('balance')} className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none">
                    <div className="flex items-center gap-1.5 justify-center">
                      <span>الرصيد الحالي (الذمة)</span>
                      <ChevronsUpDown size={14} className={`text-slate-400 ${summarySort.key === 'balance' ? 'text-primary font-bold' : ''}`} />
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center" style={{ width: '130px' }}>
                    إجراء
                  </th>
                </tr>
              </thead>
              <tbody>
                {allCustomerBalances.length > 0 ? (
                  allCustomerBalances.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-600" dir="ltr" style={{ textAlign: 'right' }}>
                        {c.phone || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${c.balance > 0 ? 'bg-rose-100 text-rose-700' :
                            c.balance < 0 ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-700'
                          }`}>
                          {formatCurrency(Math.abs(c.balance))}
                          {c.balance > 0 ? ' (عليه)' : c.balance < 0 ? ' (له)' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(c)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              backgroundColor: '#f0f9ff',
                              border: '1.5px solid #7dd3fc',
                              color: '#0284c7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              padding: 0,
                              outline: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                            title="معاينة الكشف"
                          >
                            <Eye size={18} color="#0284c7" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrint(c);
                            }}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              backgroundColor: '#f0fdfa',
                              border: '1.5px solid #5eead4',
                              color: '#0d9488',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              padding: 0,
                              outline: 'none',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ccfbf1'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                            title="طباعة الكشف"
                          >
                            <Printer size={18} color="#0d9488" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center p-8 text-muted">
                      لا يوجد زبائن مطابقين للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
