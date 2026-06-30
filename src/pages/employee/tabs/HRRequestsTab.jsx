import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import { FileText, RefreshCw, Eye, Edit2, Trash2 } from 'lucide-react';
import { TableContainer, TableHead, TableRow, TableHeader, TableBody, TableCell, Badge } from '../../../components/ui';

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const HRRequestsTab = ({ 
  user, 
  myLeaves, 
  missingPunches, 
  myReports, 
  myAdvances, 
  handleViewReportDetails, 
  handleEditRequest, 
  handleDeleteRequest 
}) => {
  const [showReqFilters, setShowReqFilters] = useState(false);
  const [reqFilterDateFrom, setReqFilterDateFrom] = useState('');
  const [reqFilterDateTo, setReqFilterDateTo] = useState('');
  const [reqFilterType, setReqFilterType] = useState('');
  const [reqFilterStatus, setReqFilterStatus] = useState('');

  const normalizeReqStatus = (s) => {
    if (!s) return 'معلق';
    if (s === 'موافق عليه' || s === 'مقبول' || s === 'تم التسليم' || s === 'موافق' || s === 'تمت الموافقة') return 'تمت الموافقة';
    if (s === 'مرفوض') return 'مرفوض';
    return 'معلق';
  };

  const allRequests = [
    ...myLeaves.map(l => ({ id: l.id, type: l.type, date: l.startDate || l.date || l.createdAt?.split('T')[0], status: normalizeReqStatus(l.status), details: l.notes ? `السبب: ${l.notes}` : '', originalReq: l, modelType: 'leave' })),
    ...missingPunches.filter(p => String(p.employeeId) === String(user.id)).map(p => ({ id: p.id, type: `ختمة ناقصة (${p.type})`, date: p.date || p.createdAt?.split('T')[0], status: normalizeReqStatus(p.status), details: p.reason || p.time || '', originalReq: p, modelType: 'punch' })),
    ...myReports.map(r => ({ id: r.id, type: 'تقرير عمل يومي', date: r.date || r.createdAt?.split('T')[0], status: r.supervisorRating ? 'تم التقييم' : 'معلق', details: r.supervisorRating ? `تقييم المشرف: ${r.supervisorRating} (${Math.round(r.finalScore || 0)}%)` : 'معلق (بانتظار المشرف)', originalReq: r, modelType: 'report' })),
    ...myAdvances.map(a => ({ id: a.id, type: a.type, date: a.date || a.createdAt?.split('T')[0], status: normalizeReqStatus(a.status), details: a.reason ? `${a.amount} د.أ - ${a.reason}` : `${a.amount} د.أ`, originalReq: a, modelType: 'advance' }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredRequests = allRequests.filter(req => {
    let matchDate = true;
    if (reqFilterDateFrom) {
      matchDate = matchDate && (req.date >= reqFilterDateFrom);
    }
    if (reqFilterDateTo) {
      matchDate = matchDate && (req.date <= reqFilterDateTo);
    }
    let matchStatus = true;
    if (reqFilterStatus) {
      matchStatus = (req.status === reqFilterStatus);
    }
    let matchType = true;
    if (reqFilterType) {
      matchType = req.type.includes(reqFilterType) || req.type === reqFilterType;
    }
    return matchDate && matchStatus && matchType;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <FileText className="text-primary" /> سجل الطلبات المقدمة
        </h3>
        <button 
          onClick={() => setShowReqFilters(!showReqFilters)} 
          className={`btn flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md ${showReqFilters ? 'btn-primary' : 'btn-primary'}`}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
            color: 'white',
            backgroundColor: 'var(--primary)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span>{showReqFilters ? 'إخفاء التصفية' : 'تصفية'}</span>
        </button>
      </div>

      {showReqFilters && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">من تاريخ</label>
            <Flatpickr className="input-field bg-white" value={reqFilterDateFrom} onChange={([d]) => setReqFilterDateFrom(getLocalDateStr(d))} options={{ locale: Arabic, dateFormat: 'Y-m-d', disableMobile: true }} placeholder="اختر تاريخ البداية" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">إلى تاريخ</label>
            <Flatpickr className="input-field bg-white" value={reqFilterDateTo} onChange={([d]) => setReqFilterDateTo(getLocalDateStr(d))} options={{ locale: Arabic, dateFormat: 'Y-m-d', disableMobile: true }} placeholder="اختر تاريخ النهاية" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">نوع الطلب</label>
            <select className="input-field" value={reqFilterType} onChange={(e) => setReqFilterType(e.target.value)}>
              <option value="">الكل</option>
              <option value="إجازة">إجازة</option>
              <option value="عمل إضافي">عمل إضافي</option>
              <option value="مغادرة">مغادرة</option>
              <option value="تقرير عمل يومي">تقرير عمل يومي</option>
              <option value="سلفة">سلفة</option>
              <option value="ختمة ناقصة">ختمة ناقصة</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-600">الحالة</label>
            <select className="input-field" value={reqFilterStatus} onChange={(e) => setReqFilterStatus(e.target.value)}>
              <option value="">الكل</option>
              <option value="تمت الموافقة">تمت الموافقة</option>
              <option value="مرفوض">مرفوض</option>
              <option value="معلق">معلق</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-center mt-4 w-full">
            <button 
              onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 3);
                setReqFilterDateFrom(getLocalDateStr(d));
                setReqFilterDateTo('');
                setReqFilterStatus('');
                setReqFilterType('');
              }}
              className="btn btn-sm btn-primary flex items-center gap-2 justify-center shadow-md px-6"
            >
              <RefreshCw size={16} /> إعادة ضبط الفلاتر
            </button>
          </div>
        </div>
      )}
      
      <TableContainer className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <TableHead>
              <TableRow>
                <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">نوع الطلب</TableHeader>
                <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">التاريخ</TableHeader>
                <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300">التفاصيل</TableHeader>
                <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الحالة</TableHeader>
                <TableHeader className="px-4 py-4 font-bold border-b-2 border-slate-300 text-center">الإجراءات</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="5" className="px-4 py-8 text-center text-slate-500">لا توجد طلبات سابقة مطابقة للبحث</TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req, idx) => (
                  <TableRow key={req.id || idx} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-4 py-3 font-bold text-slate-800">{req.type}</TableCell>
                    <TableCell className="px-4 py-3 text-slate-600 font-medium" dir="ltr" style={{ textAlign: 'right' }}>{req.date}</TableCell>
                    <TableCell className="px-4 py-3 text-slate-500 max-w-[150px] truncate" title={req.details}>{req.details}</TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge variant={
                        req.status === 'تمت الموافقة' ? 'success' :
                        req.status === 'مرفوض' ? 'danger' :
                        'warning'
                      }>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {req.modelType === 'report' && (
                          <button 
                            onClick={() => handleViewReportDetails(req.originalReq)} 
                            className="icon-btn"
                            style={{ borderColor: '#bae6fd', color: '#0ea5e9', backgroundColor: '#f0f9ff' }}
                            title="معاينة"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        {req.status === 'معلق' ? (
                          <>
                            <button 
                              onClick={() => handleEditRequest(req)} 
                              className="icon-btn"
                              style={{ borderColor: '#fed7aa', color: '#f97316', backgroundColor: '#ffffff' }}
                              title="تعديل"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteRequest(req)} 
                              className="icon-btn"
                              style={{ borderColor: '#fecaca', color: '#ef4444', backgroundColor: '#ffffff' }}
                              title="حذف"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          req.modelType !== 'report' && <span className="text-slate-400 text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </TableContainer>
    </motion.div>
  );
};
