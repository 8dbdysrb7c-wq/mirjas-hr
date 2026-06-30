import React from 'react';

export const MissingPunchesReportTab = ({
  sortedMissingPunches,
  handleSort,
  getSortIcon,
  printDraftConfig,
  pendingExportAction
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('employeeName')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
            <div className="flex items-center gap-2">الموظف {getSortIcon('employeeName')}</div>
          </th>
          <th onClick={() => handleSort('date')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
            <div className="flex items-center gap-2">التاريخ {getSortIcon('date')}</div>
          </th>
          <th onClick={() => handleSort('type')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
            <div className="flex items-center gap-2">النوع {getSortIcon('type')}</div>
          </th>
          <th onClick={() => handleSort('time')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
            <div className="flex items-center gap-2">الوقت {getSortIcon('time')}</div>
          </th>
          <th className="p-4 w-1/4">السبب</th>
          <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-slate-200/50 transition-colors">
            <div className="flex items-center gap-2">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedMissingPunches.map(row => (
          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            {(printDraftConfig.selectedColumns.includes('employeeName') || !(pendingExportAction === 'print')) && (
              <td className="p-4">
                <div className="font-bold text-slate-800">{row.employeeName}</div>
                <div className="text-xs text-slate-500">{row.employeeId}</div>
              </td>
            )}
            {(printDraftConfig.selectedColumns.includes('date') || !(pendingExportAction === 'print')) && (
              <td className="p-4 text-slate-600">{row.date}</td>
            )}
            {(printDraftConfig.selectedColumns.includes('type') || !(pendingExportAction === 'print')) && (
              <td className="p-4">
                <span className={`px-2 py-1 text-xs font-bold rounded ${row.type === 'دخول' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {row.type}
                </span>
              </td>
            )}
            {(printDraftConfig.selectedColumns.includes('time') || !(pendingExportAction === 'print')) && (
              <td className="p-4 font-bold text-slate-700" dir="ltr">{row.time}</td>
            )}
            {(printDraftConfig.selectedColumns.includes('reason') || !(pendingExportAction === 'print')) && (
              <td className="p-4 text-slate-600 text-sm">{row.reason}</td>
            )}
            {(printDraftConfig.selectedColumns.includes('status') || !(pendingExportAction === 'print')) && (
              <td className="p-4">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  row.status === 'موافق عليه' ? 'bg-green-100 text-green-700' :
                  row.status === 'مرفوض' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {row.status}
                </span>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </>
  );
};
