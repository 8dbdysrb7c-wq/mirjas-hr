import React, { useState, useEffect, useMemo } from 'react';
import { 
  getRepVisits, deleteRepVisit, getEmployees, getCustomers 
} from '../../store';
import { 
  Search, Filter, Trash2, Calendar, Clock, MapPin, 
  AlertTriangle, CheckCircle, Info, Users, ShieldAlert, 
  RotateCcw, ExternalLink, RefreshCw, Star, Ban
} from 'lucide-react';
import Swal from 'sweetalert2';

export const AdminRepVisits = () => {
  const [visits, setVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [repFilter, setRepFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [needsFollowUpFilter, setNeedsFollowUpFilter] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vList, empList, custList] = await Promise.all([
        getRepVisits(),
        getEmployees(),
        getCustomers()
      ]);
      setVisits(vList.sort((a, b) => new Date(b.timeIn) - new Date(a.timeIn)));
      setEmployees(empList);
      setCustomers(custList);
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
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

  // Smart Alerts Logic
  const alerts = useMemo(() => {
    const list = [];
    const todayStr = new Date().toISOString().split('T')[0];

    visits.forEach(v => {
      // 1. Ended visit without follow-up although status wasn't met (completed)
      const isNotMet = v.statusKey !== 'met';
      const isNoAction = v.actionKey === 'none';
      if (isNotMet && isNoAction) {
        list.push({
          type: 'danger',
          message: `المندوب ${v.userName} أنهى زيارته للعميل (${v.customerName}) بدون تحديد إجراء متابعة رغم أن اللقاء لم يتم فعلياً (${v.status}).`,
          visitId: v.id
        });
      }

      // 2. Overdue follow-up appointment
      if (v.followUpDate && v.followUpDate < todayStr) {
        // Check if there is a newer visit to this customer
        const hasNewerVisit = visits.some(nv => nv.customerId === v.customerId && nv.timeIn > v.timeIn);
        if (!hasNewerVisit) {
          list.push({
            type: 'warning',
            message: `موعد المتابعة القادم للعميل (${v.customerName}) والمحدد بتاريخ (${v.followUpDate}) قد تأخر ولم يتم تنفيذه بعد (المندوب المسؤول: ${v.userName}).`,
            visitId: v.id
          });
        }
      }

      // 3. Very interested client but no price offer action was set
      if (v.ratingKey === 'very_interested' && v.actionKey !== 'price_offer') {
        list.push({
          type: 'info',
          message: `العميل (${v.customerName}) تم تقييمه بـ "مهتم جداً" من المندوب ${v.userName}، ولكن لم يتم تحديد إجراء "عرض سعر". يرجى المتابعة الإدارية لتجهيز عرض السعر.`,
          visitId: v.id
        });
      }

      // 4. Waiting reply selected but no follow up date set
      if (v.actionKey === 'waiting_reply' && !v.followUpDate) {
        list.push({
          type: 'warning',
          message: `تم اختيار إجراء "انتظار رد العميل" في زيارة العميل (${v.customerName}) بدون تحديد تاريخ مراجعة إجباري. قد يؤدي ذلك لإهمال العميل.`,
          visitId: v.id
        });
      }
    });

    return list;
  }, [visits]);

  // Unique list values for filters
  const uniqueReps = useMemo(() => {
    return [...new Set(visits.map(v => v.userName))];
  }, [visits]);

  const uniqueRegions = useMemo(() => {
    return [...new Set(visits.map(v => v.region).filter(Boolean))];
  }, [visits]);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      const matchRep = !repFilter || v.userName === repFilter;
      const matchCust = !customerFilter || v.customerId === customerFilter;
      const matchRegion = !regionFilter || v.region === regionFilter;
      const matchStatus = !statusFilter || v.status === statusFilter;
      const matchAction = !actionFilter || v.action === actionFilter;
      
      let matchNeedsFollowUp = true;
      if (needsFollowUpFilter) {
        // Needs follow up if has follow-up date, or if it is postponed/failed/waiting
        matchNeedsFollowUp = !!v.followUpDate || ['waiting', 'failed', 'postponed'].includes(v.statusKey);
      }

      return matchRep && matchCust && matchRegion && matchStatus && matchAction && matchNeedsFollowUp;
    });
  }, [visits, repFilter, customerFilter, regionFilter, statusFilter, actionFilter, needsFollowUpFilter]);

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('ar-JO')} ${d.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}`;
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
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>مراقبة زيارات مندوبي المبيعات، ومواقع الـ GPS، والتقييمات، وجدول المتابعات القادمة.</p>
        </div>
        <button 
          onClick={loadData}
          disabled={isLoading}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: '1.5px solid #1a8d9b',
            color: '#1a8d9b',
            backgroundColor: '#ffffff',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          تحديث البيانات
        </button>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ef4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            <span>تنبيهات مهمة للإدارة ({alerts.length})</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.map((alert, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  borderRight: `5px solid ${alert.type === 'danger' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                  backgroundColor: alert.type === 'danger' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : '#eff6ff',
                  color: alert.type === 'danger' ? '#991b1b' : alert.type === 'warning' ? '#92400e' : '#1e40af',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Panel */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        border: '1px solid #f1f5f9',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: '#1a8d9b' }} />
          <span>تصفية وفلترة التقارير</span>
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {/* Rep */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>المندوب</label>
            <select 
              value={repFilter} 
              onChange={(e) => setRepFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold' }}
            >
              <option value="">كل المندوبين</option>
              {uniqueReps.map((r, i) => (
                <option key={i} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>العميل</label>
            <select 
              value={customerFilter} 
              onChange={(e) => setCustomerFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold' }}
            >
              <option value="">كل العملاء</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>المنطقة</label>
            <select 
              value={regionFilter} 
              onChange={(e) => setRegionFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold' }}
            >
              <option value="">كل المناطق</option>
              {uniqueRegions.map((reg, i) => (
                <option key={i} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>حالة الزيارة</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold' }}
            >
              <option value="">كل الحالات</option>
              <option value="تم اللقاء">تم اللقاء</option>
              <option value="العميل غير موجود">العميل غير موجود</option>
              <option value="بانتظار المسؤول">بانتظار المسؤول</option>
              <option value="الزيارة لم تتم">الزيارة لم تتم</option>
              <option value="تأجلت الزيارة">تأجلت الزيارة</option>
            </select>
          </div>

          {/* Action */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>الإجراء المطلوب</label>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: 'bold' }}
            >
              <option value="">كل الإجراءات</option>
              <option value="لا يوجد">لا يوجد</option>
              <option value="موعد مراجعة">موعد مراجعة</option>
              <option value="موعد جديد">موعد جديد</option>
              <option value="إرسال عينات">إرسال عينات</option>
              <option value="عرض سعر">عرض سعر</option>
              <option value="انتظار رد العميل">انتظار رد العميل</option>
            </select>
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
        ) : filteredVisits.length === 0 ? (
          <div style={{ padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
            <Ban size={48} />
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>لا توجد تقارير زيارات تطابق فلاتر البحث الحالية.</span>
            <button 
              onClick={() => {
                setRepFilter('');
                setCustomerFilter('');
                setRegionFilter('');
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
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>المندوب</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>العميل والمنطقة</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>وقت الزيارة والمدة</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>حالة اللقاء</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>ملخص/سبب الفشل</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>الإجراء والمتابعة</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569' }}>تقييم العميل</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569', textAlign: 'center' }}>موقع GPS</th>
                  <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '850', color: '#475569', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.2s' }} className="hover:bg-slate-50">
                    
                    {/* Rep */}
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                      {v.userName}
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>{v.customerName}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>{v.region}</span>
                    </td>

                    {/* Time & Duration */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} style={{ color: '#1a8d9b' }} />
                        <span>من: {formatDateTime(v.timeIn)}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                        المدة: <strong style={{ color: '#1a8d9b' }}>{v.duration} دقيقة</strong>
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

                    {/* Summary/Reason */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569', maxWidth: '240px', wordBreak: 'break-word' }}>
                      {v.statusKey === 'failed' ? (
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>السبب: {v.failedReason || '-'}</span>
                      ) : (
                        v.summary || <span style={{ color: '#cbd5e1' }}>لا يوجد ملخص مكتوب</span>
                      )}
                    </td>

                    {/* Action & Follow up */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a8d9b', display: 'block' }}>{v.action}</span>
                      {v.followUpDate ? (
                        <span style={{ fontSize: '11px', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', backgroundColor: '#f0fdfa', padding: '2px 6px', borderRadius: '4px' }}>
                          <Calendar size={11} style={{ color: '#1a8d9b' }} />
                          <span>المتابعة: {v.followUpDate}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                      )}
                      {v.samplesData && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', border: '1px dashed #cbd5e1', padding: '4px', borderRadius: '4px', backgroundColor: '#f8fafc' }}>
                          <div>العينة: {v.samplesData.type || '-'}</div>
                          <div>الكمية: {v.samplesData.qty || '-'}</div>
                        </div>
                      )}
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 'bold' }}>
                      {v.ratingKey ? (
                        <span style={{
                          color: 
                            v.ratingKey === 'very_interested' ? '#10b981' : 
                            v.ratingKey === 'interested' ? '#3b82f6' : 
                            v.ratingKey === 'needs_followup' ? '#f59e0b' : 
                            v.ratingKey === 'uninterested' ? '#ef4444' : '#b91c1c'
                        }}>
                          {v.rating}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>غير متوفر</span>
                      )}
                    </td>

                    {/* GPS Map Link */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
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
                            padding: '6px 10px',
                            borderRadius: '8px'
                          }}
                        >
                          <MapPin size={12} />
                          <span>عرض الخريطة</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>غير متوفر</span>
                      )}
                    </td>

                    {/* Delete button */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px'
                        }}
                        className="hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
export default AdminRepVisits;
