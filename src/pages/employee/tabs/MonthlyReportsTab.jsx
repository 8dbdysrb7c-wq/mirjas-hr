import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, FileText, 
  Award, MessageSquare, ChevronRight, ChevronLeft, 
  HelpCircle, Check, X, ShieldAlert,
  CalendarCheck, Eye, Sparkles, Star, History
} from 'lucide-react';
import { db } from '../../../firebase';
import { getTimedLeaveMinutes, timeToMinutes } from '../../../utils/attendancePolicy';
import './MonthlyReportsTab.css';

const approved = new Set(['موافق', 'موافق عليه', 'مقبول', 'تمت الموافقة', 'تم التسليم']);
const rejected = new Set(['مرفوض', 'مرفوضة', 'تم الرفض', 'غير موافق']);
const overtimeTypes = new Set(['بدل عمل إضافي', 'عمل إضافي']);

const localDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

const minutesLabel = minutes => Math.round(Number(minutes) || 0).toLocaleString('en-US');

const timeLabel = value => {
  const minutes = timeToMinutes(value);
  if (minutes == null) return 'غير مسجل';
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'م' : 'ص'}`;
};

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const getDayName = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return ARABIC_DAYS[dateObj.getDay()] || '';
};

const getRejectionReason = (request) => {
  if (request?.rejectionReason && String(request.rejectionReason).trim()) {
    return String(request.rejectionReason).trim();
  }
  if (request?.rejectReason && String(request.rejectReason).trim()) {
    return String(request.rejectReason).trim();
  }
  const notes = String(request?.notes || '').trim();
  if (notes) {
    const match1 = notes.match(/\(سبب الرفض:\s*([^\)]+)\)/i);
    if (match1 && match1[1]?.trim()) return match1[1].trim();

    const match2 = notes.match(/سبب الرفض[:\s]+([^\n\r]+)/i);
    if (match2 && match2[1]?.trim()) return match2[1].trim();
  }
  return '';
};

const renderOvertimeStatus = (request) => {
  const status = String(request?.status || '').trim();
  if (approved.has(status)) {
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', color: '#15803d', backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '16px', fontWeight: 800, fontSize: '11px', lineHeight: 1.2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Check size={12} /> نعم</span>
        <span dir="ltr" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span>د</span>
          <span>{minutesLabel(Number(request.rateDetails?.extraMins ?? getTimedLeaveMinutes(request)) || 0)}</span>
        </span>
      </span>
    );
  }

  if (rejected.has(status)) {
    const reason = getRejectionReason(request);
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px', maxWidth: '100%' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '9999px', fontWeight: 800, fontSize: '11px' }}>
          <X size={12} /> لا
        </span>
        {reason ? (
          <span
            style={{
              fontSize: '10px',
              color: '#991b1b',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '1px 5px',
              borderRadius: '6px',
              maxWidth: '140px',
              wordBreak: 'break-word',
              lineHeight: 1.2
            }}
            title={reason}
          >
            {reason}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <span style={{ display: 'inline-block', color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700, fontSize: '10.5px' }}>
      بانتظار الموافقة
    </span>
  );
};

export const MonthlyReportsTab = ({ user, handleViewReportDetails, isMobile = false }) => {
  const [today, setToday] = useState(localDate);
  const currentMonthStr = useMemo(() => localDate().slice(0, 7), []);
  const selectedMonth = currentMonthStr;
  const userId = user?.id || '';
  const employeeId = user?.employeeId || '';

  const [sources, setSources] = useState({});
  const [supervisorReports, setSupervisorReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSources({});
    setLoading(true);
    setError(false);

    const ids = [...new Set([user?.id, user?.employeeId].filter(Boolean).map(String))];
    const requests = ids.flatMap(id => [
      ['hr_attendance', 'employeeId', id],
      ['hr_attendance', 'userId', id],
      ['attendance_logs', 'employeeId', id],
      ['attendance_logs', 'userId', id],
      ['hr_leaves', 'employeeId', id],
      ['hr_leaves', 'userId', id],
      ['reports', 'userId', id],
      ['reports', 'employeeId', id]
    ]);

    let live = true;
    const finished = new Set();
    const complete = key => {
      finished.add(key);
      if (finished.size >= requests.length) setLoading(false);
    };

    if (!requests.length) {
      setLoading(false);
      return;
    }

    const unsubscribes = requests.map(([name, field, id], index) =>
      onSnapshot(
        query(collection(db, name), where(field, '==', id)),
        snapshot => {
          if (!live) return;
          const records = snapshot.docs
            .map(record => ({ ...record.data(), id: record.id, source: name }))
            .filter(record => !['محذوف', 'deleted'].includes(record.status))
            .filter(record => {
              if (name === 'hr_leaves') {
                return (
                  record.date?.startsWith(selectedMonth) ||
                  (record.startDate &&
                    record.startDate <= `${selectedMonth}-31` &&
                    (record.endDate || record.startDate) >= `${selectedMonth}-01`)
                );
              }
              return record.date?.startsWith(selectedMonth);
            });
          setSources(previous => ({ ...previous, [index]: records }));
          complete(index);
        },
        failure => {
          if (!live) return;
          console.error(`Personal monthly report subscription failed for ${name}:`, failure);
          setError(true);
          complete(index);
        }
      )
    );

    // Also listen to supervisor_reports for that month to capture evaluations
    const supQ = query(
      collection(db, 'supervisor_reports'),
      where('date', '>=', `${selectedMonth}-01`),
      where('date', '<=', `${selectedMonth}-31`)
    );
    const supUnsub = onSnapshot(
      supQ,
      snap => {
        if (!live) return;
        setSupervisorReports(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      },
      err => {
        console.error('Failed to load supervisor_reports for employee month:', err);
      }
    );

    return () => {
      live = false;
      unsubscribes.forEach(stop => stop());
      supUnsub();
    };
  }, [userId, employeeId, selectedMonth]);

  // Aggregate loaded records
  const allRecords = useMemo(() => {
    return [
      ...new Map(
        Object.values(sources)
          .flat()
          .map(record => [`${record.source}/${record.id}`, record])
      ).values()
    ];
  }, [sources]);

  const leaves = useMemo(() => allRecords.filter(r => r.source === 'hr_leaves'), [allRecords]);
  const attends = useMemo(() => allRecords.filter(r => r.source === 'hr_attendance' || r.source === 'attendance_logs'), [allRecords]);
  const dailyReports = useMemo(() => allRecords.filter(r => r.source === 'reports'), [allRecords]);

  const covers = (request, date) =>
    request.date
      ? request.date === date
      : request.startDate && request.startDate <= date && (request.endDate || request.startDate) >= date;

  // Generate days array for the selected month
  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => `${selectedMonth}-${String(index + 1).padStart(2, '0')}`);
  }, [selectedMonth]);

  // Shift start time for user (default '08:00')
  const userShiftStart = user?.shiftStart || '08:00';
  const shiftStartMinutes = timeToMinutes(userShiftStart) || 480;

  const isManagementOrSupervisor = useMemo(() => {
    const rawRole = String(user?.role || '').toLowerCase();
    const rawLevel = String(user?.level || '').toLowerCase();
    const rawType = String(user?.userType || '').toLowerCase();
    const name = String(user?.name || '').toLowerCase();

    const isAdmin =
      rawRole === 'admin' ||
      rawLevel === 'admin' ||
      rawLevel === 'إدارة' ||
      rawRole === 'إدارة' ||
      rawRole === 'management' ||
      rawLevel === 'management' ||
      user?.id === 'admin' ||
      name.includes('المدير العام') ||
      name.includes('مشهور') ||
      name.includes('أنس') ||
      name.includes('انس');

    const isSupervisor =
      rawLevel === 'supervisor' ||
      rawLevel === 'مشرف' ||
      rawLevel === 'مشرف قسم' ||
      rawRole === 'supervisor' ||
      rawRole === 'مشرف' ||
      rawRole === 'مشرف قسم' ||
      rawType === 'مشرف قسم' ||
      rawType === 'مشرف' ||
      Boolean(user?.permissions?.isSupervisor) ||
      name.includes('مشرف');

    return isAdmin || isSupervisor;
  }, [user]);

  // Process day data
  const processedDays = useMemo(() => {
    return daysInMonth.map(date => {
      const dayName = getDayName(date);
      const [y, m, d] = date.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const isFriday = dayOfWeek === 5;
      const isFuture = date > today;
      const isToday = date === today;

      // 1. Attendance punches
      const dayRecords = attends
        .filter(record => record.date === date && !record.isLeave)
        .sort((a, b) =>
          Number(b.source === 'hr_attendance') - Number(a.source === 'hr_attendance') ||
          String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
        );
      const entry = dayRecords.find(record => timeToMinutes(record.timeIn) != null);
      const exit = dayRecords.find(record => timeToMinutes(record.timeOut) != null);
      const hasPunch = Boolean(entry || exit);

      // 2. Leaves & Departures
      const dayLeaves = leaves.filter(request => covers(request, date) && approved.has(request.status) && !overtimeTypes.has(request.type));
      const officialLeaves = dayLeaves.filter(l => String(l.type || '').match(/إجازة|اجازة/));
      const hasLatePermission = dayLeaves.some(l => l.type === 'إذن تأخير' || String(l.type || '').includes('تأخير'));

      // 3. Overtime
      const extras = leaves.filter(request => covers(request, date) && overtimeTypes.has(request.type));
      const approvedExtras = extras.filter(request => approved.has(String(request.status || '').trim()));

      // 4. Lateness evaluation
      let lateStatus = { type: 'none', label: '—', minutes: 0 };
      if (hasPunch && entry && entry.timeIn) {
        let lateMins = 0;
        if (entry.lateMinutes != null && !isNaN(Number(entry.lateMinutes))) {
          lateMins = Math.max(0, Number(entry.lateMinutes));
        } else {
          const inMins = timeToMinutes(entry.timeIn);
          if (inMins != null && inMins > shiftStartMinutes) {
            lateMins = inMins - shiftStartMinutes;
          }
        }

        if (lateMins > 0) {
          if (hasLatePermission) {
            lateStatus = {
              type: 'late_excused',
              label: `متأخر (${lateMins} د - إذن تأخير)`,
              minutes: lateMins,
              hasPermission: true
            };
          } else {
            lateStatus = {
              type: 'late',
              label: `متأخر (${lateMins} دقيقة)`,
              minutes: lateMins,
              hasPermission: false
            };
          }
        } else {
          lateStatus = {
            type: 'on_time',
            label: 'في الوقت المحدد',
            minutes: 0
          };
        }
      } else if (!hasPunch) {
        if (officialLeaves.length > 0) {
          lateStatus = { type: 'leave', label: officialLeaves[0].type, minutes: 0 };
        } else if (isFriday) {
          lateStatus = { type: 'weekend', label: 'عطلة أسبوعية', minutes: 0 };
        } else if (date < today) {
          lateStatus = { type: 'absence', label: 'غياب', minutes: 0 };
        } else {
          lateStatus = { type: 'pending', label: '—', minutes: 0 };
        }
      }

      // 5. Daily Work Report evaluation
      const matchedReports = dailyReports.filter(r => r.date === date);
      const dayReport = matchedReports[0] || null;

      let isReportSubmitted = false;
      if (dayReport) {
        const notesStr = String(dayReport.notes || '');
        const isSupervisorPlaceholder =
          dayReport.finalRating === 'لم يقدم تقرير' ||
          dayReport.supervisorRating === 'لم يقدم تقرير' ||
          notesStr.includes('لعدم تقديمه التقرير اليومي') ||
          notesStr.includes('تم تسجيل الموظف غائبًا من قبل المشرف');

        if (!isSupervisorPlaceholder) {
          isReportSubmitted = true;
        }
      }

      let reportStatus = { status: 'none', label: '—' };
      if (isReportSubmitted) {
        reportStatus = {
          status: 'submitted',
          label: 'نعم',
          report: dayReport
        };
      } else {
        if (isManagementOrSupervisor) {
          reportStatus = { status: 'not_required', label: '—' };
        } else if (isFuture) {
          reportStatus = { status: 'future', label: '—' };
        } else {
          reportStatus = { status: 'missing', label: 'لا' };
        }
      }

      // 6. Supervisor Daily Evaluation
      // Search in dayReport or in supervisor_reports for this date
      let evalRating = dayReport?.supervisorRating || dayReport?.finalRating || null;
      let evalScore = dayReport?.finalScore != null && dayReport.finalScore !== '' ? Number(dayReport.finalScore) : null;
      let evalReason = dayReport?.supervisorReason || dayReport?.supervisorNotes || null;
      let evaluatedBy = dayReport?.evaluatedBy || null;

      // Supplemental search in supervisor_reports for this day
      const supReportForDay = supervisorReports.find(sr => sr.date === date);
      if (supReportForDay && Array.isArray(supReportForDay.employeeEvaluations)) {
        const userIds = [user?.id, user?.employeeId].filter(Boolean).map(String);
        const supEval = supReportForDay.employeeEvaluations.find(e =>
          userIds.includes(String(e.employeeId || '').trim()) ||
          (user?.name && String(e.employeeName || '').trim() === String(user.name).trim())
        );
        if (supEval) {
          if (!evalRating || evalRating === 'بانتظار المشرف') evalRating = supEval.rating;
          if (evalScore == null && supEval.scorePercentage != null) evalScore = Number(supEval.scorePercentage);
          if (!evalReason) evalReason = supEval.reason;
          if (!evaluatedBy) evaluatedBy = supReportForDay.supervisorName;
        }
      }

      // Format strictly as percentage only (e.g. '80%', '100%') without words
      let displayPercentage = null;
      if (evalRating && evalRating !== 'بانتظار المشرف') {
        if (evalScore != null && !isNaN(evalScore)) {
          displayPercentage = `${Math.round(evalScore)}%`;
        } else {
          const numMatch = String(evalRating).match(/\d+/);
          if (numMatch) {
            displayPercentage = `${numMatch[0]}%`;
          } else {
            const r = String(evalRating).trim().toLowerCase();
            if (r.includes('ممتاز')) displayPercentage = '100%';
            else if (r.includes('جيد جدا') || r.includes('جيد جداً')) displayPercentage = '90%';
            else if (r.includes('جيد')) displayPercentage = '80%';
            else if (r.includes('مقبول')) displayPercentage = '65%';
            else if (r.includes('ضعيف') || r.includes('سيء') || r.includes('راسب')) displayPercentage = '50%';
            else displayPercentage = String(evalRating);
          }
        }
      }

      let supervisorEval = { status: 'none', label: '—', scoreText: '—', rating: null, score: null, reason: null, evaluatedBy: null };
      if (evalRating && evalRating !== 'بانتظار المشرف') {
        supervisorEval = {
          status: 'evaluated',
          label: displayPercentage,
          scoreText: displayPercentage,
          rating: evalRating,
          score: evalScore,
          reason: evalReason,
          evaluatedBy
        };
      } else if (isManagementOrSupervisor) {
        supervisorEval = {
          status: 'not_required',
          label: '—',
          scoreText: '—',
          rating: null,
          score: null,
          reason: null,
          evaluatedBy: null
        };
      } else if (isFuture) {
        supervisorEval = {
          status: 'future',
          label: '—',
          scoreText: '—',
          rating: null,
          score: null,
          reason: null,
          evaluatedBy: null
        };
      } else if (isFriday && !hasPunch) {
        // Friday weekend without attendance
        supervisorEval = {
          status: 'weekend',
          label: '—',
          scoreText: '—',
          rating: null,
          score: null,
          reason: null,
          evaluatedBy: null
        };
      } else {
        // Any past or today workday without evaluation is awaiting supervisor's evaluation
        supervisorEval = {
          status: 'pending',
          label: 'معلق',
          scoreText: 'معلق',
          rating: null,
          score: null,
          reason: null,
          evaluatedBy: null
        };
      }

      return {
        date,
        dayName,
        isFriday,
        isFuture,
        isToday,
        hasPunch,
        entry,
        exit,
        dayLeaves,
        extras,
        approvedExtras,
        lateStatus,
        reportStatus,
        dayReport,
        supervisorEval
      };
    });
  }, [daysInMonth, attends, leaves, dailyReports, supervisorReports, shiftStartMinutes, today, user]);

  // Open Details Modal
  const handleOpenDayModal = (day) => {
    setSelectedDayDetails(day);
  };

  const currentMonthLabel = selectedMonth.slice(5) + '-' + selectedMonth.slice(0, 4);

  return (
    <section dir="rtl" className="employee-attendance-report">
      {/* Heading */}
      <div className="attendance-report-heading">
        <h2 className="section-title">تقرير الدوام</h2>
        <span className="attendance-report-month">شهر <bdi dir="ltr">{currentMonthLabel}</bdi></span>
      </div>

      {error && (
        <div role="alert" className="text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 font-bold text-sm">
          تعذر تحميل بعض السجلات. البيانات المعروضة قد تكون غير مكتملة حالياً.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 700 }}>
          جاري تحميل بيانات الدوام والتقييمات لشهر {currentMonthLabel}...
        </div>
      ) : (
        /* Table View (Desktop & Mobile) */
        <div className="attendance-table-card">
          <div className="mobile-table-scroll-hint">
            <span>اسحب الجدول أفقياً لعرض باقي التفاصيل ↔</span>
          </div>
          <div className="attendance-table-container">
            <table className="table monthly-attendance-table modal-table">
              <thead>
                <tr>
                  <th className="th-date" style={{ width: isManagementOrSupervisor ? '20%' : '15%', minWidth: '95px' }}>
                    <div className="th-stacked">
                      <Calendar size={18} />
                      <span>التاريخ</span>
                    </div>
                  </th>
                  <th className="th-norm" style={{ width: isManagementOrSupervisor ? '24%' : '21%', minWidth: '135px' }}>
                    <div className="th-stacked">
                      <Clock size={17} className="th-icon-navy" />
                      <span>أوقات الدوام</span>
                    </div>
                  </th>
                  <th className="th-norm" style={{ width: isManagementOrSupervisor ? '19%' : '16%', minWidth: '90px' }}>
                    <div className="th-stacked">
                      <AlertTriangle size={17} className="th-icon-red" />
                      <span>التأخير</span>
                    </div>
                  </th>
                  <th className="th-norm" style={{ width: isManagementOrSupervisor ? '19%' : '16%', minWidth: '95px' }}>
                    <div className="th-stacked">
                      <FileText size={17} className="th-icon-green" />
                      <span>تقرير العمل اليومي</span>
                    </div>
                  </th>
                  <th className="th-norm" style={{ width: isManagementOrSupervisor ? '18%' : '16%', minWidth: '90px' }}>
                    <div className="th-stacked">
                      <History size={17} className="th-icon-green" />
                      <span>العمل الإضافي</span>
                    </div>
                  </th>
                  {!isManagementOrSupervisor && (
                    <th className="th-norm" style={{ width: '16%', minWidth: '85px' }}>
                      <div className="th-stacked">
                        <Star size={17} className="th-icon-amber" />
                        <span>التقييم</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {processedDays.map(day => {
                  return (
                    <tr
                      key={day.date}
                      className={`${day.isToday ? 'row-today' : ''} ${day.isFriday ? 'row-weekend' : ''}`}
                    >
                      {/* 1. Date & Day */}
                      <td className="td-date">
                        <div className="cell-date-wrap">
                          <span className="cell-day-name">{day.dayName}</span>
                          <span className="cell-date-num">{day.date}</span>
                        </div>
                      </td>

                      {/* 2. Attendance Times */}
                      <td className="td-punches">
                        {day.hasPunch ? (
                          <div className="time-split-wrap" dir="rtl">
                            <div className="time-col">
                              <span className="time-sub">الدخول</span>
                              <span className="time-val">{day.entry ? timeLabel(day.entry.timeIn) : '—'}</span>
                            </div>
                            <div className="time-line"></div>
                            <div className="time-col">
                              <span className="time-sub">الخروج</span>
                              <span className="time-val">{day.exit ? timeLabel(day.exit.timeOut) : '—'}</span>
                            </div>
                          </div>
                        ) : day.dayLeaves.length > 0 ? (
                          <span className="ref-badge-leave">{day.dayLeaves[0].type}</span>
                        ) : day.isFriday ? (
                          <div className="time-split-wrap empty">
                            <div className="time-col"><span className="time-dash">-</span></div>
                            <div className="time-line"></div>
                            <div className="time-col"><span className="time-dash">-</span></div>
                          </div>
                        ) : day.date < today ? (
                          <span className="ref-badge-absence">غياب</span>
                        ) : (
                          <span className="ref-dash">-</span>
                        )}
                      </td>

                      {/* 3. Lateness Status */}
                      <td className="td-late">
                        <div className="cell-center">
                          {day.lateStatus.type === 'on_time' ? (
                            <span className="pill-ref-ontime" title="في الوقت المحدد">
                              <CheckCircle2 size={16} />
                            </span>
                          ) : day.lateStatus.type === 'late' ? (
                            <span className="pill-ref-late" title={`تأخر ${day.lateStatus.minutes} دقيقة عن موعد بدء الدوام (${userShiftStart})`}>
                              <AlertTriangle size={14} />
                              <span>{day.lateStatus.minutes} د</span>
                            </span>
                          ) : day.lateStatus.type === 'late_excused' ? (
                            <span className="pill-ref-late-excused" title="تأخر مع إذن تأخير مسبق">
                              <Clock size={13} />
                              <span>{day.lateStatus.minutes} د</span>
                            </span>
                          ) : day.lateStatus.type === 'weekend' ? (
                            <span className="pill-ref-weekend">
                              <Clock size={12} />
                              <span>عطلة</span>
                            </span>
                          ) : day.lateStatus.type === 'leave' ? (
                            <span className="ref-badge-leave">{day.lateStatus.label}</span>
                          ) : day.lateStatus.type === 'absence' ? (
                            <span className="ref-badge-absence">غياب</span>
                          ) : (
                            <span className="ref-dash">-</span>
                          )}
                        </div>
                      </td>

                      {/* 4. Daily Work Report */}
                      <td className="td-report">
                        <div className="cell-center">
                          {day.reportStatus.status === 'submitted' ? (
                            <button
                              type="button"
                              className="pill-ref-report-yes"
                              onClick={() => handleOpenDayModal(day)}
                              title="تم تقديم التقرير بنجاح - اضغط لعرض المهام"
                            >
                              <span>نعم</span>
                              <FileText size={13} />
                            </button>
                          ) : day.reportStatus.status === 'missing' ? (
                            <span className="pill-ref-report-no" title="لم يتم تقديم تقرير العمل اليومي">
                              <span>لا</span>
                              <FileText size={13} />
                            </span>
                          ) : (
                            <span className="ref-dash">-</span>
                          )}
                        </div>
                      </td>

                      {/* 5. Overtime */}
                      <td className="td-overtime">
                        <div className="cell-center">
                          {day.extras.length > 0 && approved.has(String(day.extras[0]?.status || '').trim()) ? (
                            <div className="pill-ref-overtime-box">
                              <div className="ot-top-row">
                                <span>نعم</span>
                                <CheckCircle2 size={12} />
                              </div>
                              <div className="ot-bot-row">
                                <span>{minutesLabel(Number(day.extras[0].rateDetails?.extraMins ?? getTimedLeaveMinutes(day.extras[0])) || 0)} د</span>
                              </div>
                            </div>
                          ) : day.extras.length > 0 && rejected.has(String(day.extras[0]?.status || '').trim()) ? (
                            <div className="pill-ref-overtime-rejected">
                              <span>لا</span>
                              <X size={12} />
                            </div>
                          ) : (
                            <span className="ref-dash">-</span>
                          )}
                        </div>
                      </td>

                      {/* 6. Employee Evaluation */}
                      {!isManagementOrSupervisor && (
                        <td className="td-eval">
                          <div className="cell-center" style={{ flexDirection: 'column', gap: '3px' }}>
                            {day.supervisorEval.status === 'evaluated' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDayModal(day)}
                                  className="pill-ref-eval-score"
                                  title="اضغط لعرض تفاصيل التقييم وملاحظات المشرف"
                                >
                                  {day.supervisorEval.scoreText}
                                </button>
                                {day.supervisorEval.reason ? (
                                  <button
                                    type="button"
                                    className="sup-note-btn"
                                    onClick={() => handleOpenDayModal(day)}
                                    title={day.supervisorEval.reason}
                                  >
                                    <MessageSquare size={10} />
                                    <span>ملاحظة</span>
                                  </button>
                                ) : null}
                              </div>
                            ) : day.supervisorEval.status === 'pending' ? (
                              <span className="pill-ref-eval-pending" title="تقييم معلق - بانتظار تقييم واعتماد المشرف">
                                معلق
                              </span>
                            ) : (
                              <span className="ref-dash">-</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Day Details Modal */}
      {selectedDayDetails && (
        <div className="day-modal-overlay" onClick={() => setSelectedDayDetails(null)}>
          <div className="day-modal-card" onClick={e => e.stopPropagation()}>
            <div className="day-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} className="text-teal-600" />
                <h3>تفاصيل يوم {selectedDayDetails.dayName} · {selectedDayDetails.date}</h3>
              </div>
              <button
                type="button"
                className="day-modal-close-btn"
                onClick={() => setSelectedDayDetails(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="day-modal-body">
              {/* Attendance & Timing Section */}
              <div className="detail-section-card">
                <div className="detail-section-title">
                  <Clock size={16} className="text-teal-700" />
                  <span>الدوام وسجل البصمة</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-item-label">وقت الدخول</span>
                    <span className="detail-item-val" style={{ color: '#0f766e' }}>
                      {selectedDayDetails.entry ? timeLabel(selectedDayDetails.entry.timeIn) : 'غير مسجل'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item-label">وقت الخروج</span>
                    <span className="detail-item-val">
                      {selectedDayDetails.exit ? timeLabel(selectedDayDetails.exit.timeOut) : 'غير مسجل'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-item-label">حالة التأخير</span>
                    <span
                      className="detail-item-val"
                      style={{
                        color: selectedDayDetails.lateStatus.minutes > 0 ? '#b91c1c' : '#15803d'
                      }}
                    >
                      {selectedDayDetails.lateStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Supervisor Evaluation Section (hidden for supervisors) */}
              {!isManagementOrSupervisor && (
                <div className="detail-section-card eval-highlight">
                  <div className="detail-section-title">
                    <Award size={16} className="text-emerald-700" />
                    <span>التقييم</span>
                  </div>

                  {selectedDayDetails.supervisorEval.status === 'evaluated' ? (
                    <div>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-item-label">النسبة المئوية</span>
                          <span className="detail-item-val" style={{ color: '#047857', fontWeight: 800 }} dir="ltr">
                            {selectedDayDetails.supervisorEval.scoreText}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-item-label">المشرف المقيّم</span>
                          <span className="detail-item-val">
                            {selectedDayDetails.supervisorEval.evaluatedBy || 'المشرف المسؤول'}
                          </span>
                        </div>
                      </div>

                      {selectedDayDetails.supervisorEval.reason ? (
                        <div className="sup-note-box">
                          <strong style={{ color: '#0f766e', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <MessageSquare size={14} /> ملاحظات وتوجيهات المشرف:
                          </strong>
                          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                            {selectedDayDetails.supervisorEval.reason}
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          تم تقييم اليوم بدون ملاحظات إضافية.
                        </p>
                      )}
                    </div>
                  ) : selectedDayDetails.supervisorEval.status === 'pending' ? (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#854d0e', background: '#fef9c3', borderRadius: '12px', fontWeight: 700 }}>
                      ⏳ التقييم معلق (بانتظار اعتماد وتقييم المشرف المسؤول لهذا اليوم).
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                      لا يوجد تقييم مسجل لهذا اليوم.
                    </div>
                  )}
                </div>
              )}

              {/* Daily Work Report Section */}
              <div className="detail-section-card report-highlight">
                <div className="detail-section-title">
                  <FileText size={16} className="text-teal-700" />
                  <span>تقرير العمل اليومي</span>
                </div>

                {selectedDayDetails.reportStatus.status === 'submitted' && selectedDayDetails.dayReport ? (
                  <div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-item-label">حالة التقديم</span>
                        <span className="detail-item-val" style={{ color: '#166534' }}>
                          ✓ تم التقديم
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-item-label">عدد المهام</span>
                        <span className="detail-item-val">
                          {(selectedDayDetails.dayReport.tasks || []).length} مهمة
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-item-label">القسم</span>
                        <span className="detail-item-val">
                          {selectedDayDetails.dayReport.department || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Tasks mini table */}
                    {Array.isArray(selectedDayDetails.dayReport.tasks) && selectedDayDetails.dayReport.tasks.length > 0 && (
                      <div style={{ marginTop: '12px', overflowX: 'auto' }}>
                        <table className="tasks-mini-table">
                          <thead>
                            <tr>
                              <th>الصنف / المهمة</th>
                              <th>العملية</th>
                              <th>العدد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDayDetails.dayReport.tasks.map((task, idx) => (
                              <tr key={idx}>
                                <td>{task.name || task.title || '—'}</td>
                                <td>{task.operation || '—'}</td>
                                <td style={{ fontWeight: 800 }}>{task.count || task.qty || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedDayDetails.dayReport.notes && (
                      <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#475569', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong>ملاحظات الموظف:</strong> {selectedDayDetails.dayReport.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', color: isManagementOrSupervisor ? '#64748b' : '#991b1b', background: isManagementOrSupervisor ? '#f8fafc' : '#fef2f2', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}>
                    {isManagementOrSupervisor
                      ? 'غير مطلوب تقديم تقرير عمل يومي (الكادر الإشرافي والإداري).'
                      : selectedDayDetails.reportStatus.label === '— غير مطلوب'
                      ? 'لا يُطلب تقديم تقرير عمل في أيام العطلات والإجازات الرسمية.'
                      : 'لم يتم تقديم تقرير العمل اليومي لهذا اليوم.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
