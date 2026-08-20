import React, { useState, useEffect, useMemo } from 'react';
import {
  getRepVisits, deleteRepVisit, getEmployees, getCustomers, getGlobalSettings, saveRepVisit, saveSupervisorTask
} from '../../store';
import {
  Search, Filter, Eye, Trash2, Calendar, Clock, MapPin,
  AlertTriangle, CheckCircle, Info, Users, ShieldAlert,
  RotateCcw, ExternalLink, RefreshCw, Star, Ban,
  ShoppingCart, Package, HelpCircle, Hourglass, FileText,
  Briefcase, ChevronDown, Globe, Plus, X, Save, Tag,
  Smile, Meh, Frown, AlertOctagon, UserCheck, UserX,
  ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';
import Swal from 'sweetalert2';

export const AdminRepVisits = () => {
  const [visits, setVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [previewVisit, setPreviewVisit] = useState(null);

  // Manual visit report modal states
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    customerId: '',
    visitType: '',
    date: new Date().toISOString().split('T')[0],
    duration: 15,
    status: '',
    rating: '',
    action: '',
    followUpDate: '',
    failedReason: '',
    summary: '',
    sampleType: '',
    sampleQty: '',
    sampleNotes: '',
    responsibleName: ''
  });

  // Filters
  const [repFilter, setRepFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [needsFollowUpFilter, setNeedsFollowUpFilter] = useState(false);

  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState('last3days'); // 'last3days', 'daily', 'monthly', 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'timeIn', direction: 'desc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vList, empList, custList, settings] = await Promise.all([
        getRepVisits(),
        getEmployees(),
        getCustomers(),
        getGlobalSettings()
      ]);
      setVisits(vList.sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn)));
      setEmployees(empList);
      setCustomers(custList);
      setGlobalSettings(settings);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId) {
      Swal.fire('تنبيه', 'يرجى اختيار المندوب!', 'warning');
      return;
    }
    if (!formData.customerId) {
      Swal.fire('تنبيه', 'يرجى اختيار العميل!', 'warning');
      return;
    }
    if (!formData.visitType) {
      Swal.fire('تنبيه', 'يرجى اختيار نوع الزيارة!', 'warning');
      return;
    }
    if (!formData.status) {
      Swal.fire('تنبيه', 'يرجى اختيار حالة الزيارة!', 'warning');
      return;
    }
    if (formData.status === 'met' && !formData.rating) {
      Swal.fire('تنبيه', 'يرجى اختيار تقييم العميل!', 'warning');
      return;
    }
    if (formData.status === 'failed' && !formData.failedReason.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة سبب فشل الزيارة!', 'warning');
      return;
    }
    if (!formData.summary.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة ملخص الزيارة!', 'warning');
      return;
    }
    if (formData.action === 'samples' && !formData.sampleNotes.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة ملاحظات تسليم العينات!', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find(emp => String(emp.id) === String(formData.employeeId));
      const selectedCust = customers.find(c => String(c.id) === String(formData.customerId));

      const statusLabels = {
        met: 'تم اللقاء',
        not_found: 'العميل غير موجود',
        waiting: 'لا يوجد اهتمام',
        failed: 'الزيارة لم تتم',
        postponed: 'تأجلت الزيارة'
      };

      const actionLabels = {
        new_order: 'طلبية جديدة',
        review: 'موعد مراجعة',
        none: 'لا يوجد',
        samples: 'إرسال عينات',
        price_offer: 'عرض سعر',
        waiting_reply: 'انتظار رد العميل'
      };

      const ratingLabels = {
        very_interested: 'مهتم جداً',
        interested: 'مهتم',
        needs_followup: 'يحتاج متابعة',
        uninterested: 'غير مهتم',
        stop: 'توقف عن التعامل'
      };

      const timeInDate = new Date(formData.date + 'T10:00:00');
      const timeOutDate = new Date(timeInDate.getTime() + (parseInt(formData.duration) || 15) * 60000);

      const visitData = {
        userId: selectedEmp.id,
        userName: selectedEmp.name,
        customerId: selectedCust.id,
        customerName: selectedCust.name,
        visitType: formData.visitType || 'follow_up',
        visitTypeLabel: formData.visitType === 'first_visit' ? 'أول زيارة' : 'متابعة',
        responsibleName: formData.responsibleName,
        region: selectedCust.region || selectedCust.city || 'غير محددة',
        date: formData.date,
        timeIn: timeInDate.toISOString(),
        timeOut: timeOutDate.toISOString(),
        duration: parseInt(formData.duration) || 15,
        status: statusLabels[formData.status],
        statusKey: formData.status,
        action: actionLabels[formData.action],
        actionKey: formData.action,
        rating: formData.rating ? ratingLabels[formData.rating] : 'لا يوجد (زيارة لم تتم)',
        ratingKey: formData.rating || '',
        followUpDate: formData.followUpDate || null,
        failedReason: formData.status === 'failed' ? formData.failedReason : null,
        samplesData: formData.action === 'samples' ? { type: formData.sampleType, qty: formData.sampleQty, notes: formData.sampleNotes } : null,
        arrivalGPS: null,
        checkoutGPS: null,
        summary: formData.summary
      };

      await saveRepVisit(visitData);


      Swal.fire('تم الحفظ', 'تم تسجيل تقرير الزيارة بنجاح!', 'success');
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('خطأ', 'فشل في حفظ التقرير', 'error');
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من استرجاع هذا التقرير بعد الحذف!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        await deleteRepVisit(id);
        setVisits(visits.filter(v => v.id !== id));
        Swal.fire('تم الحذف', 'تم حذف تقرير الزيارة بنجاح.', 'success');
      } catch (err) {
        Swal.fire('خطأ', 'فشل في حذف التقرير', 'error');
      }
    }
  };

  // Alerts Removed Per Request

  // Unique list values for filters
  const uniqueReps = useMemo(() => {
    return [...new Set(visits.map(v => v.userName))];
  }, [visits]);

  const uniqueRegions = useMemo(() => {
    if (cityFilter === 'عمان') {
      const areas = (globalSettings?.ammanAreas && globalSettings.ammanAreas.length > 0)
        ? globalSettings.ammanAreas
        : [
          'عبدون', 'دير غبار', 'أم أذينة', 'الرابية', 'الشميساني', 'الصويفية', 'الجندويل',
          'خلدا', 'تلاع العلي', 'أم السماق', 'ضاحية الرشيد', 'ضاحية الحسين', 'مرج الحمام',
          'الجبيهة', 'شفا بدران', 'أبو نصير', 'طبربور', 'الهاشمي الشمالي', 'الهاشمي الجنوبي',
          'جبل الحسين', 'جبل عمان', 'جبل اللويبدة', 'الأشرفية', 'الوحدات', 'رأس العين',
          'وسط البلد', 'النصر', 'القويسمة', 'أبو علندا', 'خريبة السوق', 'المقابلين',
          'الجويدة', 'سحاب', 'الموقر', 'ماركا الشمالية', 'ماركا الجنوبية', 'طارق',
          'بسمان', 'البيادر', 'وادي السير', 'اليادودة', 'حسبان', 'البنيات'
        ];
      return [...new Set(areas)].sort();
    } else if (cityFilter) {
      return [];
    } else {
      const fromCust = customers.map(c => c.region).filter(Boolean);
      const fromVisits = visits.map(v => v.region).filter(Boolean);
      const defaultAreas = [
        'عبدون', 'دير غبار', 'أم أذينة', 'الرابية', 'الشميساني', 'الصويفية', 'الجندويل',
        'خلدا', 'تلاع العلي', 'أم السماق', 'ضاحية الرشيد', 'ضاحية الحسين', 'مرج الحمام',
        'الجبيهة', 'شفا بدران', 'أبو نصير', 'طبربور', 'الهاشمي الشمالي', 'الهاشمي الجنوبي',
        'جبل الحسين', 'جبل عمان', 'جبل اللويبدة', 'الأشرفية', 'الوحدات', 'رأس العين',
        'وسط البلد', 'النصر', 'القويسمة', 'أبو علندا', 'خريبة السوق', 'المقابلين',
        'الجويدة', 'سحاب', 'الموقر', 'ماركا الشمالية', 'ماركا الجنوبية', 'طارق',
        'بسمان', 'البيادر', 'وادي السير', 'اليادودة', 'حسبان', 'البنيات'
      ];
      const areas = (globalSettings?.ammanAreas && globalSettings.ammanAreas.length > 0)
        ? globalSettings.ammanAreas
        : defaultAreas;
      return [...new Set([...fromCust, ...fromVisits, ...areas])].sort();
    }
  }, [customers, visits, globalSettings, cityFilter]);

  const uniqueCities = useMemo(() => {
    return ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];
  }, []);

  const uniqueSectors = useMemo(() => {
    return [...new Set(customers.map(c => c.sector).filter(Boolean))];
  }, [customers]);

  // Filtered Visits
  const baseFilteredVisits = useMemo(() => {
    return visits.filter(v => {
      const matchRep = !repFilter || v.userName === repFilter;
      const matchCust = !customerFilter || v.customerId === customerFilter;

      const customer = customers.find(c => String(c.id) === String(v.customerId));
      const vRegion = customer?.location || v.region || '';
      const vCity = customer?.city || '';

      const matchRegion = !regionFilter || vRegion === regionFilter;
      const matchCity = !cityFilter || vCity === cityFilter;
      const matchSector = !sectorFilter || customer?.sector === sectorFilter;

      let matchNeedsFollowUp = true;
      if (needsFollowUpFilter) {
        matchNeedsFollowUp = !!v.followUpDate || ['waiting', 'failed', 'postponed'].includes(v.statusKey);
      }

      let matchDate = true;
      if (v.date) {
        const visitDate = new Date(v.date);
        visitDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);

        if (dateFilterMode === 'last3days') {
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          matchDate = visitDate >= threeDaysAgo && visitDate <= today;
        } else if (dateFilterMode === 'daily') {
          matchDate = visitDate.getTime() === today.getTime();
        } else if (dateFilterMode === 'monthly') {
          matchDate = visitDate.getMonth() === today.getMonth() && visitDate.getFullYear() === today.getFullYear();
        } else if (dateFilterMode === 'custom') {
          const fromDate = customDateFrom ? new Date(customDateFrom) : null;
          const toDate = customDateTo ? new Date(customDateTo) : null;
          
          if (fromDate) fromDate.setHours(0,0,0,0);
          if (toDate) toDate.setHours(23,59,59,999);
          
          if (fromDate && visitDate < fromDate) matchDate = false;
          if (toDate && visitDate > toDate) matchDate = false;
        }
      }

      return matchRep && matchCust && matchRegion && matchCity && matchNeedsFollowUp && matchSector && matchDate;
    });
  }, [visits, customers, repFilter, customerFilter, regionFilter, cityFilter, sectorFilter, needsFollowUpFilter, dateFilterMode, customDateFrom, customDateTo]);

  const filteredVisits = useMemo(() => {
    return baseFilteredVisits.filter(v => {
      const matchStatus = !statusFilter || v.status === statusFilter;
      const matchAction = !actionFilter || v.action === actionFilter;
      return matchStatus && matchAction;
    });
  }, [baseFilteredVisits, statusFilter, actionFilter]);

  const sortedVisits = useMemo(() => {
    let sortableVisits = [...filteredVisits];
    if (sortConfig.key !== null) {
      sortableVisits.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'timeIn') {
           aValue = new Date(a.timeIn || 0).getTime();
           bValue = new Date(b.timeIn || 0).getTime();
        } else if (sortConfig.key === 'region') {
           const custA = customers.find(c => String(c.id) === String(a.customerId));
           aValue = custA?.location || a.region || '';
           const custB = customers.find(c => String(c.id) === String(b.customerId));
           bValue = custB?.location || b.region || '';
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
           // String comparison handled naturally below, just ensuring types match if they exist.
        }

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableVisits;
  }, [filteredVisits, sortConfig, customers]);

  const statusCards = [
    { label: 'الكل', value: '', color: '#1a8d9b', bg: '#effafb', border: '#cceef2', icon: Filter },
    { label: 'تم اللقاء', value: 'تم اللقاء', color: '#10b981', bg: '#f0fdf4', border: '#dcfce7', icon: CheckCircle },
    { label: 'تأجلت الزيارة', value: 'تأجلت الزيارة', color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe', icon: Calendar },
    { label: 'متابعة', value: 'متابعة', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', icon: RefreshCw },
    { label: 'العميل غير موجود', value: 'العميل غير موجود', color: '#8b5cf6', bg: '#faf5ff', border: '#f3e8ff', icon: Users },
    { label: 'لا يوجد اهتمام', value: 'لا يوجد اهتمام', color: '#ef4444', bg: '#fff5f5', border: '#ffe3e3', icon: Ban }
  ];

  const actionCards = [
    { label: 'الكل', value: '', color: '#1a8d9b', bg: '#effafb', border: '#cceef2', icon: Filter },
    { label: 'موعد مراجعة', value: 'موعد مراجعة', color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe', icon: Clock },
    { label: 'طلبية جديدة', value: 'طلبية جديدة', color: '#10b981', bg: '#f0fdf4', border: '#dcfce7', icon: ShoppingCart },
    { label: 'إرسال عينات', value: 'إرسال عينات', color: '#8b5cf6', bg: '#faf5ff', border: '#f3e8ff', icon: Package },
    { label: 'انتظار رد العميل', value: 'انتظار رد العميل', color: '#ec4899', bg: '#fdf2f8', border: '#fce7f3', icon: Hourglass },
    { label: 'عرض سعر', value: 'عرض سعر', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7', icon: FileText },
    { label: 'لا يوجد', value: 'لا يوجد', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: HelpCircle }
  ];

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm} ${dateStr}`;
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Tajawal, sans-serif' }} dir="rtl">

      {/* Title & Refresh */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        backgroundColor: '#ffffff',
        padding: '16px 24px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '850', color: '#1e293b', margin: 0 }}>متابعة زيارات المندوبين</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
            title="تحديث البيانات"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setFormData({
                employeeId: '',
                customerId: '',
                date: new Date().toISOString().split('T')[0],
                duration: 15,
                status: '',
                rating: '',
                action: '',
                followUpDate: '',
                failedReason: '',
                summary: '',
                sampleType: '',
                sampleQty: '',
                sampleNotes: ''
              });
              setShowModal(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: 'bold',
              border: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={16} />
            إضافة تقرير زيارة
          </button>
        </div>
      </div>

      {/* 1. Top Filters Panel (تصفية وفترة التقارير) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.015)',
        border: '1px solid #f1f5f9',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: '#1a8d9b' }} />
            <span>تصفية وفترة التقارير</span>
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
            {[
              { id: 'last3days', label: 'آخر 3 أيام' },
              { id: 'daily', label: 'يومي' },
              { id: 'monthly', label: 'شهري' },
              { id: 'custom', label: 'فترة' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setDateFilterMode(mode.id)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  backgroundColor: dateFilterMode === mode.id ? '#e0f2fe' : 'transparent',
                  color: dateFilterMode === mode.id ? '#0284c7' : '#64748b',
                  transition: 'all 0.2s ease'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {dateFilterMode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>من تاريخ:</label>
              <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', color: '#334155' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>إلى تاريخ:</label>
              <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', color: '#334155' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {/* Rep */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>المندوب</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '3px', position: 'relative' }}>
              <select
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 40px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: 'transparent',
                  color: '#334155',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">كل المندوبين</option>
                {uniqueReps.map((r, i) => (
                  <option key={i} value={r}>{r}</option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7'
              }}>
                <Users size={18} />
              </div>
              <ChevronDown size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Customer */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>العميل</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '3px', position: 'relative' }}>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 40px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: 'transparent',
                  color: '#334155',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">كل العملاء</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d'
              }}>
                <Briefcase size={18} />
              </div>
              <ChevronDown size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* City */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>المدينة</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '3px', position: 'relative' }}>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setRegionFilter(''); // Auto-reset region filter on city change
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 40px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: 'transparent',
                  color: '#334155',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">كل المدن</option>
                {uniqueCities.map((city, i) => (
                  <option key={i} value={city}>{city}</option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                color: '#d97706'
              }}>
                <Globe size={18} />
              </div>
              <ChevronDown size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Region */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>المنطقة</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: cityFilter && cityFilter !== 'عمان' ? '#f1f5f9' : '#ffffff',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              padding: '3px',
              position: 'relative'
            }}>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                disabled={!!(cityFilter && cityFilter !== 'عمان')}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 40px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: 'transparent',
                  color: cityFilter && cityFilter !== 'عمان' ? '#94a3b8' : '#334155',
                  appearance: 'none',
                  cursor: cityFilter && cityFilter !== 'عمان' ? 'not-allowed' : 'pointer'
                }}
              >
                {cityFilter && cityFilter !== 'عمان' ? (
                  <option value="">لا يوجد مناطق لهذه المدينة</option>
                ) : (
                  <>
                    <option value="">كل المناطق</option>
                    {uniqueRegions.map((reg, i) => (
                      <option key={i} value={reg}>{reg}</option>
                    ))}
                  </>
                )}
              </select>
              <div style={{
                position: 'absolute',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: cityFilter && cityFilter !== 'عمان' ? '#cbd5e1' : '#eff6ff',
                color: cityFilter && cityFilter !== 'عمان' ? '#64748b' : '#1d4ed8'
              }}>
                <MapPin size={18} />
              </div>
              <ChevronDown size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Sector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>القطاع</label>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '3px', position: 'relative' }}>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '8px 40px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: 'transparent',
                  color: '#334155',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">كل القطاعات</option>
                {uniqueSectors.map((sector, i) => (
                  <option key={i} value={sector}>{sector}</option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                right: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#f5f3ff',
                color: '#7c3aed'
              }}>
                <Tag size={18} />
              </div>
              <ChevronDown size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Status Filters Panel (تصفية حسب حالة الزيارة) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.015)',
        border: '1px solid #f1f5f9',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: '#1a8d9b' }} />
          <span>تصفية حسب حالة الزيارة</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
          {statusCards.map((card, i) => {
            const count = card.value === ''
              ? baseFilteredVisits.length
              : baseFilteredVisits.filter(v => v.status === card.value).length;

            const isActive = statusFilter === card.value;
            const isAll = card.value === '';

            return (
              <div
                key={i}
                onClick={() => setStatusFilter(card.value)}
                style={{
                  backgroundColor: isActive ? (isAll ? '#1a8d9b' : card.color) : '#ffffff',
                  border: isActive ? 'none' : `1px solid ${card.color}30`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: isAll ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? (isAll ? '0 4px 12px rgba(26,141,155,0.4)' : `0 4px 12px ${card.color}40`) : '0 2px 4px rgba(0,0,0,0.02)',
                  transform: isActive ? 'translateY(-2px)' : 'none'
                }}
                className="hover:shadow-md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: isActive ? '#ffffff' : '#475569', marginBottom: '6px' }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '850', color: isActive ? '#ffffff' : card.color }}>
                    {count}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${card.color}15`,
                  color: isActive ? '#ffffff' : card.color
                }}>
                  <card.icon size={20} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Filters Panel (تصفية حسب الإجراء المطلوب) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.015)',
        border: '1px solid #f1f5f9',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: '#1a8d9b' }} />
          <span>تصفية حسب الإجراء المطلوب</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '14px' }}>
          {actionCards.map((card, i) => {
            const count = card.value === ''
              ? baseFilteredVisits.length
              : baseFilteredVisits.filter(v => v.action === card.value).length;

            const isActive = actionFilter === card.value;
            const isAll = card.value === '';

            return (
              <div
                key={i}
                onClick={() => setActionFilter(card.value)}
                style={{
                  backgroundColor: isActive ? (isAll ? '#1a8d9b' : card.color) : '#ffffff',
                  border: isActive ? 'none' : `1px solid ${card.color}30`,
                  borderRadius: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: isAll ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? (isAll ? '0 4px 12px rgba(26,141,155,0.4)' : `0 4px 12px ${card.color}40`) : '0 2px 4px rgba(0,0,0,0.02)',
                  transform: isActive ? 'translateY(-2px)' : 'none'
                }}
                className="hover:shadow-md"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: isActive ? '#ffffff' : '#475569', marginBottom: '6px' }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '850', color: isActive ? '#ffffff' : card.color }}>
                    {count}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${card.color}15`,
                  color: isActive ? '#ffffff' : card.color
                }}>
                  <card.icon size={20} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkbox Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', direction: 'rtl' }}>
        <input
          type="checkbox"
          id="chk-needs-followup"
          checked={needsFollowUpFilter}
          onChange={(e) => setNeedsFollowUpFilter(e.target.checked)}
          style={{ width: '16px', height: '16px', accentColor: '#1a8d9b', cursor: 'pointer' }}
        />
        <label htmlFor="chk-needs-followup" style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}>
          عرض فقط الزيارات التي تحتاج متابعة قادمة (تاريخ متابعة مسجل أو زيارة معلقة)
        </label>
      </div>

      {/* Visit List Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        border: '1px solid #f1f5f9',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', color: '#1a8d9b' }}>
            <RefreshCw size={32} className="animate-spin" />
            <span style={{ fontWeight: 'bold' }}>جاري تحميل تقارير الزيارات...</span>
          </div>
        ) : sortedVisits.length === 0 ? (
          <div style={{ padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
            <Ban size={48} />
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>لا توجد تقارير زيارات تطابق فلاتر البحث الحالية.</span>
            <button
              onClick={() => {
                setRepFilter('');
                setCustomerFilter('');
                setRegionFilter('');
                setCityFilter('');
                setStatusFilter('');
                setActionFilter('');
                setNeedsFollowUpFilter(false);
              }}
              style={{
                marginTop: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th onClick={() => requestSort('userName')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'userName' ? '#1a8d9b' : '#475569', width: '70px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>المندوب {sortConfig.key === 'userName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('customerName')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'customerName' ? '#1a8d9b' : '#475569', width: '180px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>الزبون {sortConfig.key === 'customerName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('responsibleName')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'responsibleName' ? '#1a8d9b' : '#475569', width: '120px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>المسؤول {sortConfig.key === 'responsibleName' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('region')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'region' ? '#1a8d9b' : '#475569', width: '120px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>العنوان {sortConfig.key === 'region' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('timeIn')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'timeIn' ? '#1a8d9b' : '#475569', width: '120px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>وقت الزيارة {sortConfig.key === 'timeIn' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('visitTypeLabel')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'visitTypeLabel' ? '#1a8d9b' : '#475569', width: '95px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>نوع الزيارة {sortConfig.key === 'visitTypeLabel' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('status')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'status' ? '#1a8d9b' : '#475569', width: '110px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>حالة اللقاء {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: '#475569', width: '220px' }}>الملخص</th>
                  <th onClick={() => requestSort('action')} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'action' ? '#1a8d9b' : '#475569', width: '160px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>الإجراء والمتابعة {sortConfig.key === 'action' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th onClick={() => requestSort('rating')} style={{ padding: '14px 8px', fontSize: '13px', fontWeight: '850', color: sortConfig.key === 'rating' ? '#1a8d9b' : '#475569', width: '90px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>تقييم العميل {sortConfig.key === 'rating' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} style={{ color: '#cbd5e1' }} />}</div>
                  </th>
                  <th style={{ padding: '14px 8px', fontSize: '13px', fontWeight: '850', color: '#475569', textAlign: 'center', width: '75px' }}>موقع GPS</th>
                  <th style={{ padding: '14px 8px', fontSize: '13px', fontWeight: '850', color: '#475569', width: '75px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedVisits.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.2s' }} className="hover:bg-slate-50">

                    {/* Rep */}
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                      {v.userName ? v.userName.split(' ')[0] : ''}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'block', whiteSpace: 'nowrap' }}>{v.customerName}</span>
                    </td>

                    {/* Person Met With */}
                    <td style={{ padding: '14px 16px', maxWidth: '180px', wordBreak: 'break-word' }}>
                      {v.responsibleName ? (
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>{v.responsibleName}</span>
                          {v.responsiblePhone && <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'block' }} dir="ltr">{v.responsiblePhone}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block' }}>-</span>
                      )}
                    </td>

                    {/* Address */}
                    <td style={{ padding: '14px 16px' }}>
                      {(() => {
                        const customer = customers.find(c => String(c.id) === String(v.customerId));
                        const region = customer?.location || v.region || '';
                        const city = customer?.city || '';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>{region || 'غير محدد'}</span>
                            {city && <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>{city}</span>}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Time & Duration */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} style={{ color: '#1a8d9b' }} />
                          {(() => {
                            if (!v.timeIn) return '-';
                            const d = new Date(v.timeIn);
                            let hours = d.getHours();
                            const minutes = d.getMinutes().toString().padStart(2, '0');
                            const ampm = hours >= 12 ? 'م' : 'ص';
                            hours = hours % 12;
                            hours = hours ? hours : 12;
                            return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
                          })()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', paddingRight: '16px' }}>
                          {(() => {
                            if (!v.timeIn) return '';
                            const d = new Date(v.timeIn);
                            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                          })()}
                        </span>
                      </div>
                    </td>

                    {/* Visit Type */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        backgroundColor: v.visitType === 'first_visit' ? '#ecfdf5' : '#eff6ff',
                        color: v.visitType === 'first_visit' ? '#065f46' : '#1e40af',
                        border: `1px solid ${v.visitType === 'first_visit' ? '#a7f3d0' : '#bfdbfe'}`
                      }}>
                        {v.visitTypeLabel || (v.visitType === 'first_visit' ? 'أول زيارة' : 'متابعة')}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        backgroundColor:
                          v.statusKey === 'met' ? '#ecfdf5' :
                            v.statusKey === 'not_found' ? '#f1f5f9' :
                              v.statusKey === 'waiting' ? '#fffbeb' :
                                v.statusKey === 'failed' ? '#fef2f2' : '#eff6ff',
                        color:
                          v.statusKey === 'met' ? '#065f46' :
                            v.statusKey === 'not_found' ? '#334155' :
                              v.statusKey === 'waiting' ? '#92400e' :
                                v.statusKey === 'failed' ? '#991b1b' : '#1e40af'
                      }}>
                        {v.status}
                      </span>
                    </td>

                    {/* Summary */}
                    <td style={{ padding: '14px 16px', maxWidth: '180px', wordBreak: 'break-word' }}>
                      {v.statusKey === 'failed' ? (
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', display: 'block' }}>{v.failedReason || '-'}</span>
                      ) : v.summary ? (
                        <span style={{ fontSize: '12px', color: '#475569', display: 'block', lineHeight: '1.4' }}>{v.summary}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block' }}>لا يوجد ملخص مكتوب</span>
                      )}
                    </td>

                    {/* Action & Follow up */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a8d9b', display: 'block' }}>{v.action}</span>
                      {v.followUpDate ? (
                        <span style={{ fontSize: '12px', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '4px' }}>
                          <Calendar size={11} style={{ color: '#1a8d9b' }} />
                          <span>المتابعة: {v.followUpDate}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                      )}
                      {v.samplesData && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', border: '1px dashed #cbd5e1', padding: '4px', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                          {v.samplesData.notes ? (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{v.samplesData.notes}</div>
                          ) : (
                            <>
                              <div>العينة: {v.samplesData.type || '-'}</div>
                              <div>الكمية: {v.samplesData.qty || '-'}</div>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '14px 8px' }}>
                      {v.ratingKey ? (
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color:
                            v.ratingKey === 'very_interested' ? '#10b981' :
                              v.ratingKey === 'interested' ? '#3b82f6' :
                                v.ratingKey === 'needs_followup' ? '#f59e0b' :
                                  v.ratingKey === 'uninterested' ? '#ef4444' : '#b91c1c'
                        }}>
                          {v.rating}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>غير متوفر</span>
                      )}
                    </td>

                    {/* GPS Map Link */}
                    <td style={{ padding: '14px 8px', textAlign: 'center', width: '75px' }}>
                      {v.arrivalGPS ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${v.arrivalGPS.lat},${v.arrivalGPS.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#1a8d9b',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            backgroundColor: '#f0f9fa',
                            padding: '4px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          <MapPin size={11} />
                          <span>الخريطة</span>
                          <ExternalLink size={9} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>غير متوفر</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 8px', textAlign: 'center', width: '75px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => setPreviewVisit(v)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#1a8d9b',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="hover:bg-teal-50"
                          title="معاينة التقرير"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          className="hover:bg-red-50"
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal Overlay */}
      {previewVisit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setPreviewVisit(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            direction: 'rtl',
            fontFamily: 'Tajawal, sans-serif'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} style={{ color: '#1a8d9b' }} />
                معاينة تفاصيل الزيارة
              </h3>
              <button onClick={() => setPreviewVisit(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hover:text-slate-500">
                <X size={20} />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>المندوب</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.userName}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>الزبون</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.customerName}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>نوع الزيارة</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                    {previewVisit.visitTypeLabel || (previewVisit.visitType === 'first_visit' ? 'أول زيارة' : 'متابعة')}
                  </span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>وقت وتاريخ الزيارة</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                    {(() => {
                      if (!previewVisit.timeIn) return '-';
                      const d = new Date(previewVisit.timeIn);
                      let hours = d.getHours();
                      const minutes = d.getMinutes().toString().padStart(2, '0');
                      const ampm = hours >= 12 ? 'م' : 'ص';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm} - ${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                    })()}
                  </span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>حالة اللقاء</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.status}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>المسؤول</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.responsibleName || '-'}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>هاتف المسؤول</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }} dir="ltr">{previewVisit.responsiblePhone || '-'}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>تقييم العميل</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.rating || 'غير متوفر'}</span>
                </div>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>الإجراء المتخذ</label>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{previewVisit.action || '-'}</span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>ملخص التقرير</label>
                <div style={{
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: '1.6',
                  backgroundColor: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {previewVisit.summary || (previewVisit.statusKey === 'failed' ? previewVisit.failedReason : null) || 'لا يوجد ملخص مكتوب'}
                </div>
              </div>

              {previewVisit.followUpDate && (
                <div style={{
                  backgroundColor: '#f0fdfa',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #ccfbf1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Calendar size={15} style={{ color: '#0d9488' }} />
                  <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 'bold' }}>
                    تاريخ المتابعة القادم: {previewVisit.followUpDate}
                  </span>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setPreviewVisit(null)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#1a8d9b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                className="hover:bg-teal-700"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal overlay */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '24px',
            position: 'relative',
            direction: 'rtl',
            fontFamily: 'Tajawal, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '850', color: '#1a8d9b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} style={{ color: '#1a8d9b' }} />
                <span>تسجيل تقرير زيارة جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit}>

              {/* 1. Selection Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '24px',
                padding: '18px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                border: '1px solid #f1f5f9',
                marginBottom: '24px'
              }}>
                {/* Rep Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#f0fdf4',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Users size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>اختر المندوب / الموظف *</label>
                    <select
                      required
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- اختر المندوب من القائمة --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', borderTop: '1px solid #f8fafc', paddingTop: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#e6f4f6',
                    color: '#1a8d9b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <MapPin size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>اختر العميل *</label>
                    <select
                      required
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- اختر عميلاً من القائمة --</option>
                      {customers.filter(c => c.status !== 'غير نشط').map(cust => (
                        <option key={cust.id} value={cust.id}>{cust.name} ({cust.city || 'بدون منطقة'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Visit Type Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', borderTop: '1px solid #f8fafc', paddingTop: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <RefreshCw size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>نوع الزيارة *</label>
                    <select
                      required
                      value={formData.visitType}
                      onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- اختر نوع الزيارة --</option>
                      <option value="first_visit">أول زيارة (استقطاب)</option>
                      <option value="follow_up">زيارة متابعة</option>
                    </select>
                  </div>
                </div>

                {/* Responsible Name Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', borderTop: '1px solid #f8fafc', paddingTop: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <UserCheck size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>مع من تم اللقاء</label>
                    <input
                      type="text"
                      placeholder="مع من التقيت؟ (اختياري)"
                      value={formData.responsibleName}
                      onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Date & Duration Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '14px'
                }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>تاريخ الزيارة *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>مدة اللقاء (بالدقائق) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Vertical Stepper Container */}
              <div style={{ position: 'relative', paddingRight: '42px' }}>

                {/* Vertical Line */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '16px',
                  bottom: '20px',
                  width: '3px',
                  backgroundColor: '#cbd5e1',
                  borderRadius: '999px',
                  zIndex: 0
                }} />

                {/* STEP 1: Visit Status */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Step Number Circle */}
                  <div style={{
                    position: 'absolute',
                    right: '-42px',
                    top: '4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: formData.status ? '#1a8d9b' : '#94a3b8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                    zIndex: 10,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}>1</div>

                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    border: '1px solid #f1f5f9'
                  }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>حالة الزيارة</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {[
                        { key: 'met', label: 'تم اللقاء', icon: UserCheck, color: '#10b981' },
                        { key: 'not_found', label: 'العميل غير موجود', icon: UserX, color: '#64748b' },
                        { key: 'waiting', label: 'لا يوجد اهتمام', icon: Frown, color: '#f59e0b' },
                        { key: 'postponed', label: 'تأجلت الزيارة', icon: Calendar, color: '#3b82f6' },
                        { key: 'needs_followup', label: 'متابعة', icon: RefreshCw, color: '#8b5cf6' }
                      ].map(item => {
                        const IconComp = item.icon;
                        const isActive = formData.status === item.key;
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => {
                              let updatedAction = formData.action;
                              let updatedRating = formData.rating;
                              if (item.key === 'not_found' || item.key === 'failed') {
                                updatedAction = 'new_appointment';
                                updatedRating = '';
                              } else if (item.key === 'postponed') {
                                updatedAction = 'review';
                                updatedRating = '';
                              } else if (item.key === 'waiting') {
                                updatedAction = 'review';
                                updatedRating = '';
                              }
                              setFormData({ ...formData, status: item.key, action: updatedAction, rating: updatedRating });
                            }}
                            style={{
                              padding: '12px 6px',
                              borderRadius: '12px',
                              border: isActive ? '2px solid #1a8d9b' : '1px solid #e2e8f0',
                              backgroundColor: isActive ? '#f0f9fa' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <IconComp size={20} style={{ color: isActive ? '#1a8d9b' : item.color }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#126a75' : '#475569' }}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* STEP 2: Visit Summary / Reason */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Step Number Circle */}
                  <div style={{
                    position: 'absolute',
                    right: '-42px',
                    top: '4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: (formData.summary || formData.failedReason) ? '#1a8d9b' : '#94a3b8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                    zIndex: 10,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}>2</div>

                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    border: '1px solid #f1f5f9'
                  }}>
                    {formData.status === 'failed' ? (
                      <>
                        <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>سبب عدم إتمام الزيارة</h4>
                        <input
                          type="text"
                          value={formData.failedReason}
                          onChange={(e) => setFormData({ ...formData, failedReason: e.target.value })}
                          placeholder="مثال: العميل مغلق / المسؤول غير موجود..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #ef4444',
                            fontSize: '13px',
                            color: '#1e293b',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 4px 0' }}>ملخص الزيارة</h4>
                        <textarea
                          value={formData.summary}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              setFormData({ ...formData, summary: e.target.value });
                            }
                          }}
                          placeholder="اكتب ملخصاً عما دار بالزيارة..."
                          disabled={formData.status === ''}
                          style={{
                            width: '100%',
                            height: '80px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '13px',
                            resize: 'none',
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: formData.status === '' ? '#f8fafc' : '#ffffff'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                          {formData.summary.length}/500 حرف
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* STEP 3: Required Action */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                  <div style={{
                    position: 'absolute',
                    right: '-42px',
                    top: '4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: formData.action ? '#1a8d9b' : '#94a3b8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                    zIndex: 10,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}>3</div>

                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    border: '1px solid #f1f5f9'
                  }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>الإجراء المطلوب</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {[
                        { key: 'new_order', label: 'طلبية جديدة', icon: ShoppingCart, color: '#0ea5e9', allowed: formData.status === 'met' },
                        { key: 'review', label: 'موعد مراجعة', icon: Clock, color: '#3b82f6', allowed: ['met', 'waiting', 'postponed', 'not_found'].includes(formData.status) },
                        { key: 'none', label: 'لا يوجد', icon: HelpCircle, color: '#94a3b8', allowed: ['met', 'waiting', 'failed', 'postponed'].includes(formData.status) },
                        { key: 'samples', label: 'إرسال عينات', icon: Package, color: '#a855f7', allowed: formData.status === 'met' },
                        { key: 'price_offer', label: 'عرض سعر', icon: FileText, color: '#f59e0b', allowed: formData.status === 'met' },
                        { key: 'waiting_reply', label: 'انتظار رد العميل', icon: Hourglass, color: '#ec4899', allowed: formData.status === 'met' }
                      ].map(item => {
                        const IconComp = item.icon;
                        const isActive = formData.action === item.key;
                        const isVisible = item.allowed || formData.status === '';
                        if (!isVisible) return null;
                        return (
                          <button
                            type="button"
                            key={item.key}
                            onClick={() => setFormData({ ...formData, action: item.key })}
                            style={{
                              padding: '12px 6px',
                              borderRadius: '12px',
                              border: isActive ? '2px solid #1a8d9b' : '1px solid #e2e8f0',
                              backgroundColor: isActive ? '#f0f9fa' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <IconComp size={20} style={{ color: isActive ? '#1a8d9b' : item.color }} />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#126a75' : '#475569' }}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Conditional parameters based on Action */}
                    {['review', 'new_appointment', 'waiting_reply'].includes(formData.action) && (
                      <div style={{
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '12px',
                        marginTop: '12px'
                      }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                          {formData.action === 'waiting_reply' ? 'تاريخ مراجعة الرد الإجباري' : 'تاريخ الموعد القادم'}
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.followUpDate}
                          onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #1a8d9b',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            color: '#1e293b',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}

                    {formData.action === 'samples' && (
                      <div style={{
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '12px',
                        marginTop: '12px'
                      }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '850', color: '#1e293b', margin: '0 0 4px 0' }}>تفاصيل العينات المطلوبة</h4>
                        <textarea
                          value={formData.sampleNotes}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              setFormData({ ...formData, sampleNotes: e.target.value });
                            }
                          }}
                          placeholder="اكتب تفاصيل العينات والكميات المطلوبة وعنوان التسليم هنا..."
                          style={{
                            width: '100%',
                            height: '80px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            fontSize: '13px',
                            resize: 'none',
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                          {formData.sampleNotes.length}/500 حرف
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 4: Customer Rating */}
                {formData.status === 'met' && (
                  <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <div style={{
                      position: 'absolute',
                      right: '-42px',
                      top: '4px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: formData.rating ? '#1a8d9b' : '#94a3b8',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '13px',
                      zIndex: 10,
                      boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                    }}>4</div>

                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      padding: '16px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      border: '1px solid #f1f5f9'
                    }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>تقييم العميل</h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {[
                          { key: 'very_interested', label: 'مهتم جداً', icon: Smile, color: '#10b981' },
                          { key: 'interested', label: 'مهتم', icon: Smile, color: '#3b82f6' },
                          { key: 'needs_followup', label: 'يحتاج متابعة', icon: Meh, color: '#f59e0b' },
                          { key: 'uninterested', label: 'غير مهتم', icon: Frown, color: '#ef4444' },
                          { key: 'stop', label: 'توقف عن التعامل', icon: AlertOctagon, color: '#b91c1c' }
                        ].map(item => {
                          const IconComp = item.icon;
                          const isActive = formData.rating === item.key;
                          return (
                            <button
                              type="button"
                              key={item.key}
                              onClick={() => setFormData({ ...formData, rating: item.key })}
                              style={{
                                padding: '10px 4px',
                                borderRadius: '12px',
                                border: isActive ? '2px solid #1a8d9b' : '1px solid #e2e8f0',
                                backgroundColor: isActive ? '#f0f9fa' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                paddingRight: '12px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <IconComp size={18} style={{ color: isActive ? '#1a8d9b' : item.color }} />
                              <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#126a75' : '#475569' }}>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Submission Button */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    right: '-42px',
                    top: '12px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                    zIndex: 10,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                  }}>{formData.status === 'met' ? '5' : '4'}</div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '16px',
                      backgroundColor: isSubmitting ? '#a7f3d0' : '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '900',
                      fontSize: '16px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSubmitting ? (
                      <>جاري الحفظ...</>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        <span>إنهاء الزيارة وحفظ التقرير</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminRepVisits;
