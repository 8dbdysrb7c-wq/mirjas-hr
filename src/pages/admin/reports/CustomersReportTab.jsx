import React from 'react';

export const CustomersReportTab = ({
  sortedCustomers,
  handleSort,
  getSortIcon
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('customerNumber')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">الرقم {getSortIcon('customerNumber')}</div>
          </th>
          <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary transition-colors text-right w-1/4 pr-4">
            <div className="flex items-center justify-start gap-1">اسم العميل {getSortIcon('name')}</div>
          </th>
          <th onClick={() => handleSort('phone')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">رقم التلفون {getSortIcon('phone')}</div>
          </th>
          <th onClick={() => handleSort('city')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">المدينة {getSortIcon('city')}</div>
          </th>
          <th onClick={() => handleSort('location')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">العنوان {getSortIcon('location')}</div>
          </th>
          <th onClick={() => handleSort('sector')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">القطاع {getSortIcon('sector')}</div>
          </th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center justify-center gap-1">حالة العميل {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedCustomers.map(row => (
          <tr key={row.id}>
            <td className="font-mono text-sm text-slate-500 font-bold text-center">{row.customerNumber || '---'}</td>
            <td className="text-right pr-4" style={{ fontWeight: 'bold' }}>{row.name}</td>
            <td dir="ltr" className="text-center">{row.phone}</td>
            <td className="text-center">{row.city || '---'}</td>
            <td className="text-center">{row.location || '---'}</td>
            <td className="text-center">{row.sector || '---'}</td>
            <td className="text-center">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                (row.status || 'نشط') === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                (row.status === 'غير نشط') ? 'bg-slate-100 text-slate-700' :
                (row.status === 'عميل جديد') ? 'bg-blue-100 text-blue-700' :
                (row.status === 'عميل محتمل') ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {row.status || 'نشط'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
