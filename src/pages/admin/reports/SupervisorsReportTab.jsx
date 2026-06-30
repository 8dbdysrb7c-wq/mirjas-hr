import React from 'react';

export const SupervisorsReportTab = ({
  sortedSupervisors,
  handleSort,
  getSortIcon
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('date')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">التاريخ {getSortIcon('date')}</div>
          </th>
          <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">المشرف {getSortIcon('supervisorName')}</div>
          </th>
          <th onClick={() => handleSort('type')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">النوع {getSortIcon('type')}</div>
          </th>
          <th>المحتوى</th>
        </tr>
      </thead>
      <tbody>
        {sortedSupervisors.map(row => (
          <tr key={row.id}>
            <td style={{ fontWeight: 'bold' }}>{row.date}</td>
            <td>{row.supervisorName || row.supervisorId}</td>
            <td>{row.type}</td>
            <td>{row.content}</td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
