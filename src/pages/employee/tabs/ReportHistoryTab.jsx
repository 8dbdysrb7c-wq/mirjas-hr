import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Eye } from 'lucide-react';
import { GlassCard, TableContainer, TableHead, TableRow, TableHeader, TableBody, TableCell } from '../../../components/ui';

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const ReportHistoryTab = ({ myReports, handleViewReportDetails, isMobile }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredHistory = myReports.filter(r => {
    const matchFrom = dateFrom ? r.date >= dateFrom : true;
    const matchTo = dateTo ? r.date <= dateTo : true;
    return matchFrom && matchTo;
  });

  return (
    <GlassCard style={{ paddingBottom: isMobile ? '100px' : '20px' }}>
      <h3 className="mb-4 pb-2 border-b text-lg">سجل تقاريري</h3>
      <div className="grid grid-cols-1 gap-2 mb-4">
        <Flatpickr className="input-field h-10" value={dateFrom} onChange={([d]) => setDateFrom(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="من تاريخ" />
        <Flatpickr className="input-field h-10" value={dateTo} onChange={([d]) => setDateTo(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="إلى تاريخ" />
      </div>
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
          {filteredHistory.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-bold" dataLabel="التاريخ">{r.date}</TableCell>
              <TableCell dataLabel="المهام">{r.tasks.length}</TableCell>
              <TableCell dataLabel="التقييم">
                <span style={{ fontWeight: 'bold', color: '#000' }}>{Math.round(r.finalScore)}%</span>
              </TableCell>
              <TableCell dataLabel="عرض">
                <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleViewReportDetails(r)}>
                  <Eye size={16} />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableContainer>
    </GlassCard>
  );
};
