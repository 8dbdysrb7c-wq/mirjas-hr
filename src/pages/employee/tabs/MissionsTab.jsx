import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Clock, MapPin, Info, CheckCircle2, Navigation, CheckCircle, X } from 'lucide-react';

export const MissionsTab = ({ missions, globalSettings, handleUpdateMissionStatus }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Truck className="text-primary" /> المهمات المكلف بها
      </h3>
      
      {missions.length === 0 ? (
        <div className="glass-card text-center py-12 text-muted">
          <Truck size={48} className="mx-auto mb-4 opacity-20" />
          <p>لا توجد مهمات مكلف بها حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {missions.map(mission => (
            <div key={mission.id} className="glass-card overflow-hidden p-0 border-r-4" style={{ borderColor: globalSettings.missionStatuses?.find(s => s.name === mission.status)?.color || '#94a3b8' }}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <span className="badge" style={{ backgroundColor: globalSettings.missionStatuses?.find(s => s.name === mission.status)?.color || '#94a3b8', color: 'white' }}>
                    {mission.status}
                  </span>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <Clock size={12} /> {mission.createdAt?.split('T')[0]}
                  </span>
                </div>

                <h4 className="font-bold text-lg mb-1">{mission.type}</h4>
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <span className="text-xs text-muted">من شركة:</span>
                    <span>{mission.sourceEntity || '---'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <MapPin size={16} />
                    <span className="text-xs text-muted">إلى شركة:</span>
                    <span>{mission.targetEntity}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm mb-4">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                    <p>{mission.details}</p>
                  </div>
                </div>

                {mission.lastNote && (
                  <div className="text-xs text-muted mb-4 border-t pt-2 italic">
                    <strong>آخر ملاحظة:</strong> {mission.lastNote}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t mt-2">
                  {mission.status === 'بانتظار الاستلام' ? (
                    <button 
                      className="btn btn-primary flex-1 py-3" 
                      style={{ backgroundColor: '#f59e0b', border: 'none' }}
                      onClick={() => handleUpdateMissionStatus(mission.id, 'تم الاستلام')}
                    >
                      <CheckCircle2 size={18} /> ✅ تم الاستلام
                    </button>
                  ) : mission.status !== 'تم الإنجاز' && mission.status !== 'ملغي / تعذر التنفيذ' ? (
                    <>
                      <button className="btn btn-outline text-xs px-2 flex-1" onClick={() => handleUpdateMissionStatus(mission.id, 'في الطريق')}>
                        <Navigation size={14} /> في الطريق
                      </button>
                      <button className="btn btn-outline text-xs px-2 flex-1" onClick={() => handleUpdateMissionStatus(mission.id, 'عند الموقع')}>
                        <MapPin size={14} /> عند الموقع
                      </button>
                      <button className="btn btn-primary text-xs px-2 flex-1" style={{ backgroundColor: '#10b981' }} onClick={() => handleUpdateMissionStatus(mission.id, 'تم الإنجاز')}>
                        <CheckCircle size={14} /> تم الإنجاز
                      </button>
                      <button className="btn btn-outline text-xs px-2 text-danger border-danger/20 flex-1" onClick={() => handleUpdateMissionStatus(mission.id, 'ملغي / تعذر التنفيذ')}>
                        <X size={14} /> تعذر التنفيذ
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-sm font-bold text-slate-500 bg-slate-100 rounded-lg">
                      {mission.status === 'تم الإنجاز' ? '✅ اكتملت المهمة بنجاح' : '❌ تم إلغاء المهمة'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
