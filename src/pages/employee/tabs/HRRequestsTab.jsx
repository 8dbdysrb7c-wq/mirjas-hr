import PetitionConversation from '../../../components/PetitionConversation';
import { petitionStatus } from '../../../utils/petitionConversation';
import { watchPetitions } from '../../../services/petitionConversation';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, Eye, Edit2, Trash2, X } from 'lucide-react';
import { TableContainer, TableHead, TableRow, TableHeader, TableBody, TableCell, Badge } from '../../../components/ui';
import HRDateFilter from '../../../components/ui/HRDateFilter';

export const HRRequestsTab = ({ 
  user, 
  myLeaves, 
  missingPunches, 
  myReports, 
  myAdvances,
  myPetitions,
  handleViewReportDetails, 
  handleEditRequest, 
  handleDeleteRequest 
}) => {
  const [conversationId, setConversationId] = useState(null);
  const [livePetitions, setLivePetitions] = useState(null);
  useEffect(() => watchPetitions(user, false, setLivePetitions, console.error), [user.id]);
  const [dateMode, setDateMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [reqFilterType, setReqFilterType] = useState('');
  const [reqFilterStatus, setReqFilterStatus] = useState('');

  const normalizeReqStatus = (s) => {
    if (!s) return 'معلق';
    if (s === 'موافق عليه' || s === 'مقبول' || s === 'تم التسليم' || s === 'موافق' || s === 'تمت الموافقة') return 'تمت الموافقة';
    if (s === 'مرفوض') return 'مرفوض';
    return 'معلق';
  };

  const cleanNotes = (notes) => {
    if (!notes) return '';
    let res = notes;
    const separators = ['-- تفاصيل الاحتساب الذكي', '-- تفاصيل الاحتساب', '\n(ملاحظات الإدارة', '\n(سبب الرفض'];
    for (const sep of separators) {
      if (res.includes(sep)) {
        res = res.split(sep)[0];
      }
    }
    return res.trim();
  };

  const getAdminNoteOnly = (notes) => {
    if (!notes) return '';
    const match = notes.match(/\((?:سبب الرفض|ملاحظات الإدارة):\s*([^\)]+)\)/);
    return match ? match[1].trim() : '';
  };

  const allRequests = [
    ...myLeaves.filter(l => l.status !== 'محذوف' && l.status !== 'deleted').map(l => ({ id: l.id, type: l.type, date: l.startDate || l.date || l.createdAt?.split('T')[0], status: normalizeReqStatus(l.status), details: l.notes ? `السبب: ${cleanNotes(l.notes)}` : '', adminNote: getAdminNoteOnly(l.notes), originalReq: l, modelType: 'leave' })),
    ...missingPunches.filter(p => String(p.employeeId) === String(user.id) && p.status !== 'محذوف' && p.status !== 'deleted').map(p => ({ id: p.id, type: `ختمة ناقصة (${p.type})`, date: p.date || p.createdAt?.split('T')[0], status: normalizeReqStatus(p.status), details: p.reason || p.time || '', adminNote: p.adminNote || '', originalReq: p, modelType: 'punch' })),
    ...myReports.filter(r => r.status !== 'محذوف' && r.status !== 'deleted').map(r => ({ id: r.id, type: 'تقرير عمل يومي', date: r.date || r.createdAt?.split('T')[0], status: r.supervisorRating ? 'تم التقييم' : 'معلق', details: r.supervisorRating ? `تقييم المشرف: ${r.supervisorRating} (${Math.round(r.finalScore || 0)}%)` : 'معلق (بانتظار المشرف)', adminNote: r.supervisorNotes || '', originalReq: r, modelType: 'report' })),
    ...myAdvances.filter(a => a.status !== 'محذوف' && a.status !== 'deleted').map(a => ({ id: a.id, type: a.type, date: a.date || a.createdAt?.split('T')[0], status: normalizeReqStatus(a.status), details: a.reason ? `${a.amount} د.أ - ${a.reason}` : `${a.amount} د.أ`, adminNote: a.status === 'مرفوض' ? (a.rejectionReason || '') : (a.approvalReason || ''), originalReq: a, modelType: 'advance' })),
    ...(livePetitions || myPetitions || []).filter(p => p.status !== 'محذوف' && p.status !== 'deleted').map(p => ({ id: p.id, type: 'طلب استدعاء', date: p.date || p.createdAt?.split('T')[0], status: petitionStatus(p), details: p.title ? `${p.title}` : '', adminNote: p.status === 'مرفوض' ? (p.rejectionReason || '') : (p.approvalReason || ''), originalReq: p, modelType: 'petition' }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredRequests = allRequests.filter(req => {
    let matchDate = true;
    const reqDate = req.date || '';
    if (reqDate) {
      const pMonth = reqDate.substring(0, 7);
      if (dateMode === 'day' && reqDate !== selectedDate) matchDate = false;
      if (dateMode === 'month' && pMonth !== selectedMonth) matchDate = false;
      if (dateMode === 'range' && (reqDate < startDate || reqDate > endDate)) matchDate = false;
    } else {
      matchDate = false;
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
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200" style={{ direction: 'rtl' }}>
        <div className="w-full md:w-auto overflow-x-auto pb-1">
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

        <div className="flex flex-wrap md:flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <select className="input-field shrink-0" style={{ minWidth: '130px', height: '42px', flex: 1, padding: '0 8px' }} value={reqFilterType} onChange={(e) => setReqFilterType(e.target.value)}>
            <option value="">جميع الأنواع</option>
            <option value="إجازة">إجازة</option>
            <option value="عمل إضافي">عمل إضافي</option>
            <option value="مغادرة">مغادرة</option>
            <option value="تقرير عمل يومي">تقرير عمل يومي</option>
            <option value="سلفة">سلفة</option>
            <option value="ختمة ناقصة">ختمة ناقصة</option>
            <option value="طلب استدعاء">طلب استدعاء</option>
          </select>

          <select className="input-field shrink-0" style={{ minWidth: '130px', height: '42px', flex: 1, padding: '0 8px' }} value={reqFilterStatus} onChange={(e) => setReqFilterStatus(e.target.value)}>
            <option value="">جميع الحالات</option>
            <option value="تمت الموافقة">تمت الموافقة</option>
            <option value="مرفوض">مرفوض</option>
            <option value="جديد">استدعاء جديد</option><option value="بانتظار الإدارة">بانتظار الإدارة</option><option value="بانتظار الموظف">بانتظار الموظف</option><option value="مغلق">مغلق</option><option value="معلق">معلق</option>
          </select>

          {(reqFilterType || reqFilterStatus || dateMode !== 'month' || selectedMonth !== new Date().toISOString().substring(0, 7)) && (
            <button 
              onClick={() => {
                setDateMode('month');
                setSelectedMonth(new Date().toISOString().substring(0, 7));
                setReqFilterStatus('');
                setReqFilterType('');
              }}
              className="btn flex items-center justify-center bg-red-50 text-red-500 rounded-lg border border-red-100 hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm"
              style={{ height: '42px', padding: '0 16px', minWidth: '42px' }}
              title="إعادة ضبط"
            >
              <X size={20} /> <span className="md:hidden mr-2">إعادة ضبط</span>
            </button>
          )}
        </div>
      </div>
      
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
                    <TableCell className="px-4 py-3 text-slate-500" style={{ maxWidth: '250px' }}>
                      <div className="font-medium text-slate-700">{req.details}</div>
                      {req.adminNote && (
                        <div 
                          className={`text-xs mt-1.5 p-2 rounded-lg border ${
                            req.status === 'تمت الموافقة' || req.status === 'تم التقييم'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                              : 'bg-red-50 text-red-800 border-red-100'
                          }`}
                          style={{ direction: 'rtl', textAlign: 'right', whiteSpace: 'normal', wordBreak: 'break-word', display: 'inline-block', minWidth: '100%' }}
                        >
                          <span className="font-bold">{req.status === 'تمت الموافقة' || req.status === 'تم التقييم' ? 'ملاحظة الإدارة: ' : 'سبب الرفض: '}</span>
                          {req.adminNote}
                        </div>
                      )}
                    </TableCell>
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
                        {req.modelType === 'petition' && <button className="btn btn-primary" onClick={() => setConversationId(req.id)}>المحادثة{req.originalReq.lastMessageRole === 'admin' && req.originalReq.messages?.at(-1)?.id !== req.originalReq.readBy?.[String(user.id)] ? ' · رد جديد' : ''}</button>}
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
                        {req.status === 'معلق' && req.modelType !== 'petition' ? (
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
      {conversationId && <PetitionConversation petitionId={conversationId} user={user} onClose={() => setConversationId(null)} />}
    </motion.div>
  );
};
