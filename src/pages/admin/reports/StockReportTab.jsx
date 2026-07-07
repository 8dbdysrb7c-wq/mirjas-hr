import React from 'react';

export const StockReportTab = ({
  sortedStockItems,
  handleSort,
  getSortIcon,
  renderStockVariant,
  getStockItemStatus,
  getStatusBadgeClass,
  selectedStockSubTab = 'items'
}) => {
  if (selectedStockSubTab === 'items') {
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
  }

  if (selectedStockSubTab === 'stocktake') {
    return (
      <>
        <thead>
          <tr>
            <th onClick={() => handleSort('voucherNumber')} className="cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-1 justify-center">رقم الجرد {getSortIcon('voucherNumber')}</div>
            </th>
            <th onClick={() => handleSort('date')} className="cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-1 justify-center">التاريخ {getSortIcon('date')}</div>
            </th>
            <th onClick={() => handleSort('warehouse')} className="cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-1 justify-center">المستودع {getSortIcon('warehouse')}</div>
            </th>
            <th onClick={() => handleSort('createdBy')} className="cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-1 justify-center">المنشئ {getSortIcon('createdBy')}</div>
            </th>
            <th>عدد الأصناف المجرودة</th>
            <th>الملاحظات</th>
            <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
              <div className="flex items-center gap-1 justify-center">الحالة {getSortIcon('status')}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStockItems.map((st) => (
            <tr key={st.id}>
              <td style={{ fontWeight: 'bold' }}>{st.id?.slice(-8).toUpperCase() || '---'}</td>
              <td>{(st.createdAt || st.date || '').split('T')[0] || '---'}</td>
              <td>{st.warehouse || '---'}</td>
              <td>{st.createdBy || '---'}</td>
              <td>{st.items?.length || 0}</td>
              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={st.notes}>{st.notes || '---'}</td>
              <td>
                <span className={`badge ${st.status === 'معتمد' ? 'badge-success' : 'badge-info'}`}>
                  {st.status || '---'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </>
    );
  }

  // Vouchers In, Out, Transfer, Damage, Deduct
  return (
    <>
      <thead>
        <tr>
          <th onClick={() => handleSort('voucherNumber')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">رقم السند {getSortIcon('voucherNumber')}</div>
          </th>
          <th onClick={() => handleSort('date')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">التاريخ {getSortIcon('date')}</div>
          </th>
          <th onClick={() => handleSort('createdBy')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">المنشئ {getSortIcon('createdBy')}</div>
          </th>
          <th>عدد المواد</th>
          <th>الملاحظات</th>
          <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors">
            <div className="flex items-center gap-1 justify-center">الحالة {getSortIcon('status')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedStockItems.map((v) => (
          <tr key={v.id}>
            <td style={{ fontWeight: 'bold' }}>{v.voucherNumber || '---'}</td>
            <td>{(v.createdAt || v.date || '').split('T')[0] || '---'}</td>
            <td>{v.createdBy || '---'}</td>
            <td>{v.items?.length || 0}</td>
            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.notes}>{v.notes || '---'}</td>
            <td>
              <span className={`badge ${v.status === 'معتمد' ? 'badge-success' : 'badge-info'}`}>
                {v.status || '---'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
};
