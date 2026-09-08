export const isPackagingCategory = category => /^(?:ال)?تغليف$/.test(String(category || '').trim()) || String(category || '').includes('كرتون');
export const packagingNumber = sequence => `PKG-${String(sequence).padStart(5, '0')}`;
export const packagingSequence = value => /^PKG-\d+$/.test(String(value || '')) ? Number(value.slice(4)) : 0;

// One logical item keeps its number across warehouses and specifications.
export function planPackagingNumbers(stock) {
  const groups = new Map();
  for (const item of stock.filter(row => /^(?:ال)?تغليف$/.test(String(row.category || '').trim()))) {
    const name = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!name) throw new Error('يوجد صنف تغليف دون اسم؛ يجب تصحيحه قبل إعادة الترقيم');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const names = [...groups.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));
  const oldOwners = new Map();
  const targets = new Set(names.map((_, index) => packagingNumber(index + 1)));
  for (const item of stock) {
    if (!/^(?:ال)?تغليف$/.test(String(item.category || '').trim()) && targets.has(item.itemNumber)) throw new Error(`الرقم ${item.itemNumber} مستخدم خارج تصنيف التغليف`);
  }
  return names.map((name, index) => {
    const items = groups.get(name);
    for (const item of items) {
      if (!item.itemNumber) throw new Error(`الصنف ${name} ليس له رقم سابق لمراجعة الروابط`);
      if (oldOwners.has(item.itemNumber) && oldOwners.get(item.itemNumber) !== name) throw new Error(`الرقم ${item.itemNumber} مشترك بين أصناف مختلفة ويحتاج معالجة قبل إعادة الترقيم`);
      oldOwners.set(item.itemNumber, name);
    }
    return { name, itemNumber: packagingNumber(index + 1), oldNumbers: [...new Set(items.map(item => item.itemNumber))], documentIds: items.map(item => item.id) };
  });
}
