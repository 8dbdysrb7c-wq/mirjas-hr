// Comparison keys are for validation only; saved specifications remain unchanged.
export const stockColorKey = value => String(value ?? '').normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/\s+/g, '').toLowerCase();

export const compareStockColors = (a, b) => {
  const rank = value => /^موديل\s*\d/.test(String(value).trim()) ? 0 : /^B\d+$/i.test(String(value).trim()) ? 2 : 1;
  return rank(a) - rank(b) || String(a).localeCompare(String(b), 'ar', { numeric: true, sensitivity: 'base' });
};

export const stockColorOptions = (colors = [], current = '') =>
  [...new Set([...colors, current].filter(value => typeof value === 'string' && value.trim()))].sort(compareStockColors);

// Previous catalog plus specifications already used by inventory.
export const DEFAULT_STOCK_COLORS = [
    "موديل 1 أبيض سادة",
    "موديل 2 أبيض سترايب",
    "موديل 3 سكري سادة",
    "موديل 5 بيج سادة",
    "موديل 7 بيج سترايب",
    "موديل 14 سومو سادة",
    "موديل 18 سكني سادة",
    "موديل 19 سكني سترايب",
    "موديل 25 قطن باكستاني ابيض سادة",
    "موديل 26 قطن باكستاني ابيض سترايب عريض",
    "موديل 27 واقي تنسل",
    "أبيض",
    "أخضر",
    "أزرق",
    "ازرق",
    "أسود",
    "أصفر",
    "اوفوايت",
    "بترولي",
    "برتقالي",
    "بنفسجي",
    "بني",
    "بيج",
    "تركواز",
    "جنزاري",
    "خردلي",
    "خمري",
    "زهري",
    "زيتي",
    "سكري",
    "سكني",
    "سكني غامق",
    "سكني فاتح",
    "سومو",
    "عسلي",
    "عنابي",
    "فوشي",
    "قطن صيني أبيض",
    "قطن صيني بصلي",
    "قطن صيني سكري",
    "قطن صيني سكني",
    "كبتشينو",
    "كحلي",
    "ليلكي",
    "مشكل ألوان",
    "مورد",
    "موف",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B9",
    "B10",
    "B11",
    "B12",
    "B13",
    "B14",
    "B15",
    "B16",
    "B17"
];
