import React from 'react';

export const StockReportTab = ({
  sortedStockItems,
  handleSort,
  getSortIcon,
  renderStockVariant,
  getStockItemStatus,
  getStatusBadgeClass
}) => {
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('itemNumber')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">رقم الصنف {getSortIcon('itemNumber')}</div>
          </th>
          <th onClick={() => handleSort('itemCode')} className="cursor-pointer hover:text-primary transition-colors text-center">
            <div className="flex items-center gap-1 justify-center">رمز الصنف {getSortIcon('itemCode')}</div>
          </th>
          <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary transition-colors text-right">
            <div className="flex items-center gap-1 justify-start">الاسم {getSortIcon('name')}</div>
          </th>
          <th>اللون/التفصيل</th>
          <th onClick={() => handleSort('category')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">التصنيف {getSortIcon('category')}</div>
          </th>
          <th>المستودع</th>
          <th onClick={() => handleSort('quantity')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">الكمية {getSortIcon('quantity')}</div>
          </th>
          <th>الوحدة</th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedStockItems.map((item) => (
          <tr key={item.id}>
            <td style={{ fontWeight: 'bold' }}>{item.itemNumber || '---'}</td>
            <td className="font-mono text-sm text-muted text-center">{item.itemCode || '---'}</td>
            <td className="text-right" style={{ textAlign: 'right' }}>{item.name || '---'}</td>
            <td>{renderStockVariant(item)}</td>
            <td>{item.category || '---'}</td>
            <td>{item.warehouse || '---'}</td>
            <td>{item.quantity ?? 0}</td>
            <td>{item.unit || '---'}</td>
            <td>
              <span 
                className={`badge ${getStatusBadgeClass(getStockItemStatus(item))}`}
                style={{ width: '130px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {getStockItemStatus(item)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
