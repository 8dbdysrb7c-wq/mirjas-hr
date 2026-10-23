import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log("=== فحص وتحليل إعادة ترقيم البضاعة الجاهزة ===");

  const stockSnap = await getDocs(collection(db, 'stock'));
  const allStock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgStock = allStock.filter(i => 
    isFGCategory(i.category) || (i.itemNumber && i.itemNumber.startsWith('FG-'))
  );

  console.log(`إجمالي عناصر المخزون: ${allStock.length}`);
  console.log(`سجلات البضاعة الجاهزة: ${fgStock.length}`);

  // Group by clean trimmed name
  const groupedByName = new Map();
  for (const item of fgStock) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) {
      console.warn(`تحذير: يوجد سجل بدون اسم! ID: ${item.id}`);
      continue;
    }
    if (!groupedByName.has(cleanName)) {
      groupedByName.set(cleanName, []);
    }
    groupedByName.get(cleanName).push(item);
  }

  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const sortedNames = [...groupedByName.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));

  console.log(`\nعدد الأصناف الفريدة: ${sortedNames.length}`);
  console.log("--- عينة من الترتيب الأبجدي والأرقام الجديدة ---");

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
    if (idx < 20 || idx >= sortedNames.length - 10) {
      const oldList = [...new Set(items.map(i => i.itemNumber))].join(', ');
      console.log(`[${idx + 1}] ${newSku} | القديم: [${oldList}] | "${name}" (${items.length} سجلات)`);
    } else if (idx === 20) {
      console.log(`... تم تخطي ${sortedNames.length - 30} صنف في العرض ...`);
    }
  });

  // Check references in stock_vouchers
  const vouchersSnap = await getDocs(collection(db, 'stock_vouchers'));
  let voucherMatchCount = 0;
  vouchersSnap.forEach(d => {
    const data = d.data();
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const vName = String(item.name || '').replace(/\s+/g, ' ').trim();
        if (nameToNewSku.has(vName)) {
          voucherMatchCount++;
          break;
        }
      }
    }
  });
  console.log(`\nسندات المخزون المتأثرة: ${voucherMatchCount} سند`);

  // Check product_costings
  const costingsSnap = await getDocs(collection(db, 'product_costings'));
  let costingMatchCount = 0;
  costingsSnap.forEach(d => {
    const data = d.data();
    const cName = String(data.productName || '').replace(/\s+/g, ' ').trim();
    if (nameToNewSku.has(cName) || (data.stockItemNumber && oldSkuToNewSku.has(data.stockItemNumber))) {
      costingMatchCount++;
    }
  });
  console.log(`بطاقات تكلفة المنتجات المتأثرة: ${costingMatchCount}`);

  // Check barcodes
  const barcodesSnap = await getDocs(collection(db, 'barcodes'));
  let barcodeMatchCount = 0;
  barcodesSnap.forEach(d => {
    const data = d.data();
    const bName = String(data.name || data.productName || '').replace(/\s+/g, ' ').trim();
    if (nameToNewSku.has(bName) || (data.itemNumber && oldSkuToNewSku.has(data.itemNumber))) {
      barcodeMatchCount++;
    }
  });
  console.log(`الباركودات المتأثرة: ${barcodeMatchCount}`);

  // Check orders
  const ordersSnap = await getDocs(collection(db, 'orders'));
  let ordersMatchCount = 0;
  ordersSnap.forEach(d => {
    const data = d.data();
    const oName = String(data.productName || data.name || '').replace(/\s+/g, ' ').trim();
    if (nameToNewSku.has(oName) || (data.itemNumber && oldSkuToNewSku.has(data.itemNumber))) {
      ordersMatchCount++;
    }
  });
  console.log(`أوامر الإنتاج المتأثرة: ${ordersMatchCount}`);

  // Check sales_orders
  const salesSnap = await getDocs(collection(db, 'sales_orders'));
  let salesMatchCount = 0;
  salesSnap.forEach(d => {
    const data = d.data();
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const sName = String(item.name || item.productName || '').replace(/\s+/g, ' ').trim();
        if (nameToNewSku.has(sName) || (item.itemNumber && oldSkuToNewSku.has(item.itemNumber))) {
          salesMatchCount++;
          break;
        }
      }
    }
  });
  console.log(`طلبات البيع المتأثرة: ${salesMatchCount}`);

  process.exit(0);
}

main().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
