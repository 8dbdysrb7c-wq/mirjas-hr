import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, CheckCircle, Clock, MapPin, Search, Calendar, ChevronDown, Activity, 
  CheckCircle2, XCircle, RefreshCw, X, Filter, UserCheck, Phone, ArrowRight
} from 'lucide-react';
import { saveRepVisit, getCustomers } from '../../../store';
import Swal from 'sweetalert2';
import HRDateFilter from '../../../components/ui/HRDateFilter';
import { matchesSearch, useDebounce } from '../../../utils/searchEngine';

export const RepVisitHistoryTab = ({ myVisits = [], isMobile, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [filterStatus, setFilterStatus] = useState('الكل');
  
  // Advanced Filters toggle
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced Filters
  const [dateMode, setDateMode] = useState('month');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const [filterCity, setFilterCity] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterSector, setFilterSector] = useState('');

  const [selectedVisit, setSelectedVisit] = useState(null);
  const [localVisits, setLocalVisits] = useState(myVisits);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    setLocalVisits(myVisits);
  }, [myVisits]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const custs = await getCustomers();
        setCustomers(custs);
      } catch (err) {
        console.error("Error loading customers for history filters:", err);
      }
    };
    loadCustomers();
  }, []);

  const handleUpdateProgress = async (visit, newStatus) => {
    try {
      const updatedVisit = { ...visit, progressStatus: newStatus };
      await saveRepVisit(updatedVisit);
      setLocalVisits(prev => prev.map(v => v.id === visit.id ? updatedVisit : v));
      Swal.fire({
        title: 'تم التحديث',
        text: `تم تغيير حالة الطلب إلى: ${newStatus}`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('خطأ', 'حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const getProgressColor = (status) => {
    switch(status) {
      case 'تم': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', icon: <CheckCircle2 size={14} /> };
      case 'مغلق': return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', icon: <XCircle size={14} /> };
      case 'متابعة': 
      default: return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', icon: <RefreshCw size={14} /> };
    }
  };

  const getStatusBorderColor = (status) => {
    switch(status) {
      case 'تم': return '#10b981';
      case 'مغلق': return '#64748b';
      case 'متابعة':
      default: return '#f97316';
    }
  };

  // Local date helper to get correct YYYY-MM-DD in local timezone
  const getLocalDateStr = (d) => {
    if (!d) return '';
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateStr(new Date());

  // Statistics calculation for today
  const stats = React.useMemo(() => {
    const todayVisits = localVisits.filter(v => {
      const visitDate = v.date || (v.createdAt ? v.createdAt.split('T')[0] : '');
      return visitDate === todayStr;
    });

    return {
      total: todayVisits.length,
      completed: todayVisits.filter(v => (v.progressStatus || 'متابعة') === 'تم').length,
      pending: todayVisits.filter(v => (v.progressStatus || 'متابعة') === 'متابعة').length,
      newClients: todayVisits.filter(v => v.visitType === 'first_visit').length
    };
  }, [localVisits, todayStr]);

  const uniqueCities = [...new Set(localVisits.map(v => {
    const cust = customers.find(c => c.id === v.customerId);
    return v.city || cust?.city || 'غير محدد';
  }))].filter(Boolean);

  const uniqueAreas = [...new Set(localVisits.map(v => {
    const cust = customers.find(c => c.id === v.customerId);
    return v.region || v.area || cust?.region || cust?.location || 'غير محدد';
  }))].filter(Boolean);

  const uniqueSectors = [...new Set(localVisits.map(v => {
    const cust = customers.find(c => c.id === v.customerId);
    return v.sector || cust?.sector || 'غير محدد';
  }))].filter(Boolean);

  let filteredVisits = localVisits.filter(v => {
    const pStatus = v.progressStatus || 'متابعة';
    const matchSearch = matchesSearch(
      [v.customerName, v.customerNumber, v.action, v.city, v.area, v.sector],
      debouncedSearchTerm
    );
    const matchFilter = filterStatus === 'الكل' || pStatus === filterStatus;
    
    // Date filter
    const visitDate = v.date || (v.createdAt ? v.createdAt.split('T')[0] : '');
    let matchDate = true;
    if (visitDate) {
      if (dateMode === 'day') {
        matchDate = visitDate === filterDate;
      } else if (dateMode === 'month') {
        matchDate = visitDate.startsWith(filterMonth);
      } else if (dateMode === 'range') {
        if (filterStartDate && filterEndDate) {
          matchDate = visitDate >= filterStartDate && visitDate <= filterEndDate;
        }
      }
    }

    // Other filters
    const cust = customers.find(c => c.id === v.customerId);
    const vCity = v.city || cust?.city || 'غير محدد';
    const vArea = v.region || v.area || cust?.region || cust?.location || 'غير محدد';
    const vSector = v.sector || cust?.sector || 'غير محدد';
    
    const matchCity = !filterCity || vCity === filterCity;
    const matchArea = !filterArea || vArea === filterArea;
    const matchSector = !filterSector || vSector === filterSector;

    return matchSearch && matchFilter && matchDate && matchCity && matchArea && matchSector;
  }).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  // Determine if any filters are active
  const isDefaultState = !searchTerm && filterStatus === 'الكل' && dateMode === 'month' && 
                         filterMonth === new Date().toISOString().slice(0, 7) && 
                         !filterCity && !filterArea && !filterSector;

  // Apply limit to 10 only if in default state
  if (isDefaultState) {
    filteredVisits = filteredVisits.slice(0, 10);
  }

  return (
    <div style={{ paddingBottom: isMobile ? '80px' : '20px', fontFamily: 'Tajawal, sans-serif', maxWidth: '540px', margin: '0 auto' }} dir="rtl">
      
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
        boxShadow: '0 4px 15px rgba(26, 141, 155, 0.15)',
        marginBottom: '20px',
        marginRight: '-16px',
        marginLeft: '-16px',
        marginTop: '-16px'
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
        <span style={{ fontWeight: '850', fontSize: '18px' }}>سجل زياراتي الميدانية</span>
        <div style={{ width: '38px' }} />
      </div>

      {/* Stats Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {[
          { label: 'زيارات اليوم', value: stats.total, color: '#0284c7', bg: '#e0f2fe', icon: <Activity size={15} /> },
          { label: 'مكتملة', value: stats.completed, color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle2 size={15} /> },
          { label: 'متابعة', value: stats.pending, color: '#ea580c', bg: '#ffedd5', icon: <RefreshCw size={15} /> },
          { label: 'عملاء جدد', value: stats.newClients, color: '#7c3aed', bg: '#f3e8ff', icon: <UserCheck size={15} /> }
        ].map((item, idx) => (
          <div 
            key={idx}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '10px 4px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: item.bg,
              color: item.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', whiteSpace: 'nowrap' }}>{item.label}</span>
            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '900' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#1a8d9b', padding: '16px', borderRadius: '20px', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 15px rgba(26,141,155,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 'bold', margin: '0 0 12px 0' }}>سجل زياراتي الميدانية ({filteredVisits.length})</h2>
        
        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
          
          {/* Search Row with Expandable Filter Trigger */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', right: '10px', top: '10px', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="ابحث باسم العميل أو الإجراء..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', color: '#1e293b', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                backgroundColor: showAdvancedFilters ? '#ffffff' : 'rgba(255,255,255,0.15)',
                color: showAdvancedFilters ? '#1a8d9b' : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title="تصفية متقدمة"
            >
              <Filter size={16} />
            </button>
          </div>

          {/* Expandable Advanced Filters container */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                  {/* Date Filter */}
                  <div style={{ width: '100%' }}>
                    <HRDateFilter 
                      mode={dateMode} setMode={setDateMode}
                      date={filterDate} setDate={setFilterDate}
                      month={filterMonth} setMonth={setFilterMonth}
                      startDate={filterStartDate} setStartDate={setFilterStartDate}
                      endDate={filterEndDate} setEndDate={setFilterEndDate}
                    />
                  </div>

                  {/* Additional Select Filters */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <select 
                      value={filterSector} 
                      onChange={(e) => setFilterSector(e.target.value)}
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', color: '#1e293b', width: '100%' }}
                    >
                      <option value="">كل القطاعات</option>
                      {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select 
                      value={filterCity} 
                      onChange={(e) => setFilterCity(e.target.value)}
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', color: '#1e293b', width: '100%' }}
                    >
                      <option value="">كل المدن</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select 
                      value={filterArea} 
                      onChange={(e) => setFilterArea(e.target.value)}
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', fontSize: '11px', color: '#1e293b', width: '100%' }}
                    >
                      <option value="">كل المناطق</option>
                      {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick status selection row */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '4px' }}>
            {['الكل', 'متابعة', 'تم', 'مغلق'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  border: '1px solid',
                  whiteSpace: 'nowrap',
                  backgroundColor: filterStatus === status ? '#ffffff' : 'rgba(255,255,255,0.1)',
                  color: filterStatus === status ? '#1a8d9b' : '#ffffff',
                  borderColor: filterStatus === status ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards List container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredVisits.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '32px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            لا يوجد زيارات مسجلة
          </div>
        ) : (
          filteredVisits.map(visit => {
            const pStatus = visit.progressStatus || 'متابعة';
            const colors = getProgressColor(pStatus);
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={visit.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  border: `1px solid #f1f5f9`,
                  borderRight: `5px solid ${getStatusBorderColor(pStatus)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Upper Row: Name, Date, status edit */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingLeft: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>
                      {visit.customerName}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '11px' }}>
                        <Calendar size={11} /> <span>{visit.date}</span>
                      </div>
                      
                      {visit.visitTypeLabel && (
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 'bold', 
                          padding: '2px 8px', 
                          borderRadius: '6px',
                          backgroundColor: visit.visitType === 'first_visit' ? '#ecfdf5' : '#eff6ff',
                          color: visit.visitType === 'first_visit' ? '#059669' : '#2563eb'
                        }}>
                          {visit.visitTypeLabel}
                        </span>
                      )}
                    </div>
                    {visit.responsibleName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1a8d9b', fontSize: '11px', marginTop: '4px' }}>
                        <UserCheck size={11} /> <span>{visit.responsibleName}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Select dropdown to update status */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <select 
                      value={pStatus}
                      onChange={(e) => handleUpdateProgress(visit, e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundColor: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        padding: '4px 22px 4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="متابعة">متابعة</option>
                      <option value="تم">تم</option>
                      <option value="مغلق">مغلق</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '7px', color: colors.text, pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Details line */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderTop: '1px dashed #f1f5f9', 
                  paddingTop: '8px',
                  fontSize: '11.5px' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} /> الإجراء: {visit.action}
                    </span>
                    <span style={{ color: '#64748b' }}>
                       الحالة: {visit.status}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0'
                  }}>
                    {visit.rating || 'لا يوجد تقييم'}
                  </span>
                </div>

                {/* Direct Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  borderTop: '1px solid #f1f5f9', 
                  paddingTop: '8px', 
                  justifyContent: 'flex-end' 
                }}>
                  {visit.responsiblePhone && (
                    <a
                      href={`tel:${visit.responsiblePhone}`}
                      style={{
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={12} />
                      <span>اتصال</span>
                    </a>
                  )}

                  {visit.arrivalGPS && visit.arrivalGPS.lat && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${visit.arrivalGPS.lat},${visit.arrivalGPS.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1e40af',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      <MapPin size={12} />
                      <span>خريطة</span>
                    </a>
                  )}

                  <button 
                    onClick={() => setSelectedVisit(visit)}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={12} />
                    <span>التفاصيل</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Bottom Sheet Details modal */}
      <AnimatePresence>
        {selectedVisit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: isMobile ? 'flex-end' : 'center',
              alignItems: isMobile ? 'flex-end' : 'center',
              padding: isMobile ? '0' : '16px'
            }}
            onClick={() => setSelectedVisit(null)}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
              animate={isMobile ? { y: 0 } : { scale: 1, y: 0 }}
              exit={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                backgroundColor: '#fff',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                width: '100%',
                maxWidth: isMobile ? '100%' : '440px',
                maxHeight: isMobile ? '88vh' : '85vh',
                overflowY: 'auto',
                padding: '24px',
                position: 'relative',
                boxShadow: '0 -8px 30px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Swipe down line helper on mobile */}
              {isMobile && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', marginTop: '-8px' }}>
                  <div 
                    style={{ width: '40px', height: '5px', borderRadius: '3px', backgroundColor: '#e2e8f0', cursor: 'pointer' }} 
                    onClick={() => setSelectedVisit(null)} 
                  />
                </div>
              )}

              <button 
                onClick={() => setSelectedVisit(null)}
                style={{ position: 'absolute', top: '16px', left: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>

              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px', paddingLeft: '32px' }}>
                معاينة الزيارة الميدانية
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>العميل والمسؤول</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 'bold' }}>{selectedVisit.customerName}</div>
                    {selectedVisit.responsibleName && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        اللقاء مع: {selectedVisit.responsibleName} {selectedVisit.responsiblePhone ? `(${selectedVisit.responsiblePhone})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>تاريخ الزيارة</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#1a8d9b" /> {selectedVisit.date}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>مدة الزيارة</div>
                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#1a8d9b" /> {selectedVisit.duration} دقيقة
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>نوع الزيارة</div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: selectedVisit.visitType === 'first_visit' ? '#ecfdf5' : '#eff6ff',
                      color: selectedVisit.visitType === 'first_visit' ? '#059669' : '#2563eb',
                      display: 'inline-block'
                    }}>
                      {selectedVisit.visitTypeLabel || (selectedVisit.visitType === 'first_visit' ? 'أول زيارة' : 'متابعة')}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>التقييم</div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      display: 'inline-block'
                    }}>
                      {selectedVisit.rating || 'لا يوجد'}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>الإجراء المطلوب</div>
                  <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> {selectedVisit.action}
                  </div>
                </div>

                {selectedVisit.followUpDate && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>الموعد القادم (متابعة)</div>
                    <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> {selectedVisit.followUpDate}
                    </div>
                  </div>
                )}

                {selectedVisit.failedReason && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 'bold', marginBottom: '4px' }}>سبب عدم إتمام الزيارة</div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>{selectedVisit.failedReason}</div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>ملخص الزيارة</div>
                  <div style={{ 
                    fontSize: '13px', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid #e2e8f0' 
                  }}>
                    {selectedVisit.summary || 'لا يوجد ملخص'}
                  </div>
                </div>

                {selectedVisit.samplesData && (selectedVisit.samplesData.notes || selectedVisit.samplesData.type) && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>تفاصيل العينات</div>
                    <div style={{ 
                      fontSize: '13px', color: '#475569', backgroundColor: '#fdf4ff', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid #fce7f3' 
                    }}>
                      {selectedVisit.samplesData.type && (
                        <div style={{ marginBottom: '6px' }}><strong>النوع والكمية:</strong> {selectedVisit.samplesData.type} {selectedVisit.samplesData.qty ? `(${selectedVisit.samplesData.qty})` : ''}</div>
                      )}
                      {selectedVisit.samplesData.notes && (
                        <div><strong>ملاحظات التسليم:</strong> {selectedVisit.samplesData.notes}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Direct quick action buttons inside details */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginTop: '8px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '16px'
                }}>
                  {selectedVisit.responsiblePhone && (
                    <a
                      href={`tel:${selectedVisit.responsiblePhone}`}
                      style={{
                        flex: 1,
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        padding: '10px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={16} />
                      <span>اتصال هاتفي</span>
                    </a>
                  )}

                  {selectedVisit.arrivalGPS && selectedVisit.arrivalGPS.lat && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedVisit.arrivalGPS.lat},${selectedVisit.arrivalGPS.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1e40af',
                        padding: '10px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <MapPin size={16} />
                      <span>خرائط جوجل</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
