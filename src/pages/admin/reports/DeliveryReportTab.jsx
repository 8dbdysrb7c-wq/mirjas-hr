import React from 'react';

export const DeliveryReportTab = ({
  sortedDeliveryMissions,
  handleSort,
  getSortIcon,
  getStatusBadgeClass,
  getMissionTypeLabel
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('createdAt')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">تاريخ الإنشاء {getSortIcon('createdAt')}</div>
          </th>
          <th onClick={() => handleSort('type')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">نوع المهمة {getSortIcon('type')}</div>
          </th>
          <th onClick={() => handleSort('sourceEntity')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">الشركة التابعة لها المشوار {getSortIcon('sourceEntity')}</div>
          </th>
          <th onClick={() => handleSort('targetEntity')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">الشركة المتجه إليها {getSortIcon('targetEntity')}</div>
          </th>
          <th className="p-4 text-center">الموظف المسؤول</th>
          <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">موعد التنفيذ {getSortIcon('dueDate')}</div>
          </th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedDeliveryMissions.map((mission) => (
          <tr key={mission.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td className="p-4 text-center">{(mission.createdAt || '').split('T')[0] || '---'}</td>
            <td className="p-4 text-center font-bold">{getMissionTypeLabel(mission)}</td>
            <td className="p-4 text-center">{mission.sourceEntity || '---'}</td>
            <td className="p-4 text-center">{mission.targetEntity || '---'}</td>
            <td className="p-4 text-center">{mission.assignedEmployeeName || '---'}</td>
            <td className="p-4 text-center">{mission.dueDate || '---'}</td>
            <td className="p-4 flex justify-center">
              <span 
                className={`badge ${getStatusBadgeClass(mission.status || '---')}`}
                style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {mission.status || '---'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
