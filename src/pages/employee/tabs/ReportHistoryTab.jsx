import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Eye, Calendar, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import { GlassCard, TableContainer, TableHead, TableRow, TableHeader, TableBody, TableCell } from '../../../components/ui';

import { getReportsForUserByDateRange } from '../../../store';

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const ReportHistoryTab = ({ user, myReports: initialReports, handleViewReportDetails, isMobile }) => {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'range'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [localReports, setLocalReports] = useState(initialReports || []);
  const [isLoading, setIsLoading] = useState(false);

  // Extract all unique months available in reports
  const availableMonths = useMemo(() => {
    const set = new Set([currentMonthStr]);
    // Add months from last 12 months for quick selection
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      set.add(d.toISOString().substring(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [currentMonthStr]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user || !user.id) return;
      setIsLoading(true);
      let from = '';
      let to = '';
      if (viewMode === 'month') {
        from = `${selectedMonth}-01`;
        const nextMonth = new Date(`${selectedMonth}-01`);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(0);
        to = nextMonth.toISOString().substring(0, 10);
      } else {
        from = dateFrom;
        to = dateTo;
      }
      const data = await getReportsForUserByDateRange(user.id, user.employeeId, from, to);
      setLocalReports(data);
      setIsLoading(false);
    };
    
    // Only fetch if a valid range or month is selected
    if (viewMode === 'month' || (viewMode === 'range' && dateFrom && dateTo)) {
      fetchHistory();
    }
  }, [selectedMonth, viewMode, dateFrom, dateTo, user]);

  const filteredHistory = useMemo(() => {
    return (localReports || []).filter(r => {
      if (viewMode === 'month') {
        return r.date && r.date.startsWith(selectedMonth);
      }
      const matchFrom = dateFrom ? r.date >= dateFrom : true;
      const matchTo = dateTo ? r.date <= dateTo : true;
      return matchFrom && matchTo;
    });
  }, [localReports, viewMode, selectedMonth, dateFrom, dateTo]);

  return (
    <GlassCard style={{ paddingBottom: isMobile ? '100px' : '20px' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b">
        <div>
          <h3 className="text-lg font-bold text-slate-800 m-0">سجل تقاريري اليومية</h3>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'month' ? `عرض تقارير شهر: ${selectedMonth}` : 'عرض حسب الفترة المحددة'}
            <span className="mr-2 inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              {filteredHistory.length} تقرير
            </span>
          </p>
        </div>

        {/* View Mode & Month Switcher Controls */}
        <div className="flex items-center gap-2">
          {viewMode === 'month' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <Calendar size={15} className="text-teal-700 ml-1" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer py-1 px-2"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {m === currentMonthStr ? `${m} (الشهر الحالي)` : m}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            onClick={() => setViewMode(prev => prev === 'month' ? 'range' : 'month')}
            className="btn btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1"
            title={viewMode === 'month' ? 'تحديد فترة مخصصة بالتواريخ' : 'الرجوع لاختيار الشهر'}
          >
            <Filter size={13} />
            <span>{viewMode === 'month' ? 'فترة مخصصة' : 'عرض بالشهر'}</span>
          </button>
        </div>
      </div>

      {viewMode === 'range' && (
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">من تاريخ:</label>
            <Flatpickr
              className="input-field h-10 text-sm"
              value={dateFrom}
              onChange={([d]) => setDateFrom(getLocalDateStr(d))}
              options={{ dateFormat: 'Y-m-d', disableMobile: true }}
              placeholder="اختر التاريخ"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">إلى تاريخ:</label>
            <Flatpickr
              className="input-field h-10 text-sm"
              value={dateTo}
              onChange={([d]) => setDateTo(getLocalDateStr(d))}
              options={{ dateFormat: 'Y-m-d', disableMobile: true }}
              placeholder="اختر التاريخ"
            />
          </div>
        </div>
      )}

      <TableContainer>
        <TableHead>
          <TableRow>
            <TableHeader>التاريخ</TableHeader>
            <TableHeader>المهام</TableHeader>
            <TableHeader>التقييم</TableHeader>
            <TableHeader>عرض</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                جاري التحميل...
              </TableCell>
            </TableRow>
          ) : filteredHistory.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                لا توجد تقارير مسجلة في هذا الشهر.
              </TableCell>
            </TableRow>
          ) : (
            filteredHistory.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-bold" dataLabel="التاريخ">{r.date}</TableCell>
                <TableCell dataLabel="المهام">{(r.tasks || []).length}</TableCell>
                <TableCell dataLabel="التقييم">
                  <span style={{ fontWeight: 'bold', color: '#000' }}>
                    {r.finalScore !== undefined ? `${Math.round(r.finalScore)}%` : '---'}
                  </span>
                </TableCell>
                <TableCell dataLabel="عرض">
                  <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleViewReportDetails(r)}>
                    <Eye size={16} />
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableContainer>
    </GlassCard>
  );
};
