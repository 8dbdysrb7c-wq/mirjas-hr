import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

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

async function main() {
  console.log("=== بدء عملية إعادة ترقيم أصناف الأقمشة ===");
  
  // 1. Fetch stock
  const snap = await getDocs(collection(db, 'stock'));
  const allStock = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fabricItems = allStock.filter(i => 
    i.category === 'أقمشة' || 
    (i.category && i.category.includes('قماش')) ||
    (i.itemNumber && i.itemNumber.startsWith('FAB-'))
  );

  console.log(`تم العثور على ${fabricItems.length} سجل في قاعدة البيانات يتبع للأقمشة.`);

  // Group by trimmed name
  const grouped = new Map();
  for (const item of fabricItems) {
    const name = (item.name || '').trim();
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name).push(item);
  }

  // Sort alphabetically by name
  const sortedNames = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, 'ar'));
  
  console.log(`\nتم الترتيب الأبجدي لـ ${sortedNames.length} صنف فريد:`);
  
  const nameToNewSku = new Map();
  const oldSkuToNewSku = new Map();

  sortedNames.forEach((name, idx) => {
    const newSku = `FAB-${String(idx + 1).padStart(5, '0')}`;
    nameToNewSku.set(name, newSku);
    const items = grouped.get(name);
    items.forEach(it => {
      if (it.itemNumber && it.itemNumber !== newSku) {
        oldSkuToNewSku.set(it.itemNumber, newSku);
      }
    });
    console.log(`${newSku} : ${name} (${items.length} سجلات)`);
  });

  console.log("\nخريطة التحويل للأرقام السابقة:");
  for (const [oldSku, newSku] of oldSkuToNewSku.entries()) {
    console.log(`  ${oldSku} -> ${newSku}`);
  }

  // Prepare batch update
  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`تم تنفيذ دفعة عمليات (${opCount} عمليات).`);
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

  // 1. Update stock documents
  console.log("\nجاري تحديث سجلات المخزون (stock)...");
  let updatedStockCount = 0;
  for (const [name, items] of grouped.entries()) {
    const newSku = nameToNewSku.get(name);
    for (const item of items) {
      const cleanName = name; // trimmed name
      if (item.itemNumber !== newSku || item.name !== cleanName) {
        const ref = doc(db, 'stock', item.id);
        batch.update(ref, {
          itemNumber: newSku,
          name: cleanName
        });
        await addOp();
        updatedStockCount++;
        console.log(`تحديث صنف '${cleanName}' [${item.id}] من ${item.itemNumber} إلى ${newSku}`);
      }
    }
  }

  // 2. Update stock_vouchers
  console.log("\nجاري فحص وتحديث سندات المخزون (stock_vouchers)...");
  const vouchersSnap = await getDocs(collection(db, 'stock_vouchers'));
  let updatedVouchersCount = 0;

  for (const d of vouchersSnap.docs) {
    const data = d.data();
    if (Array.isArray(data.items)) {
      let changed = false;
      const updatedItems = data.items.map(vItem => {
        const vName = (vItem.name || '').trim();
        // Check if item matches by name
        if (nameToNewSku.has(vName)) {
          const expectedSku = nameToNewSku.get(vName);
          if (vItem.itemNumber !== expectedSku) {
            changed = true;
            return { ...vItem, itemNumber: expectedSku, name: vName };
          }
        }
        return vItem;
      });

      if (changed) {
        batch.update(doc(db, 'stock_vouchers', d.id), { items: updatedItems });
        await addOp();
        updatedVouchersCount++;
        console.log(`تحديث سند رقم ${data.voucherNumber || d.id}`);
      }
    }
  }

  // Commit remaining
  await commitBatch();

  console.log(`\n=== اكتملت العملية بنجاح! ===`);
  console.log(`- تم تحديث ${updatedStockCount} سجل مخزون.`);
  console.log(`- تم تحديث ${updatedVouchersCount} سند مخزني.`);
  process.exit(0);
}

main().catch(err => {
  console.error("خطأ أثناء التنفيذ:", err);
  process.exit(1);
});
