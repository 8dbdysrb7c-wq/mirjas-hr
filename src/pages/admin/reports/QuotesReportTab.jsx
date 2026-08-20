import React from 'react';

export const QuotesReportTab = ({
  sortedQuotes,
  handleSort,
  getSortIcon
}) => {
  const getStatusBadge = (status) => {
    let color = 'bg-slate-100 text-slate-800';
    if (status === 'مقبول' || status === 'محول لطلبية') color = 'bg-emerald-100 text-emerald-800';
    if (status === 'مرفوض' || status === 'ملغي') color = 'bg-rose-100 text-rose-800';
    if (status === 'قيد المراجعة') color = 'bg-amber-100 text-amber-800';
    if (status === 'جديد') color = 'bg-blue-100 text-blue-800';
    
    return color;
  };

  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('quoteDate')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">التاريخ {getSortIcon('quoteDate')}</div>
          </th>
          <th onClick={() => handleSort('quoteNumber')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">رقم العرض {getSortIcon('quoteNumber')}</div>
          </th>
          <th onClick={() => handleSort('customerName')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-right">
            <div className="flex items-center gap-2 justify-start">العميل {getSortIcon('customerName')}</div>
          </th>
          <th onClick={() => handleSort('createdBy')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">أُنشئت بواسطة {getSortIcon('createdBy')}</div>
          </th>
          <th className="p-4 text-center">آخر إجراء</th>
          <th className="p-4 text-center">المبلغ الكلي</th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-200/50 transition-colors p-4 text-center">
            <div className="flex items-center gap-2 justify-center">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedQuotes.map(quote => (
          <tr key={quote.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td className="p-4 text-center">{quote.quoteDate}</td>
            <td className="p-4 text-center font-bold">#{quote.quoteNumber}</td>
            <td className="p-4 text-right text-primary font-bold">{quote.customerName}</td>
            <td className="p-4 text-center text-slate-600" style={{ fontSize: '0.82rem' }}>{quote.createdBy || '---'}</td>
            <td className="p-4 text-center text-slate-600" style={{ fontSize: '0.82rem', fontWeight: '600' }}>{quote.lastActionBy || '---'}</td>
            <td className="p-4 text-center font-bold">{quote.grandTotal} د.أ</td>
            <td className="p-4 flex justify-center">
              <span 
                className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusBadge(quote.status)}`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}
              >
                {quote.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
