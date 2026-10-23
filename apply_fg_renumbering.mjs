import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

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

const isFGCategory = (cat) => {
  const c = String(cat || '').trim();
  return c === 'بضاعة جاهزة' || c === 'البضاعة الجاهزة' || c.includes('جاهز') || c.includes('بضاعة');
};

async function main() {
  console.log("=== بدء عملية إعادة ترقيم أصناف البضاعة الجاهزة أبجدياً ===");

  // 1. Fetch stock
  const stockSnap = await getDocs(collection(db, 'stock'));
  const allStock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgItems = allStock.filter(i => 
    isFGCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('FG-'))
  );

  console.log(`تم العثور على ${fgItems.length} سجل في المخزون يتبع للبضاعة الجاهزة.`);

  // Group by trimmed clean name
  const groupedByName = new Map();
  for (const item of fgItems) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) continue;
    if (!groupedByName.has(cleanName)) {
      groupedByName.set(cleanName, []);
    }
    groupedByName.get(cleanName).push(item);
  }

  // Sort alphabetically by Arabic collator
  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const sortedNames = [...groupedByName.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));

  console.log(`تم الترتيب الأبجدي لـ ${sortedNames.length} صنف بضاعة جاهزة فريد.`);

  const nameToNewSku = new Map();
  const oldSkuToNewSku = new Map();

  sortedNames.forEach((name, idx) => {
    const newSku = `FG-${String(idx + 1).padStart(5, '0')}`;
    nameToNewSku.set(name, newSku);
    const items = groupedByName.get(name);
    items.forEach(it => {
      if (it.itemNumber && it.itemNumber !== newSku) {
        oldSkuToNewSku.set(it.itemNumber, newSku);
      }
    });
    console.log(`${newSku} : "${name}" (${items.length} سجلات)`);
  });

  // Setup batch manager
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`تم تنفيذ دفعة تحديث (${opCount} عمليات).`);
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  const addOp = async () => {
    opCount++;
    if (opCount >= 400) {
      await commitBatch();
    }
  };

  // 1. Update Stock Items
  console.log("\n1. جاري تحديث سجلات المخزون (stock)...");
  let updatedStockCount = 0;
  for (const [name, items] of groupedByName.entries()) {
    const newSku = nameToNewSku.get(name);
    for (const item of items) {
      const cleanName = name;
      if (item.itemNumber !== newSku || item.name !== cleanName) {
        batch.update(doc(db, 'stock', item.id), {
          itemNumber: newSku,
          name: cleanName
        });
        await addOp();
        updatedStockCount++;
      }
    }
  }
  console.log(`- تم جدولة تحديث ${updatedStockCount} سجل مخزون.`);

  // 2. Set stock sequence counter in stock_sequences/FG
  console.log("\n2. جاري ضبط عداد التسلسل stock_sequences/FG...");
  batch.set(doc(db, 'stock_sequences', 'FG'), {
    lastNumber: sortedNames.length,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await addOp();
  console.log(`- تم ضبط عداد FG على: ${sortedNames.length}`);

  // 3. Update stock_vouchers
  console.log("\n3. جاري تحديث سندات المخزون (stock_vouchers)...");
  const vouchersSnap = await getDocs(collection(db, 'stock_vouchers'));
  let updatedVouchersCount = 0;

  for (const d of vouchersSnap.docs) {
    const data = d.data();
    if (Array.isArray(data.items)) {
      let changed = false;
      const updatedItems = data.items.map(vItem => {
        const vName = String(vItem.name || '').replace(/\s+/g, ' ').trim();
        let targetSku = null;
        if (nameToNewSku.has(vName)) {
          targetSku = nameToNewSku.get(vName);
        } else if (vItem.itemNumber && oldSkuToNewSku.has(vItem.itemNumber)) {
          targetSku = oldSkuToNewSku.get(vItem.itemNumber);
        }

        if (targetSku && vItem.itemNumber !== targetSku) {
          changed = true;
          return { ...vItem, itemNumber: targetSku, name: vName || vItem.name };
        }
        return vItem;
      });

      if (changed) {
        batch.update(doc(db, 'stock_vouchers', d.id), { items: updatedItems });
        await addOp();
        updatedVouchersCount++;
      }
    }
  }
  console.log(`- تم جدولة تحديث ${updatedVouchersCount} سند مخزني.`);

  // 4. Update orders (production orders)
  console.log("\n4. جاري تحديث أوامر الإنتاج (orders)...");
  const ordersSnap = await getDocs(collection(db, 'orders'));
  let updatedOrdersCount = 0;

  for (const d of ordersSnap.docs) {
    const data = d.data();
    let changed = false;
    const updateObj = {};

    const oName = String(data.productName || data.name || '').replace(/\s+/g, ' ').trim();
    if (nameToNewSku.has(oName)) {
      const targetSku = nameToNewSku.get(oName);
      if (data.itemNumber !== targetSku) {
        changed = true;
        updateObj.itemNumber = targetSku;
      }
    } else if (data.itemNumber && oldSkuToNewSku.has(data.itemNumber)) {
      changed = true;
      updateObj.itemNumber = oldSkuToNewSku.get(data.itemNumber);
    }

    // Check materials if any
    if (Array.isArray(data.materials)) {
      const updatedMats = data.materials.map(m => {
        const mName = String(m.name || '').replace(/\s+/g, ' ').trim();
        if (nameToNewSku.has(mName) && m.itemNumber !== nameToNewSku.get(mName)) {
          changed = true;
          return { ...m, itemNumber: nameToNewSku.get(mName) };
        } else if (m.itemNumber && oldSkuToNewSku.has(m.itemNumber)) {
          changed = true;
          return { ...m, itemNumber: oldSkuToNewSku.get(m.itemNumber) };
        }
        return m;
      });
      if (changed) updateObj.materials = updatedMats;
    }

    if (changed) {
      batch.update(doc(db, 'orders', d.id), updateObj);
      await addOp();
      updatedOrdersCount++;
    }
  }
  console.log(`- تم جدولة تحديث ${updatedOrdersCount} أمر إنتاج.`);

  // 5. Update sales_orders
  console.log("\n5. جاري تحديث طلبات البيع (sales_orders)...");
  const salesSnap = await getDocs(collection(db, 'sales_orders'));
  let updatedSalesCount = 0;

  for (const d of salesSnap.docs) {
    const data = d.data();
    if (Array.isArray(data.items)) {
      let changed = false;
      const updatedItems = data.items.map(sItem => {
        const sName = String(sItem.name || sItem.productName || '').replace(/\s+/g, ' ').trim();
        let targetSku = null;
        if (nameToNewSku.has(sName)) {
          targetSku = nameToNewSku.get(sName);
        } else if (sItem.itemNumber && oldSkuToNewSku.has(sItem.itemNumber)) {
          targetSku = oldSkuToNewSku.get(sItem.itemNumber);
        }

        if (targetSku && sItem.itemNumber !== targetSku) {
          changed = true;
          return { ...sItem, itemNumber: targetSku };
        }
        return sItem;
      });

      if (changed) {
        batch.update(doc(db, 'sales_orders', d.id), { items: updatedItems });
        await addOp();
        updatedSalesCount++;
      }
    }
  }
  console.log(`- تم جدولة تحديث ${updatedSalesCount} طلب بيع.`);

  // 6. Update product_costings
  console.log("\n6. جاري تحديث بطاقات تكلفة المنتجات (product_costings)...");
  const costingsSnap = await getDocs(collection(db, 'product_costings'));
  let updatedCostingsCount = 0;

  for (const d of costingsSnap.docs) {
    const data = d.data();
    let changed = false;
    const updateObj = {};

    const cName = String(data.productName || '').replace(/\s+/g, ' ').trim();
    if (nameToNewSku.has(cName)) {
      const targetSku = nameToNewSku.get(cName);
      if (data.stockItemNumber !== targetSku || data.productCode !== targetSku) {
        changed = true;
        updateObj.stockItemNumber = targetSku;
        updateObj.productCode = targetSku;
      }
    } else if (data.stockItemNumber && oldSkuToNewSku.has(data.stockItemNumber)) {
      changed = true;
      const targetSku = oldSkuToNewSku.get(data.stockItemNumber);
      updateObj.stockItemNumber = targetSku;
      updateObj.productCode = targetSku;
    }

    if (changed) {
      batch.update(doc(db, 'product_costings', d.id), updateObj);
      await addOp();
      updatedCostingsCount++;
    }
  }
  console.log(`- تم جدولة تحديث ${updatedCostingsCount} بطاقة تكلفة.`);

  // 7. Update barcodes if any
  console.log("\n7. جاري فحص وتحديث الباركودات (barcodes)...");
  const barcodesSnap = await getDocs(collection(db, 'barcodes'));
  let updatedBarcodesCount = 0;

  for (const d of barcodesSnap.docs) {
    const data = d.data();
    let changed = false;
    const bName = String(data.name || data.productName || '').replace(/\s+/g, ' ').trim();
    let targetSku = null;
    if (nameToNewSku.has(bName)) {
      targetSku = nameToNewSku.get(bName);
    } else if (data.itemNumber && oldSkuToNewSku.has(data.itemNumber)) {
      targetSku = oldSkuToNewSku.get(data.itemNumber);
    }

    if (targetSku && data.itemNumber !== targetSku) {
      changed = true;
      batch.update(doc(db, 'barcodes', d.id), { itemNumber: targetSku });
      await addOp();
      updatedBarcodesCount++;
    }
  }
  console.log(`- تم جدولة تحديث ${updatedBarcodesCount} باركود.`);

  // Commit any remaining operations
  await commitBatch();

  console.log(`\n========================================`);
  console.log(`=== اكتملت عملية الترقيم والتحديث بنجاح! ===`);
  console.log(`- سجلات المخزون المحدثة: ${updatedStockCount}`);
  console.log(`- سندات المخزون المحدثة: ${updatedVouchersCount}`);
  console.log(`- أوامر الإنتاج المحدثة: ${updatedOrdersCount}`);
  console.log(`- طلبات البيع المحدثة: ${updatedSalesCount}`);
  console.log(`- بطاقات التكلفة المحدثة: ${updatedCostingsCount}`);
  console.log(`- الباركودات المحدثة: ${updatedBarcodesCount}`);
  console.log(`- عداد FG المستقبلي مثبت على: ${sortedNames.length}`);
  console.log(`========================================`);

  process.exit(0);
}

main().catch(err => {
  console.error("خطأ أثناء التنفيذ:", err);
  process.exit(1);
});
