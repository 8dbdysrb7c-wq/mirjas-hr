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

const normalize = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');

async function main() {
  console.log("=== فحص وتدقيق بطاقات التكلفة وقوائم الأسعار والمخزون ===");

  const [costingsSnap, stockSnap, masterSnap] = await Promise.all([
    getDocs(collection(db, 'product_costings')),
    getDocs(collection(db, 'stock')),
    getDocs(collection(db, 'master_products'))
  ]);

  const costings = costingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const masters = masterSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`إجمالي بطاقات التكلفة: ${costings.length}`);
  console.log(`إجمالي عناصر المخزون: ${stock.length}`);
  console.log(`إجمالي المنتجات الرئيسية: ${masters.length}`);

  // Create lookup maps from stock (finished goods)
  const stockByName = new Map();
  const stockByCode = new Map();

  stock.forEach(item => {
    if (item.category === 'بضاعة جاهزة' || (item.itemNumber && item.itemNumber.startsWith('FG-'))) {
      const cleanName = normalize(item.name);
      if (cleanName && !stockByName.has(cleanName)) {
        stockByName.set(cleanName, item);
      }
      if (item.itemNumber) {
        stockByCode.set(item.itemNumber.toUpperCase(), item);
      }
    }
  });

  console.log(`\nأصناف البضاعة الجاهزة في المخزون: ${stockByName.size} صنف فريد`);

  let matchedByName = 0;
  let matchedByCode = 0;
  let codeMismatchCount = 0;
  const mismatches = [];

  costings.forEach(c => {
    const cName = normalize(c.productName || c.name);
    const cCode = (c.productCode || c.stockItemNumber || c.code || '').toUpperCase();
    
    const matchName = stockByName.get(cName);
    const matchCode = stockByCode.get(cCode);

    if (matchName) matchedByName++;
    if (matchCode) matchedByCode++;

    if (matchName && matchName.itemNumber !== cCode) {
      codeMismatchCount++;
      mismatches.push({
        costingId: c.id,
        name: c.productName || c.name,
        costingCode: cCode,
        currentStockCode: matchName.itemNumber,
        materialsCount: (c.materials || []).length,
        costApplicability: c.costApplicability,
        finalCost: c.finalCost || c.unitCost || 0
      });
    } else if (!matchName && !matchCode) {
      console.log(`⚠ بطاقة تكلفة غير مطابقة بأي شكل: "${c.productName}" [Code: ${cCode}] ID: ${c.id}`);
    }
  });

  console.log(`\nمطابقة بالاسم: ${matchedByName} / ${costings.length}`);
  console.log(`مطابقة بالكود: ${matchedByCode} / ${costings.length}`);
  console.log(`بطاقات تكلفة تختلف فيها الأكواد السابقة عن الأكواد الحالية للمخزون: ${codeMismatchCount}`);

  console.log("\n--- عينة من البطاقات التي تحتاج تحديث ومطابقة الكود ---");
  mismatches.slice(0, 15).forEach((m, idx) => {
    console.log(`[${idx + 1}] "${m.name}" | كود التكلفة: ${m.costingCode || '(فارغ)'} -> كود المخزون الحالي: ${m.currentStockCode}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
