import React from 'react';

export const SalesOrdersReportTab = ({
  sortedSalesOrders,
  handleSort,
  getSortIcon,
  getStatusBadgeClass
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('orderDate')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">التاريخ {getSortIcon('orderDate')}</div>
          </th>
          <th onClick={() => handleSort('orderNumber')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">رقم الطلبية {getSortIcon('orderNumber')}</div>
          </th>
          <th onClick={() => handleSort('customerName')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">العميل {getSortIcon('customerName')}</div>
          </th>
          <th onClick={() => handleSort('createdBy')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">أُنشئت بواسطة {getSortIcon('createdBy')}</div>
          </th>
          <th className="p-4 text-center">آخر إجراء</th>
          <th className="p-4 text-center">عدد الأصناف</th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedSalesOrders.map(order => (
          <tr key={order.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td className="p-4 text-center">{order.orderDate}</td>
            <td className="p-4 text-center font-bold">#{order.orderNumber}</td>
            <td className="p-4 text-center text-primary font-bold">{order.customerName}</td>
            <td className="p-4 text-center text-slate-600" style={{ fontSize: '0.82rem' }}>{order.createdBy || '---'}</td>
            <td className="p-4 text-center text-slate-600" style={{ fontSize: '0.82rem', fontWeight: '600' }}>{order.lastActionBy || '---'}</td>
            <td className="p-4 text-center font-bold">{order.items ? order.items.length : 1}</td>
            <td className="p-4 flex justify-center">
              <span 
                className={`badge ${getStatusBadgeClass(order.status)}`}
                style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {order.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
