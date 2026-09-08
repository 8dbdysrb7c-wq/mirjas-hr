import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Pin, ClipboardList, Store, MapPin, Calendar, ChevronRight, ChevronDown, Send, FileText } from 'lucide-react';

export const MissionsTab = ({ missions, globalSettings, handleUpdateMissionStatus, canUpdateMissions = true }) => {
  const [filterType, setFilterType] = useState('pending');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  let filteredMissions = missions.filter(m => {
    let matchType = true;
    if (filterType === 'pending') {
      matchType = m.status !== 'تم الإنجاز' && m.status !== 'ملغي';
    } else {
      matchType = m.status === 'تم الإنجاز' || m.status === 'ملغي';
    }

    let matchDateFrom = dateFrom ? m.dueDate >= dateFrom : true;
    let matchDateTo = dateTo ? m.dueDate <= dateTo : true;

    return matchType && matchDateFrom && matchDateTo;
  });

  const hasDateFilter = dateFrom !== '' || dateTo !== '';
  if (filterType === 'completed' && !hasDateFilter) {
    filteredMissions = filteredMissions.slice(0, 5);
  }

  const getStatusColor = (statusName) => {
    return globalSettings.missionStatuses?.find(s => s.name === statusName)?.color || '#94a3b8';
  };

  const getMissionTypeLabel = (mission) => {
    if (!mission) return '';
    if (mission.type === 'أخرى' && mission.customType) {
      return `أخرى - ${mission.customType}`;
    }
    return mission.type || '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Truck className="text-primary" /> المهمات المكلف بها
        </h3>
        <span className="badge bg-slate-100 text-slate-700 font-bold">{filteredMissions.length} مهمات</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => { setFilterType('pending'); setDateFrom(''); setDateTo(''); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '12px',
            fontWeight: 'bold',
            backgroundColor: filterType === 'pending' ? '#1a8d9b' : '#f1f5f9',
            color: filterType === 'pending' ? 'white' : '#64748b',
            border: 'none',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        >
          المهام المعلقة
        </button>
        <button
          onClick={() => { setFilterType('completed'); setDateFrom(''); setDateTo(''); }}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '12px',
            fontWeight: 'bold',
            backgroundColor: filterType === 'completed' ? '#1a8d9b' : '#f1f5f9',
            color: filterType === 'completed' ? 'white' : '#64748b',
            border: 'none',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        >
          المهام المنتهية
        </button>
      </div>

      {filterType === 'completed' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>من تاريخ</label>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>إلى تاريخ</label>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>
        </div>
      )}
      
      {filteredMissions.length === 0 ? (
        <div className="glass-panel text-center py-12 text-muted">
          <Truck size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">لا توجد مهمات مكلف بها حالياً</p>
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4">
            {filteredMissions.map((mission) => (
              <div key={mission.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                
                {/* Row 1: Order Number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ background: '#e0f2f1', color: '#1a8d9b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    رقم الطلب
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', direction: 'ltr', color: '#1e293b' }}>
                    {mission.salesOrderNumber ? (
                      <>
                        <span style={{ color: '#ef4444' }}>{mission.salesOrderNumber}</span>
                        <span style={{ color: '#cbd5e1' }}>×</span>
                        <span style={{ color: '#1e293b' }}>{mission.missionNumber || '---'}</span>
                      </>
                    ) : (
                      <span style={{ color: '#1e293b' }}>{mission.missionNumber || '---'}</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Mission Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <ClipboardList size={16} color="#1a8d9b" />
                    <span>نوع المهمة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {getMissionTypeLabel(mission)}
                  </div>
                </div>

                {/* Row 3: Source Entity */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <Store size={16} color="#1a8d9b" />
                    <span>من شركة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.sourceEntity || '---'}
                  </div>
                </div>

                {/* Row 4: Destination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <MapPin size={16} color="#1a8d9b" />
                    <span>الوجهة</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1a8d9b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.targetEntity}
                  </div>
                </div>

                {/* Row 5: Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>
                    <Calendar size={16} color="#1a8d9b" />
                    <span>تاريخ التنفيذ</span>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', fontWeight: 'bold', color: '#1e293b', fontSize: '14px', direction: 'rtl' }}>
                    {mission.dueDate || '---'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
                  {/* Status Dropdown disguised as a Green Button */}
                  <div style={{ position: 'relative', background: '#1a8d9b', borderRadius: '12px', boxShadow: '0 4px 12px rgba(26, 141, 155, 0.2)' }}>
                    <select
                      disabled={!canUpdateMissions}
                      title={!canUpdateMissions ? 'لا تملك صلاحية تعديل حالة المهمة' : 'تحديث حالة المهمة'}
                      style={{ width: '100%', appearance: 'none', border: 'none', color: '#ffffff', padding: '12px 40px', fontWeight: 'bold', fontSize: '14px', backgroundColor: 'transparent', textAlign: 'center', textAlignLast: 'center', direction: 'rtl', outline: 'none', cursor: 'pointer' }}
                      value={mission.status}
                      onChange={(e) => handleUpdateMissionStatus(mission.id, e.target.value)}
                    >
                      <option value="" disabled style={{ color: '#1e293b' }}>تحديث الحالة</option>
                      {(globalSettings.missionStatuses || []).map((status) => (
                        <option key={status.name} value={status.name} style={{ color: '#1e293b' }}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', pointerEvents: 'none' }} />
                    <Send size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%) scaleX(-1)', color: '#ffffff', pointerEvents: 'none', opacity: 0.9 }} />
                  </div>
                  
                  {/* Notes Details (if any) as a button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', color: '#64748b', borderRadius: '12px', padding: '12px 16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                      <ChevronRight size={18} style={{ opacity: 0.5 }} />
                      <span>ملاحظات المهمة</span>
                      <FileText size={18} style={{ opacity: 0.5 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block table-container glass-panel">
            <table className="w-full text-right bg-white text-sm">
            <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="p-3 w-28">رقم الطلب</th>
                <th className="p-3">نوع المهمة</th>
                <th className="p-3">من شركة</th>
                <th className="p-3">إلى شركة / جهة والتفاصيل</th>
                <th className="p-3 w-32">تاريخ التنفيذ</th>
                <th className="p-3 w-40 text-center">الحالة</th>
                <th className="p-3 w-48 text-center">تحديث الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((mission) => (
                <tr key={mission.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-primary" data-label="رقم الطلب">
                    <div>{mission.missionNumber || '---'}</div>
                    {mission.salesOrderNumber && (
                      <div className="flex items-center gap-1 text-xs text-red-500 font-bold mt-1 justify-center md:justify-start" style={{ direction: 'rtl', color: '#ef4444' }}>
                        <Pin size={11} className="text-red-500" style={{ transform: 'rotate(45deg)', flexShrink: 0, color: '#ef4444' }} />
                        <span>{mission.salesOrderNumber}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-bold text-slate-700" data-label="نوع المهمة">{getMissionTypeLabel(mission)}</td>
                  <td className="p-3 text-slate-600" data-label="من شركة">{mission.sourceEntity || '---'}</td>
                  <td className="p-3 text-primary font-semibold" data-label="الوجهة والتفاصيل">
                    <div className="flex flex-col items-start justify-start">
                      <span>{mission.targetEntity}</span>
                      {mission.details && (
                        <div className="text-xs text-slate-500 font-medium mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100/50 max-w-md text-right w-full">
                          <strong>التفاصيل:</strong> {mission.details}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 font-medium" data-label="تاريخ التنفيذ">{mission.dueDate || '---'}</td>
                  <td className="p-3 text-center" data-label="الحالة">
                    <span
                      className="badge font-bold"
                      style={{
                        backgroundColor: getStatusColor(mission.status),
                        color: 'white',
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        fontSize: '13px',
                        display: 'inline-block',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      {mission.status}
                    </span>
                  </td>
                  <td className="p-3 text-center align-middle" data-label="تحديث الحالة">
                    <select
                      disabled={!canUpdateMissions}
                      title={!canUpdateMissions ? 'لا تملك صلاحية تعديل حالة المهمة' : 'تحديث حالة المهمة'}
                      className="rounded-lg focus:ring-1 focus:ring-primary/20 outline-none transition-all text-right font-bold"
                      style={{
                        height: '32px',
                        fontSize: '0.82rem',
                        width: '100%',
                        maxWidth: '135px',
                        backgroundColor: getStatusColor(mission.status),
                        color: 'white',
                        border: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'left 10px center',
                        backgroundSize: '12px',
                        paddingLeft: '26px',
                        paddingRight: '12px',
                        cursor: 'pointer',
                        margin: '0 auto',
                        display: 'block',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      value={mission.status}
                      onChange={(e) => handleUpdateMissionStatus(mission.id, e.target.value)}
                    >
                      {(globalSettings.missionStatuses || []).map((status) => (
                        <option key={status.name} value={status.name} className="bg-white text-slate-800 font-normal">
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        </>
      )}
    </motion.div>
  );
};
