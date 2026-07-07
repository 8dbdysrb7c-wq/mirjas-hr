import React from 'react';
import { Fingerprint, Plus, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const MissingPunchesTab = ({ 
  remainingPunches, 
  userMissingPunchQuota, 
  bonusPunches,
  currentMonthPunchesCount, 
  setShowMissingPunchModal, 
  myMissingPunches 
}) => {
  return (
    <div className="glass-card animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Fingerprint className="text-primary" /> الختمات الناقصة
        </h3>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            if (remainingPunches <= 0) {
              MySwal.fire('تنبيه', 'لقد استنفدت رصيدك المسموح من طلبات الختمات الناقصة لهذا الشهر.', 'warning');
            } else {
              setShowMissingPunchModal(true);
            }
          }}
        >
          <Plus size={18} /> طلب ختمة ناقصة
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 flex justify-between items-center">
        <div>
          <p className="text-slate-500 text-sm">
            الرصيد المسموح به شهرياً: <b>{userMissingPunchQuota - bonusPunches}</b>
            {bonusPunches > 0 && (
              <span className="text-emerald-600 font-bold mr-1.5" style={{ color: '#059669' }}> (+ {bonusPunches} بونص ميزة)</span>
            )}
          </p>
          <p className="text-slate-500 text-sm mt-1">الطلبات المقدمة هذا الشهر: <b>{currentMonthPunchesCount}</b></p>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-black ${remainingPunches > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {remainingPunches}
          </div>
          <p className="text-xs text-slate-500">طلبات متبقية</p>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-bold mb-4 text-slate-800">سجل طلبات الختمات الناقصة</h4>
        {myMissingPunches.length === 0 ? (
          <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
            لا توجد طلبات سابقة
          </div>
        ) : (
          <div className="space-y-3">
            {myMissingPunches.map(p => (
              <div key={p.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      {p.type === 'دخول' ? <Clock size={16} className="text-blue-500" /> : <Clock size={16} className="text-orange-500" />}
                      ختمة {p.type} - {p.date}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      <span className="font-medium">الوقت المطلوب:</span> {p.time}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    p.status === 'موافق عليه' ? 'bg-green-100 text-green-700' :
                    p.status === 'مرفوض' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <div className="text-sm bg-slate-50 p-2 rounded text-slate-600 mt-2 border border-slate-100">
                  {p.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
