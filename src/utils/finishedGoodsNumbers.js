export const isFinishedGoodsCategory = category => {
  const c = String(category || '').trim();
  return c === 'بضاعة جاهزة' || c === 'البضاعة الجاهزة' || c.includes('جاهز') || c.includes('بضاعة');
};

export const finishedGoodsNumber = sequence => `FG-${String(sequence).padStart(5, '0')}`;

export const finishedGoodsSequence = value => /^FG-\d+$/.test(String(value || '')) ? Number(value.slice(3)) : 0;

// One logical finished good item keeps its number across warehouses and specifications.
export function planFinishedGoodsNumbers(stock) {
  const groups = new Map();
  for (const item of stock.filter(row => isFinishedGoodsCategory(row.category) || (row.itemNumber && String(row.itemNumber).startsWith('FG-')))) {
    const name = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!name) throw new Error('يوجد صنف بضاعة جاهزة دون اسم؛ يجب تصحيحه قبل إعادة الترقيم');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const names = [...groups.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));
  const oldOwners = new Map();
  const targets = new Set(names.map((_, index) => finishedGoodsNumber(index + 1)));

  for (const item of stock) {
    if (!isFinishedGoodsCategory(item.category) && !String(item.itemNumber || '').startsWith('FG-') && targets.has(item.itemNumber)) {
      throw new Error(`الرقم ${item.itemNumber} مستخدم خارج تصنيف البضاعة الجاهزة`);
    }
  }

  return names.map((name, index) => {
    const items = groups.get(name);
    for (const item of items) {
      if (item.itemNumber) {
        if (oldOwners.has(item.itemNumber) && oldOwners.get(item.itemNumber) !== name) {
          // Warning/notice
        }
        oldOwners.set(item.itemNumber, name);
      }
    }
    return {
      name,
      itemNumber: finishedGoodsNumber(index + 1),
      oldNumbers: [...new Set(items.map(item => item.itemNumber).filter(Boolean))],
      documentIds: items.map(item => item.id)
    };
  });
}
