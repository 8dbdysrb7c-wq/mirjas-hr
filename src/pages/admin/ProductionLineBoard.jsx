import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Eye, History, Package, Scissors, Send, Undo2, Warehouse } from 'lucide-react';
import SewingMachineIcon from '../../components/SewingMachineIcon';

const flow = [
  { key: 'notStarted', label: 'لم يبدأ', color: '#94a3b8', icon: Circle },
  { key: 'cutting', label: 'القص', color: '#f97316', icon: Scissors },
  { key: 'warehouse', label: 'قبل الخياطة', color: '#f59e0b', icon: Warehouse },
  { key: 'sewing', label: 'الخياطة', color: '#2878d0', icon: SewingMachineIcon },
  { key: 'packaging', label: 'التغليف', color: '#7c3fb0', icon: Package },
  { key: 'finished', label: 'منتهي', color: '#159467', icon: CheckCircle2 }
];

const itemStageOptions = [
  ['لم يتم التنفيذ', 'لم يتم التنفيذ'],
  ['تم استلام كرت الإنتاج', 'تم استلام كرت الإنتاج'],
  ['مرحلة القص', 'مرحلة القص'],
  ['مرحلة المستودع', 'مرحلة مستودع قبل الخياطة'],
  ['مرحلة الخياطة', 'مرحلة الخياطة'],
  ['ملغي', 'ملغي']
];

const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
const itemQuantities = (item = {}, orderStatus = '') => {
  const total = Math.max(0, Number(item.quantity || 0));
  if (item.stageQuantities) {
    const finished = Math.min(total, Math.max(0, Number(item.stageQuantities.finished || 0)));
    const packaging = Math.min(total - finished, Math.max(0, Number(item.stageQuantities.packaging || 0)));
    const pendingPackaging = Math.min(total - finished - packaging, Math.max(0, Number(item.stageQuantities.pendingPackaging || 0)));
    return { total, finished, packaging, pendingPackaging, sewing: Math.max(0, total - finished - packaging - pendingPackaging) };
  }
  const status = normalize(item.status || orderStatus || 'لم يتم التنفيذ');
  if (['منتهي', 'جاهز'].includes(status)) return { total, finished: total, packaging: 0, pendingPackaging: 0, sewing: 0 };
  if (status === 'مرحلة التغليف') return { total, finished: 0, packaging: total, pendingPackaging: 0, sewing: 0 };
  if (['بانتظار استلام التغليف', 'تم التحويل إلى قسم التغليف'].includes(status)) return { total, finished: 0, packaging: 0, pendingPackaging: total, sewing: 0 };
  return { total, finished: 0, packaging: 0, pendingPackaging: 0, sewing: total };
};

const stageForItem = (item, orderStatus) => {
  const q = itemQuantities(item, orderStatus);
  if (q.finished === q.total && q.total > 0) return 'finished';
  if (q.packaging > 0 || q.pendingPackaging > 0) return 'packaging';
  const status = normalize(item.status || orderStatus);
  if (status === 'مرحلة القص') return 'cutting';
  if (['مرحلة المستودع', 'مرحلة مستودع قبل الخياطة'].includes(status)) return 'warehouse';
  if (['لم يتم التنفيذ', 'جديد', 'مسودة', 'تم استلام كرت الإنتاج'].includes(status)) return 'notStarted';
  return 'sewing';
};

const orderSummary = order => {
  const items = order.items || [];
  return items.reduce((acc, item) => {
    const q = itemQuantities(item, order.status);
    acc.total += q.total; acc.sewing += q.sewing; acc.pending += q.pendingPackaging;
    acc.packaging += q.packaging; acc.finished += q.finished;
    return acc;
  }, { total: 0, sewing: 0, pending: 0, packaging: 0, finished: 0 });
};

const isSewingComplete = order => {
  const items = order.items || [];
  return items.length > 0 && items.every(item => itemQuantities(item, order.status).sewing === 0);
};

const latestMovement = order => (order.items || []).flatMap(item => item.movementHistory || [])
  .sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0))[0];

const orderLastDate = order => {
  const movement = latestMovement(order);
  return new Date(movement?.changedAt || order.statusUpdateDate || order.updatedAt || order.orderDate || 0);
};

const localDateKey = date => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const orderProgress = order => {
  const items = order.items || [];
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0);
  if (!total) return 0;
  const points = items.reduce((sum, item) => {
    const q = itemQuantities(item, order.status);
    const stage = stageForItem(item, order.status);
    const sewingWeight = stage === 'notStarted' ? 0 : stage === 'cutting' ? .2 : stage === 'warehouse' ? .4 : .65;
    return sum + (q.sewing * sewingWeight) + (q.pendingPackaging * .78) + (q.packaging * .88) + q.finished;
  }, 0);
  return Math.min(100, Math.round((points / total) * 100));
};

export default function ProductionLineBoard({ orders, selectedOrder, onSelectOrder, onOpenPreview, onSend, onSendAll, onAdvance, onReceive, onFinish, onReturn, editable, detailsOnly = false, section = '' }) {
  const [finishedPeriod, setFinishedPeriod] = useState('month');
  const [finishedFrom, setFinishedFrom] = useState('');
  const [finishedTo, setFinishedTo] = useState('');
  const [finishedLimit, setFinishedLimit] = useState(5);
  const columns = useMemo(() => flow.map(stage => {
    let stageOrders = orders.filter(order => {
      if (section === 'sewing' && (order.sewingStatus === 'منتهي' || isSewingComplete(order))) return stage.key === 'finished';
      return (order.items || []).some(item => stageForItem(item, order.status) === stage.key);
    });
    if (stage.key === 'finished') {
      const now = new Date();
      const today = localDateKey(now);
      stageOrders = stageOrders.filter(order => {
        const date = orderLastDate(order);
        if (Number.isNaN(date.getTime())) return finishedPeriod === 'all';
        const key = localDateKey(date);
        if (finishedPeriod === 'today') return key === today;
        if (finishedPeriod === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        if (finishedPeriod === 'custom') return (!finishedFrom || key >= finishedFrom) && (!finishedTo || key <= finishedTo);
        return true;
      }).sort((a, b) => orderLastDate(b) - orderLastDate(a));
    }
    return { ...stage, orders: stageOrders };
  }), [orders, finishedPeriod, finishedFrom, finishedTo, section]);
  const selected = selectedOrder && orders.find(order => order.id === selectedOrder.id) || selectedOrder;
  const selectedItems = selected
    ? (selected.items || []).filter(item => {
        if (section !== 'packaging') return true;
        const quantities = itemQuantities(item, selected.status);
        return quantities.pendingPackaging + quantities.packaging + quantities.finished > 0;
      })
    : [];
  const selectedSummary = selected ? orderSummary({ ...selected, items: selectedItems }) : null;
  const movement = selected ? latestMovement(selected) : null;
  const showPackagingStatus = section === 'packaging';

  return <section className="production-line" dir="rtl">
    {!detailsOnly && <>
    <div className="production-line__total">خط الإنتاج <span>إجمالي الكروت: <strong>{orders.length}</strong></span></div>

    <div className="production-line__board">
      {columns.map(({ key, label, color, icon: Icon, orders: stageOrders }) => {
        const visibleOrders = key === 'finished' ? stageOrders.slice(0, finishedLimit) : stageOrders;
        return <div className="production-stage" key={key} style={{ '--stage': color }}>
        <div className={`production-stage__head ${key === 'finished' ? 'with-filter' : ''}`}><span><Icon size={19}/>{label}<b>{stageOrders.length}</b></span>
          {key === 'finished' && <select value={finishedPeriod} onChange={event => { setFinishedPeriod(event.target.value); setFinishedLimit(5); }} aria-label="فترة الطلبات المنتهية">
            <option value="today">اليوم</option><option value="month">هذا الشهر</option><option value="custom">فترة محددة</option><option value="all">الكل</option>
          </select>}
        </div>
        {key === 'finished' && finishedPeriod === 'custom' && <div className="finished-custom-period"><label>من<input type="date" value={finishedFrom} onChange={event => setFinishedFrom(event.target.value)}/></label><label>إلى<input type="date" value={finishedTo} onChange={event => setFinishedTo(event.target.value)}/></label></div>}
        <div className="production-stage__cards">
          {visibleOrders.map(order => {
            const summary = orderSummary(order);
            const percent = orderProgress(order);
            const stageKeys = section === 'sewing' && (order.sewingStatus === 'منتهي' || isSewingComplete(order))
              ? new Set(['finished'])
              : new Set((order.items || []).map(item => stageForItem(item, order.status)));
            return <button type="button" className={`production-card ${selected?.id === order.id ? 'selected' : ''}`} key={order.id} onClick={() => onSelectOrder(order)}>
              <div><strong>{order.orderNumber}</strong>{stageKeys.size > 1 && <b>إنتاج مختلط</b>}</div>
              <span>{order.customerName || 'عميل غير محدد'}</span>
              <small>{(order.items || []).length} أصناف · {summary.total} قطعة</small>
              <div className="production-card__progress"><i style={{ width: `${percent}%` }}/></div>
              <em>{percent}%</em>
            </button>;
          })}
          {!stageOrders.length && <div className="production-stage__empty">لا توجد كروت في هذه المرحلة</div>}
          {key === 'finished' && stageOrders.length > visibleOrders.length && <button className="finished-show-more" type="button" onClick={() => setFinishedLimit(limit => limit + 5)}>إظهار المزيد ({stageOrders.length - visibleOrders.length})</button>}
          {key === 'finished' && finishedLimit > 5 && visibleOrders.length > 5 && <button className="finished-show-less" type="button" onClick={() => setFinishedLimit(5)}>عرض أحدث 5 فقط</button>}
        </div>
      </div>;})}
    </div>
    </>}

    {selected && <div className="production-details">
      <div className="production-details__header">
        <div><span className="mixed">{section === 'sewing' && (selected.sewingStatus === 'منتهي' || isSewingComplete(selected)) ? 'منتهي' : (selected.status || 'قيد الإنتاج')}</span><strong>{selected.orderNumber}</strong><span>{selected.customerName}</span></div>
        <div><small>الموعد المطلوب: {selected.deliveryDate || 'غير محدد'}</small><button type="button" onClick={() => onOpenPreview(selected)}><Eye size={16}/> معاينة الكرت</button></div>
      </div>
      <div className="production-details__body unified-actions">
        <div className="production-items-summary">
          <h3>تفاصيل أصناف كرت الإنتاج</h3>
          <div className="production-details__table-wrap"><table className={`production-details__table ${showPackagingStatus ? 'with-packaging-status' : ''}`}><thead><tr><th>الصنف</th><th>المقاس</th><th>السماكة</th><th>اللون</th><th>نوع التغليف</th><th>الكمية</th><th>بالخياطة</th><th>بانتظار التغليف</th><th>بالتغليف</th><th>{showPackagingStatus ? 'تم تغليفه' : 'منتهي'}</th>{showPackagingStatus && <th className="packaging-status-col">حالة التغليف</th>}<th className="delivery-col">الإجراء</th></tr></thead>
            <tbody>{selectedItems.map((item, index) => { const q = itemQuantities(item, selected.status); const status = normalize(item.status || selected.status || 'لم يتم التنفيذ'); const isSplit = q.pendingPackaging > 0 || q.packaging > 0 || q.finished > 0; const selectStatus = itemStageOptions.some(([value]) => value === status) ? status : q.sewing > 0 ? 'مرحلة الخياطة' : ''; const canDeliver = status === 'مرحلة الخياطة' && q.sewing > 0; const packagingStatus = q.total > 0 && q.finished === q.total ? 'منتهي' : q.packaging > 0 ? 'قيد التغليف' : q.pendingPackaging > 0 ? 'بانتظار استلام التغليف' : 'بانتظار التحويل من الخياطة'; const packagingTone = packagingStatus === 'منتهي' ? 'finished' : packagingStatus === 'قيد التغليف' ? 'active' : packagingStatus === 'بانتظار استلام التغليف' ? 'pending' : 'waiting'; const packagingPercent = q.total ? Math.round((q.finished / q.total) * 100) : 0; const originalIndex = (selected.items || []).indexOf(item); return <tr key={`${selected.id}-${originalIndex}`}><td>{item.productName || 'صنف دون اسم'}</td><td>{item.sizeCm || '—'}</td><td>{item.thickness ? `${item.thickness} سم` : '—'}</td><td>{item.colorModel || '—'}</td><td>{item.packagingType || '—'}</td><td>{q.total}</td><td>{q.sewing}</td><td>{q.pendingPackaging}</td><td>{q.packaging}</td><td>{q.finished}</td>{showPackagingStatus && <td className="packaging-status-col"><div className="packaging-status-stack"><span className={`packaging-item-status ${packagingTone}`}>{packagingStatus}</span><small>تم تغليف {q.finished} من {q.total}</small><i><b style={{ width: `${packagingPercent}%` }}/></i></div></td>}<td className="delivery-col"><div className="table-row-actions">
              {editable && !isSplit && !canDeliver && <div className="item-stage-control compact"><select value={selectStatus} onChange={event => event.target.value !== status && onAdvance(selected, originalIndex, event.target.value)} aria-label={`مرحلة ${item.productName || `الصنف ${originalIndex + 1}`}`}>{itemStageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>}
              {editable && canDeliver && <div className="delivery-action-group"><button className="deliver-all" onClick={() => onSendAll(selected, originalIndex)}><Send size={14}/><span>تسليم كامل</span><b>{q.sewing}</b></button><button className="deliver-part" onClick={() => onSend(selected, originalIndex)}><Package size={14}/><span>تسليم جزئي</span></button></div>}
              {editable && q.pendingPackaging > 0 && <button className="receive" onClick={() => onReceive(selected, originalIndex)}><Package size={13}/> استلام ({q.pendingPackaging})</button>}
              {editable && q.packaging > 0 && <button className="finish" onClick={() => onFinish(selected, originalIndex)}><CheckCircle2 size={13}/> تسجيل مغلف ({q.packaging})</button>}
              {editable && (q.pendingPackaging > 0 || q.packaging > 0 || q.finished > 0) && <button className="return" onClick={() => onReturn(selected, originalIndex)}><Undo2 size={13}/> إرجاع للخياطة</button>}
            </div></td></tr>; })}</tbody>
            <tfoot><tr><td>الإجمالي</td><td colSpan="4"/><td>{selectedSummary.total}</td><td>{selectedSummary.sewing}</td><td>{selectedSummary.pending}</td><td>{selectedSummary.packaging}</td><td>{selectedSummary.finished}</td>{showPackagingStatus && <td/>}<td/></tr></tfoot>
          </table></div>
          <div className="movement-box"><History size={17}/><div><strong>آخر حركة</strong><span>{movement ? `${movement.action || 'تغيير مرحلة'}: ${movement.from || '—'} ← ${movement.to || '—'}` : 'لا توجد حركات مسجلة'}</span><small>{movement?.changedAt ? new Date(movement.changedAt).toLocaleString('ar-JO') : ''} {movement?.changedBy ? `· بواسطة ${movement.changedBy}` : ''}</small></div></div>
        </div>
      </div>
    </div>}
  </section>;
}
