import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  console.log("=== التحقق النهائي من ترقيم البضاعة الجاهزة ===");

  // 1. Check stock_sequences/FG
  const seqSnap = await getDoc(doc(db, 'stock_sequences', 'FG'));
  console.log("stock_sequences/FG doc:", seqSnap.exists() ? seqSnap.data() : "NOT FOUND!");

  // 2. Check stock
  const stockSnap = await getDocs(collection(db, 'stock'));
  const allStock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgStock = allStock.filter(i => isFGCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('FG-')));

  console.log(`إجمالي سجلات البضاعة الجاهزة: ${fgStock.length}`);

  const nameToSku = new Map();
  const skuToNames = new Map();
  const duplicateIssues = [];

  for (const item of fgStock) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    const sku = item.itemNumber;

    if (!sku || !sku.startsWith('FG-')) {
      duplicateIssues.push(`الصنف '${cleanName}' [${item.id}] ليس له رقم FG صالح: '${sku}'`);
      continue;
    }

    if (nameToSku.has(cleanName) && nameToSku.get(cleanName) !== sku) {
      duplicateIssues.push(`تعارض: الصنف '${cleanName}' له رقمان مختلفان: ${nameToSku.get(cleanName)} و ${sku}`);
    }
    nameToSku.set(cleanName, sku);

    if (!skuToNames.has(sku)) skuToNames.set(sku, new Set());
    skuToNames.get(sku).add(cleanName);
  }

  for (const [sku, names] of skuToNames.entries()) {
    if (names.size > 1) {
      duplicateIssues.push(`تعارض: الرقم ${sku} مشترك بين أسماء مختلفة: ${[...names].join(' | ')}`);
    }
  }

  console.log(`عدد الأصناف الفريدة: ${nameToSku.size}`);
  console.log(`عدد أرقام FG الفريدة المستخدمة: ${skuToNames.size}`);

  if (duplicateIssues.length === 0) {
    console.log("✔ نجاح تام: لا توجد أي تكرارات أو تعارضات في أرقام أصناف البضاعة الجاهزة!");
  } else {
    console.error("✖ تم العثور على مشاكل:", duplicateIssues);
  }

  // Check first and last 5 items
  const sortedNames = [...nameToSku.keys()].sort((a, b) => {
    const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
    return collator.compare(a, b) || a.localeCompare(b, 'ar');
  });

  console.log("\nأول 5 أصناف حسب الترتيب الأبجدي:");
  sortedNames.slice(0, 5).forEach((n, idx) => {
    console.log(`  [${idx + 1}] ${nameToSku.get(n)} : ${n}`);
  });

  console.log("\nآخر 5 أصناف حسب الترتيب الأبجدي:");
  sortedNames.slice(-5).forEach((n, idx) => {
    console.log(`  [${sortedNames.length - 5 + idx + 1}] ${nameToSku.get(n)} : ${n}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
