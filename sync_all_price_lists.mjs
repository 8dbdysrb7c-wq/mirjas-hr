import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalize = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');

const aliases = {
  'شرشف مطاط بيبي 70*140سم': 'شرشف مطاط مايكروفايبر بيبي 70*140سم',
  'شرشف مطاط بيبي 70*140': 'شرشف مطاط مايكروفايبر بيبي 70*140سم',
  'شرشف مطاط قطن 300 خيط أبيض سترايب عريض': 'شرشف مطاط قطن 300خيط 200*200سم',
  'طقم وجه لحاف قطن 400خيط 240*260سم': 'طقم وجه لحاف قطن 400خيط 240*260سم - 4 قطع',
  'طقم وجه لحاف قطن 300خيط 160*220سم': 'طقم وجه لحاف قطن 300خيط 160*220سم - 3 قطع',
  'طقم وجه لحاف قطن 300خيط 220*240سم': 'طقم وجه لحاف قطن 300خيط 220*240سم - 4 قطع',
  'طقم وجه لحاف مايكروفايبر 240*260سم': 'طقم وجه لحاف مايكروفايبر 240*260سم - 4 قطع',
  'وجه لحاف مايكروفايبر 240*220': 'وجه لحاف مايكروفايبر 220*240سم',
  'لحاف بريم تركي 220*260 سم': 'لحاف بريم تركي 220*240 سم',
  'شرشف مطاط قطن 400 خيط 80*180*20': 'شرشف مطاط قطن 400 خيط 90*190*20',
  'فرشه بيبي 70*40*8': 'فرشة بيبي 70*140*8سم',
  'فرشه بيبي 70*130*10': 'فرشة بيبي 70*130*10سم',
  'شرشف مطاط مايكروفايبر معرق مفرد': 'شرشف مطاط مايكروفايبر 100*200*30سم',
  'طقم شرشف مطاط 400خيط 220*240 سم': 'طقم شرشف مطاط قطن 400خيط 200*200سم',
  'اسفنج فرشة طوي': 'فرشة قابلة للطي 80*185*8سم',
  'وجه فرشة طوي': 'فرشة قابلة للطي 80*185*8سم'
};

async function syncAllPriceLists() {
  console.log("=== بدء تدقيق ومطابقة وتحديث قوائم الأسعار الرئيسية والتفصيلية ===");

  const [masterSnap, stockSnap, priceListsSnap, costingsSnap] = await Promise.all([
    getDocs(collection(db, 'masterProducts')),
    getDocs(collection(db, 'stock')),
    getDocs(collection(db, 'priceLists')),
    getDocs(collection(db, 'product_costings'))
  ]);

  const masters = masterSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const priceLists = priceListsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const costings = costingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgStock = stock.filter(s => s.category === 'بضاعة جاهزة' || (s.itemNumber && s.itemNumber.startsWith('FG-')));

  const fgStockByName = new Map();
  const allStockByName = new Map();

  stock.forEach(s => {
    const clean = normalize(s.name);
    if (!clean) return;
    if (!allStockByName.has(clean)) allStockByName.set(clean, s);
    if (s.category === 'بضاعة جاهزة' || (s.itemNumber && s.itemNumber.startsWith('FG-'))) {
      if (!fgStockByName.has(clean)) fgStockByName.set(clean, s);
    }
  });

  console.log(`- إجمالي أصناف البضاعة الجاهزة في المخزون: ${fgStockByName.size}`);
  console.log(`- إجمالي بطاقات masterProducts الحالية: ${masters.length}`);
  console.log(`- إجمالي قوائم الأسعار priceLists: ${priceLists.length}`);

  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`تم تنفيذ دفعة Firestore (${opCount} عملية).`);
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  const addOp = async () => {
    opCount++;
    if (opCount >= 400) await commitBatch();
  };

  // 1. Process masterProducts
  // We want masterProducts to align 1-to-1 with fgStock items without stale/deleted/duplicate items.
  const stockHandled = new Set();
  let updatedMastersCount = 0;
  let deletedMastersCount = 0;

  for (const m of masters) {
    let rawName = m.name || '';
    let cleanName = normalize(rawName);

    if (aliases[cleanName]) {
      cleanName = normalize(aliases[cleanName]);
    }

    let matchedStock = fgStockByName.get(cleanName);

    // Try splitting ' - ' for color/variant
    if (!matchedStock && cleanName.includes(' - ')) {
      const base = cleanName.split(' - ')[0].trim();
      matchedStock = fgStockByName.get(base);
    }

    // Try partial match
    if (!matchedStock) {
      for (const [sName, sItem] of fgStockByName.entries()) {
        if (sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName)) {
          matchedStock = sItem;
          break;
        }
      }
    }

    // Check if it's a non-FG stock item (like PKG- "كرتونة ...")
    const nonFgMatch = allStockByName.get(cleanName);
    const isNonFg = nonFgMatch && nonFgMatch.category !== 'بضاعة جاهزة';

    if (isNonFg || (!matchedStock && (rawName.startsWith('كرتونة') || rawName.startsWith('كيس') || rawName.startsWith('ليبل')))) {
      // Obsolete / packaging item in masterProducts -> delete
      console.log(`حذف صنف غير بضاعة جاهزة من masterProducts: "${rawName}" (${m.itemNumber || '-'})`);
      batch.delete(doc(db, 'masterProducts', m.id));
      await addOp();
      deletedMastersCount++;
      continue;
    }

    if (matchedStock) {
      const targetSku = matchedStock.itemNumber;
      const targetName = matchedStock.name;
      const targetUnit = matchedStock.unit || m.unit || 'قطعة';

      // Check if we already have a masterProduct document for this stock item
      if (stockHandled.has(targetSku)) {
        // Duplicate master document -> delete duplicate
        console.log(`حذف تكرار لـ masterProducts: "${rawName}" -> ${targetSku}`);
        batch.delete(doc(db, 'masterProducts', m.id));
        await addOp();
        deletedMastersCount++;
        continue;
      }

      stockHandled.add(targetSku);

      // Check if document needs update
      let changed = false;
      const updateData = {};

      if (m.name !== targetName) {
        updateData.name = targetName;
        changed = true;
      }
      if (m.itemNumber !== targetSku) {
        updateData.itemNumber = targetSku;
        changed = true;
      }
      if (m.unit !== targetUnit) {
        updateData.unit = targetUnit;
        changed = true;
      }
      if (m.category !== 'بضاعة جاهزة') {
        updateData.category = 'بضاعة جاهزة';
        changed = true;
      }

      if (changed) {
        updateData.updatedAt = new Date().toISOString();
        batch.update(doc(db, 'masterProducts', m.id), updateData);
        await addOp();
        updatedMastersCount++;
      }
    } else {
      console.log(`صنف متبقي غير موجود في المخزون: "${rawName}" (${m.itemNumber})`);
      // If it has an old FG number not in stock, remove it so ghost items disappear
      batch.delete(doc(db, 'masterProducts', m.id));
      await addOp();
      deletedMastersCount++;
    }
  }

  // 2. Process customer priceLists items
  let updatedPriceListsCount = 0;
  for (const pl of priceLists) {
    if (!Array.isArray(pl.items) || pl.items.length === 0) continue;

    let plChanged = false;
    const updatedItems = pl.items.map(item => {
      let rawName = item.name || '';
      let cleanName = normalize(rawName);
      if (aliases[cleanName]) cleanName = normalize(aliases[cleanName]);

      let matchedStock = fgStockByName.get(cleanName);
      if (!matchedStock && cleanName.includes(' - ')) {
        const base = cleanName.split(' - ')[0].trim();
        matchedStock = fgStockByName.get(base);
      }
      if (!matchedStock) {
        for (const [sName, sItem] of fgStockByName.entries()) {
          if (sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName)) {
            matchedStock = sItem;
            break;
          }
        }
      }

      if (matchedStock) {
        let itemChanged = false;
        const newItem = { ...item };
        if (newItem.itemNumber !== matchedStock.itemNumber) {
          newItem.itemNumber = matchedStock.itemNumber;
          itemChanged = true;
        }
        if (newItem.name !== matchedStock.name) {
          newItem.name = matchedStock.name;
          itemChanged = true;
        }
        if (itemChanged) plChanged = true;
        return newItem;
      }
      return item;
    });

    if (plChanged) {
      batch.update(doc(db, 'priceLists', pl.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      await addOp();
      updatedPriceListsCount++;
    }
  }

  await commitBatch();

  console.log(`\n========================================`);
  console.log(`=== اكتمال تدقيق وتحديث وتصفية قوائم الأسعار ===`);
  console.log(`- masterProducts المحدثة: ${updatedMastersCount}`);
  console.log(`- masterProducts المحذوفة/المكررة/المنظفة: ${deletedMastersCount}`);
  console.log(`- priceLists المحدثة: ${updatedPriceListsCount}`);
  console.log(`========================================`);

  process.exit(0);
}

syncAllPriceLists().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
