import React from 'react';

export const TasksReportTab = ({
  sortedTasks,
  handleSort,
  getSortIcon
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('createdAt')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">تاريخ الإنشاء {getSortIcon('createdAt')}</div>
          </th>
          <th onClick={() => handleSort('supervisorName')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">المشرف {getSortIcon('supervisorName')}</div>
          </th>
          <th onClick={() => handleSort('title')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">المهمة {getSortIcon('title')}</div>
          </th>
          <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">تاريخ التسليم {getSortIcon('dueDate')}</div>
          </th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedTasks.map(row => (
          <tr key={row.id}>
            <td style={{ fontWeight: 'bold' }}>{row.createdAt?.split('T')[0] || '---'}</td>
            <td>{row.supervisorName || row.supervisorId}</td>
            <td>{row.title}</td>
            <td>{row.dueDate || '---'}</td>
            <td>
              <span className={`badge ${row.status === 'منجز' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {row.status || 'قيد التنفيذ'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
