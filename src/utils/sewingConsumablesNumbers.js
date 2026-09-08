export const isSewingConsumablesCategory = category => {
  const c = String(category || '').trim();
  return c === 'مستهلكات الخياطة' || c === 'مستهلكات خياطة' || c === 'مستهلكات' || c.includes('مستهلك') || c.includes('خياطة');
};

export const sewingConsumablesNumber = sequence => `CON-${String(sequence).padStart(5, '0')}`;

export const sewingConsumablesSequence = value => /^CON-\d+$/.test(String(value || '')) ? Number(value.slice(4)) : 0;

// One logical sewing consumable keeps its number across warehouses and specifications.
export function planSewingConsumablesNumbers(stock) {
  const groups = new Map();
  for (const item of stock.filter(row => isSewingConsumablesCategory(row.category) || (row.itemNumber && String(row.itemNumber).startsWith('CON-')))) {
    const name = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!name) throw new Error('يوجد صنف مستهلكات دون اسم؛ يجب تصحيحه قبل إعادة الترقيم');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const names = [...groups.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));
  const oldOwners = new Map();
  const targets = new Set(names.map((_, index) => sewingConsumablesNumber(index + 1)));

  for (const item of stock) {
    if (!isSewingConsumablesCategory(item.category) && !String(item.itemNumber || '').startsWith('CON-') && targets.has(item.itemNumber)) {
      throw new Error(`الرقم ${item.itemNumber} مستخدم خارج تصنيف مستهلكات الخياطة`);
    }
  }

  return names.map((name, index) => {
    const items = groups.get(name);
    for (const item of items) {
      if (item.itemNumber) {
        oldOwners.set(item.itemNumber, name);
      }
    }
    return {
      name,
      itemNumber: sewingConsumablesNumber(index + 1),
      oldNumbers: [...new Set(items.map(item => item.itemNumber).filter(Boolean))],
      documentIds: items.map(item => item.id)
    };
  });
}
