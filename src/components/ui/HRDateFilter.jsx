import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';

const MonthPicker = ({ selectedMonth, setSelectedMonth, fieldStyle = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  
  const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    const closeDropdown = (e) => {
      if (isOpen && !e.target.closest('.month-picker-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, [isOpen]);

  const getLabel = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    return `${arabicMonths[parseInt(month, 10) - 1]} ${year}`;
  };

  return (
    <div className="shrink-0 month-picker-container" style={{ position: 'relative', width: fieldStyle ? '100%' : 'auto' }}>
      <div 
        onClick={() => {
          if (selectedMonth) {
             const [year] = selectedMonth.split('-');
             setPickerYear(parseInt(year));
          }
          setIsOpen(!isOpen);
        }}
        className={`flex items-center justify-between gap-3 bg-white border border-slate-200 ${fieldStyle ? 'rounded-[10px] px-3' : 'rounded-full px-5 py-2 shadow-sm min-w-[160px]'} hover:border-sky-300 hover:shadow-md transition-all cursor-pointer`}
        style={{ height: fieldStyle ? '42px' : '44px', width: fieldStyle ? '100%' : 'auto', boxSizing: 'border-box' }}
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-sky-500" />
          <span className="font-bold text-slate-700 whitespace-nowrap text-[14px]">
            {getLabel()}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
      </div>
      
      {isOpen && (
        <div 
          className="month-picker-popup"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 99999,
            overflow: 'hidden'
          }}
        >
          <div className="flex justify-between items-center bg-slate-50/80 backdrop-blur-sm p-4 border-b border-slate-100">
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }}
              disabled={pickerYear >= currentYear}
              className={`p-1.5 rounded-full transition-colors ${pickerYear >= currentYear ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
              title="السنة القادمة"
            >
              <ChevronUp size={18} />
            </button>
            <span className="font-bold text-lg text-slate-800">{pickerYear}</span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }}
              className="p-1.5 hover:bg-slate-200/70 rounded-full transition-colors text-slate-600 hover:text-slate-900"
              title="السنة السابقة"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              padding: '16px'
            }}
          >
            {arabicMonths.map((m, index) => {
              const monthVal = `${pickerYear}-${(index + 1).toString().padStart(2, '0')}`;
              const isSelected = selectedMonth === monthVal;
              const isCurrentMonth = currentYear === pickerYear && currentMonth === (index + 1);
              const isFutureMonth = pickerYear > currentYear || (pickerYear === currentYear && (index + 1) > currentMonth);
              
              return (
                <button
                  key={monthVal}
                  type="button"
                  disabled={isFutureMonth}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isFutureMonth) {
                      setSelectedMonth(monthVal);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected || isCurrentMonth ? 'bold' : 'normal',
                    backgroundColor: isSelected ? '#0284c7' : isCurrentMonth ? '#f0f9ff' : 'transparent',
                    color: isSelected ? 'white' : isFutureMonth ? '#cbd5e1' : isCurrentMonth ? '#0369a1' : '#475569',
                    border: 'none',
                    cursor: isFutureMonth ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    if (!isFutureMonth && !isSelected) {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isFutureMonth && !isSelected) {
                      e.currentTarget.style.backgroundColor = isCurrentMonth ? '#f0f9ff' : 'transparent';
                    }
                  }}
                >
                  {m}
                  {isCurrentMonth && !isSelected && (
                    <span style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#0ea5e9' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const HRDateFilter = ({
  mode,
  setMode,
  date,
  setDate,
  month,
  setMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  allowedModes = ['day', 'month', 'range'],
  monthPickerVariant = 'default'
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="hr-date-filter-container" style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      flexShrink: 0,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      width: isMobile || monthPickerVariant === 'field' ? '100%' : 'auto'
    }}>
      {/* 1. Date Mode Switcher */}
      {allowedModes.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          {allowedModes.includes('day') && (
            <button
              type="button"
              onClick={() => setMode('day')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mode === 'day' ? '#e0f2fe' : 'transparent',
                color: mode === 'day' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              يومي
            </button>
          )}
          {allowedModes.includes('month') && (
            <button
              type="button"
              onClick={() => setMode('month')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mode === 'month' ? '#e0f2fe' : 'transparent',
                color: mode === 'month' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              شهري
            </button>
          )}
          {allowedModes.includes('range') && (
            <button
              type="button"
              onClick={() => setMode('range')}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mode === 'range' ? '#e0f2fe' : 'transparent',
                color: mode === 'range' ? '#0284c7' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              فترة
            </button>
          )}
        </div>
      )}

      {/* 2. Month/Date Picker */}
      {mode === 'month' && (
        <MonthPicker selectedMonth={month} setSelectedMonth={setMonth} fieldStyle={monthPickerVariant === 'field'} />
      )}
      {mode === 'day' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 14px', height: '42px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'all 0.2s', cursor: 'pointer' }} className="hover:border-sky-300 hover:shadow-md">
          <Calendar size={18} style={{ color: '#0ea5e9', flexShrink: 0 }} />
          <Flatpickr 
            value={date}
            onChange={(dates, dateStr) => setDate(dateStr)}
            options={{ dateFormat: 'Y-m-d', locale: Arabic }}
            placeholder="اختر التاريخ"
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', fontWeight: 'bold', color: '#334155', backgroundColor: 'transparent', cursor: 'pointer' }}
          />
          <ChevronDown size={16} style={{ color: '#94a3b8' }} />
        </div>
      )}
      {mode === 'range' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', height: '42px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'all 0.2s' }} className="hover:border-sky-300 hover:shadow-md">
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>من:</span>
            <Flatpickr 
              value={startDate}
              onChange={(dates, dateStr) => setStartDate(dateStr)}
              options={{ dateFormat: 'Y-m-d', locale: Arabic }}
              placeholder="اختر تاريخ"
              style={{ width: '90px', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '13px', color: '#1e293b', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}
            />
            <Calendar size={14} style={{ color: '#0ea5e9' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', height: '42px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', transition: 'all 0.2s' }} className="hover:border-sky-300 hover:shadow-md">
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>إلى:</span>
            <Flatpickr 
              value={endDate}
              onChange={(dates, dateStr) => setEndDate(dateStr)}
              options={{ dateFormat: 'Y-m-d', locale: Arabic }}
              placeholder="اختر تاريخ"
              style={{ width: '90px', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '13px', color: '#1e293b', backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}
            />
            <Calendar size={14} style={{ color: '#0ea5e9' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDateFilter;
