import React from 'react';
import { Eye, X, Check, Trash2 } from 'lucide-react';

export const SupervisorsReportTab = ({
  sortedSupervisors,
  handleSort,
  getSortIcon,
  onView,
  onApprove,
  onReject,
  onDelete
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">التاريخ {getSortIcon('date')}</div>
          </th>
          <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">المشرف {getSortIcon('supervisorName')}</div>
          </th>
          <th className="p-4 text-center">تقييم الموظفين</th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">حالة التقرير {getSortIcon('status')}</div>
          </th>
          <th className="p-4 text-center">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        {sortedSupervisors.map((row, index) => (
          <tr key={`${row.id || 'no-id'}-${index}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td className="p-4 text-center font-bold">{row.date}</td>
            <td className="p-4 text-center">{row.supervisorName || row.supervisorId}</td>
            <td className="p-4 text-center">تم تقييم {row.employeeEvaluations?.length || 0} موظف</td>
            <td className="p-4 text-center">
              <span 
                className={`badge ${(!row.status || row.status === 'قيد المراجعة') ? 'bg-blue-100 text-blue-700' : row.status === 'معتمد' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} 
                style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                {row.status || 'قيد المراجعة'}
              </span>
            </td>
            <td className="p-4 text-center">
              <div className="flex justify-center gap-2">
                <button 
                  className="action-btn info" 
                  style={{ backgroundColor: '#f0f9ff', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => onView(row)} 
                  title="عرض التفاصيل"
                >
                  <Eye size={18} className="text-blue-600" />
                </button>
                {row.status !== 'معتمد' && (
                  <button 
                    className="action-btn success" 
                    style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => onApprove(row)} 
                    title="اعتماد التقرير"
                  >
                    <Check size={18} className="text-emerald-600" />
                  </button>
                )}
                {row.status !== 'مرفوض/مُعاد' && (
                  <button 
                    className="action-btn danger" 
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => onReject(row)} 
                    title="رفض التقرير وإعادته"
                  >
                    <X size={18} className="text-red-500" />
                  </button>
                )}
                <button 
                  className="action-btn danger" 
                  style={{ backgroundColor: '#fff5f5', border: '1px solid #feb2b2', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} 
                  onClick={() => onDelete(row)} 
                  title="حذف التقرير"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
