import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, Calendar, ClipboardList, UserCheck, UserX, 
  Hourglass, Ban, ArrowRight, CheckCircle, Package, FileText, 
  AlertTriangle, Smile, Meh, Frown, AlertOctagon, HelpCircle, CheckCircle2, ChevronLeft 
} from 'lucide-react';
import { getCustomers, saveRepVisit, saveSupervisorTask, getEmployees } from '../../../store';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import Swal from 'sweetalert2';

export const RepVisitsTab = ({ user, onBack, handleTabChange }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // GPS & Timing
  const [locationStatus, setLocationStatus] = useState('LOADING'); // LOADING, SUCCESS, ERROR
  const [currentAddress, setCurrentAddress] = useState('جاري تحديد موقع الوصول...');
  const [coords, setCoords] = useState(null);
  const [timeIn, setTimeIn] = useState(null);

  // Stepper Fields
  const [status, setStatus] = useState(''); // met, not_found, waiting, failed, postponed
  const [summary, setSummary] = useState('');
  const [action, setAction] = useState(''); // none, review, new_appointment, samples, price_offer, waiting_reply
  const [rating, setRating] = useState(''); // very_interested, interested, needs_followup, uninterested, stop
  
  // Sub-fields for Actions/Statuses
  const [followUpDate, setFollowUpDate] = useState(null);
  const [sampleType, setSampleType] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [sampleNotes, setSampleNotes] = useState('');
  const [failedReason, setFailedReason] = useState(''); // for "الزيارة لم تتم"

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customers and start check-in on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const custs = await getCustomers();
        setCustomers(custs.filter(c => c.status !== 'غير نشط'));
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    };
    loadData();

    // Record time in
    setTimeIn(new Date());

    // Auto GPS Check-in
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setLocationStatus('SUCCESS');
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
          const data = await res.json();
          if (data && data.address) {
            const parts = [];
            if (data.address.state || data.address.city || data.address.town) parts.push(data.address.state || data.address.city || data.address.town);
            if (data.address.suburb || data.address.neighbourhood) parts.push(data.address.suburb || data.address.neighbourhood);
            setCurrentAddress(parts.join(' ، ') || 'موقع الزيارة');
          } else {
            setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch (e) {
          setCurrentAddress('عمان، الأردن');
        }
      }, () => {
        setLocationStatus('ERROR');
        setCurrentAddress('تعذر تحديد الموقع الجغرافي');
      });
    } else {
      setLocationStatus('ERROR');
      setCurrentAddress('المتصفح لا يدعم تحديد الموقع');
    }
  }, []);

  // Rules Engine: enforce constraints when Visit Status changes
  useEffect(() => {
    if (!status) return;

    if (status === 'not_found') {
      // Must choose "موعد جديد"
      setAction('new_appointment');
      setRating('');
    } else if (status === 'failed') {
      // Must choose "موعد جديد"
      setAction('new_appointment');
      setRating('');
    } else if (status === 'postponed') {
      // Must choose "موعد جديد" or "موعد مراجعة"
      if (action !== 'new_appointment' && action !== 'review') {
        setAction('review');
      }
      setRating('');
    } else if (status === 'waiting') {
      // Allow only review, waiting_reply, new_appointment
      if (action !== 'review' && action !== 'waiting_reply' && action !== 'new_appointment') {
        setAction('review');
      }
      setRating('');
    } else {
      // met: all actions allowed, default none or keep existing
    }
  }, [status]);

  const handleFinishVisit = async () => {
    if (!selectedCustomer) {
      Swal.fire('تنبيه', 'يرجى اختيار العميل أولاً!', 'warning');
      return;
    }
    if (!status) {
      Swal.fire('تنبيه', 'يرجى تحديد حالة الزيارة!', 'warning');
      return;
    }

    // Validation according to status
    if (status === 'met') {
      if (!rating) {
        Swal.fire('تنبيه', 'يرجى اختيار تقييم العميل قبل إنهاء الزيارة!', 'warning');
        return;
      }
    }

    if (status === 'failed') {
      if (!failedReason.trim()) {
        Swal.fire('تنبيه', 'يرجى كتابة سبب عدم إتمام الزيارة!', 'warning');
        return;
      }
    }

    // Validation according to action requirements
    if (['review', 'new_appointment', 'waiting_reply'].includes(action) || (status === 'postponed')) {
      if (!followUpDate) {
        Swal.fire('تنبيه', 'يرجى تحديد تاريخ المتابعة/المراجعة القادم!', 'warning');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // End timestamp
      const timeOut = new Date();
      const durationMs = timeOut.getTime() - timeIn.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

      // Fetch checkout GPS
      let checkoutGPS = coords;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          checkoutGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn("Could not fetch fresh GPS at checkout, using arrival GPS");
        }
      }

      // Map labels
      const statusLabels = {
        met: 'تم اللقاء',
        not_found: 'العميل غير موجود',
        waiting: 'بانتظار المسؤول',
        failed: 'الزيارة لم تتم',
        postponed: 'تأجلت الزيارة'
      };

      const actionLabels = {
        none: 'لا يوجد',
        review: 'موعد مراجعة',
        new_appointment: 'موعد جديد',
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

      const visitData = {
        userId: user.id,
        userName: user.name,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        region: selectedCustomer.region || selectedCustomer.city || 'غير محددة',
        date: new Date().toISOString().split('T')[0],
        timeIn: timeIn.toISOString(),
        timeOut: timeOut.toISOString(),
        duration: durationMinutes,
        status: statusLabels[status],
        statusKey: status,
        action: actionLabels[action],
        actionKey: action,
        rating: rating ? ratingLabels[rating] : 'لا يوجد (زيارة لم تتم)',
        ratingKey: rating || '',
        followUpDate: followUpDate ? followUpDate.toISOString().split('T')[0] : null,
        failedReason: status === 'failed' ? failedReason : null,
        samplesData: action === 'samples' ? { type: sampleType, qty: sampleQty, notes: sampleNotes } : null,
        arrivalGPS: coords,
        checkoutGPS
      };

      // 1. Save Visit to Firestore
      await saveRepVisit(visitData);

      // 2. If action is price_offer (عرض سعر), create a task for supervisor/admin
      if (action === 'price_offer') {
        const taskData = {
          name: `تجهيز عرض سعر للعميل: ${selectedCustomer.name}`,
          description: `مطلوب تجهيز وإرسال عرض سعر للعميل المهتم بناءً على زيارة المندوب ${user.name}.\nملخص الزيارة:\n${summary}`,
          status: 'جديدة',
          priority: 'عالية',
          createdBy: user.name,
          assignedTo: 'admin',
          category: 'مبيعات'
        };
        await saveSupervisorTask(taskData);
      }

      Swal.fire({
        title: 'تم إنهاء الزيارة',
        text: 'تم حفظ تقرير الزيارة وموقعك الجغرافي بنجاح. شكراً لك!',
        icon: 'success',
        confirmButtonText: 'ممتاز',
        confirmButtonColor: '#1a8d9b'
      }).then(() => {
        if (onBack) onBack();
        else if (handleTabChange) handleTabChange('home');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('خطأ', 'حدث خطأ أثناء حفظ تقرير الزيارة، يرجى التحقق من اتصالك بالإنترنت والملف.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      maxWidth: '540px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      paddingBottom: '40px',
      fontFamily: 'Tajawal, sans-serif'
    }} dir="rtl">
      
      {/* Mobile Top Navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #1a8d9b 0%, #15737e 100%)',
        color: '#ffffff',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 4px 15px rgba(26, 141, 155, 0.15)'
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ArrowRight size={20} />
        </button>
        <span style={{ fontWeight: '850', fontSize: '18px' }}>تقرير زيارة مندوب مبيعات</span>
        <div style={{ width: '38px' }} /> {/* Spacer */}
      </div>

      <div style={{ padding: '16px' }}>

        {/* 1. Customer Selection Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '18px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
          border: '1px solid #f1f5f9',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              backgroundColor: '#e6f4f6',
              color: '#1a8d9b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MapPin size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>اختر العميل</label>
              <select 
                value={selectedCustomer ? selectedCustomer.id : ''} 
                onChange={(e) => {
                  const cust = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
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
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.city || 'بدون منطقة'})</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} style={{ color: '#1a8d9b' }} />
              <span>تسجيل الدخول: <strong style={{ color: '#1e293b' }}>{timeIn ? timeIn.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' }) : '...'}</strong></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} style={{ color: locationStatus === 'SUCCESS' ? '#10b981' : '#f59e0b' }} />
              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentAddress}>
                {currentAddress}
              </span>
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
              backgroundColor: status ? '#1a8d9b' : '#94a3b8',
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
                  { key: 'waiting', label: 'بانتظار المسؤول', icon: Hourglass, color: '#f59e0b' },
                  { key: 'failed', label: 'الزيارة لم تتم', icon: Ban, color: '#ef4444' },
                  { key: 'postponed', label: 'تأجلت الزيارة', icon: Calendar, color: '#3b82f6' }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = status === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setStatus(item.key)}
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
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: (summary || failedReason) ? '#1a8d9b' : '#94a3b8',
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
              {status === 'failed' ? (
                <>
                  <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>سبب عدم إتمام الزيارة</h4>
                  <input
                    type="text"
                    value={failedReason}
                    onChange={(e) => setFailedReason(e.target.value)}
                    placeholder="مثال: العميل مغلق / المسؤول غير موجود..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #ef4444',
                      fontSize: '13px',
                      color: '#1e293b',
                      outline: 'none'
                    }}
                  />
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 4px 0' }}>ملخص الزيارة</h4>
                  <textarea
                    value={summary}
                    onChange={(e) => {
                      if (e.target.value.length <= 250) {
                        setSummary(e.target.value);
                      }
                    }}
                    placeholder="اكتب ملخصاً عما دار بالزيارة..."
                    disabled={status === ''}
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      backgroundColor: status === '' ? '#f8fafc' : '#ffffff'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {summary.length}/250 حرف
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
              backgroundColor: action ? '#1a8d9b' : '#94a3b8',
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
                  { key: 'none', label: 'لا يوجد', icon: HelpCircle, color: '#94a3b8', allowed: status === 'met' },
                  { key: 'review', label: 'موعد مراجعة', icon: Clock, color: '#3b82f6', allowed: ['met', 'waiting', 'postponed'].includes(status) },
                  { key: 'new_appointment', label: 'موعد جديد', icon: Calendar, color: '#10b981', allowed: ['met', 'not_found', 'waiting', 'failed', 'postponed'].includes(status) },
                  { key: 'samples', label: 'إرسال عينات', icon: Package, color: '#a855f7', allowed: status === 'met' },
                  { key: 'price_offer', label: 'عرض سعر', icon: FileText, color: '#f59e0b', allowed: status === 'met' },
                  { key: 'waiting_reply', label: 'انتظار رد العميل', icon: Hourglass, color: '#ec4899', allowed: ['met', 'waiting'].includes(status) }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = action === item.key;
                  const isVisible = item.allowed || status === '';
                  if (!isVisible) return null;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setAction(item.key)}
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
              {['review', 'new_appointment', 'waiting_reply'].includes(action) && (
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  marginTop: '12px'
                }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    {action === 'waiting_reply' ? 'تاريخ مراجعة الرد الإجباري' : 'تاريخ الموعد القادم'}
                  </label>
                  <Flatpickr
                    options={{
                      locale: Arabic,
                      dateFormat: 'Y-m-d',
                      minDate: 'today'
                    }}
                    value={followUpDate}
                    onChange={(dates) => {
                      if (dates && dates.length > 0) {
                        setFollowUpDate(dates[0]);
                      }
                    }}
                    placeholder="اختر التاريخ من التقويم"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #1a8d9b',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>
              )}

              {action === 'samples' && (
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>نوع العينة</label>
                    <input 
                      type="text" 
                      value={sampleType} 
                      onChange={(e) => setSampleType(e.target.value)} 
                      placeholder="مثال: قماش صوف رمادي"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>الكمية</label>
                    <input 
                      type="text" 
                      value={sampleQty} 
                      onChange={(e) => setSampleQty(e.target.value)} 
                      placeholder="مثال: قطعتين / 5 أمتار"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>ملاحظات التسليم</label>
                    <input 
                      type="text" 
                      value={sampleNotes} 
                      onChange={(e) => setSampleNotes(e.target.value)} 
                      placeholder="العنوان أو رقم هاتف المستلم"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: Customer Rating */}
          {status === 'met' && (
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <div style={{
                position: 'absolute',
                right: '-42px',
                top: '4px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: rating ? '#1a8d9b' : '#94a3b8',
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
                    const isActive = rating === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setRating(item.key)}
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

          {/* STEP 5: End Visit Summary Text */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
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
            }}>{status === 'met' ? '5' : '4'}</div>

            <div style={{ padding: '4px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px' }}>
                <Clock size={16} />
                <span>سيتم تسجيل وقت المغادرة وحساب مدة الزيارة تلقائياً</span>
              </div>
            </div>
          </div>

          {/* STEP 6: Submission Button */}
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
            }}>{status === 'met' ? '6' : '5'}</div>

            <button
              onClick={handleFinishVisit}
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

      </div>
    </div>
  );
};
export default RepVisitsTab;
