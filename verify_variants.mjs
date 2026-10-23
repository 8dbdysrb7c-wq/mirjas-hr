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
  const stockSnap = await getDocs(collection(db, 'stock'));
  const allStock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgStock = allStock.filter(i => isFGCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('FG-')));

  const grouped = new Map();
  for (const item of fgStock) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!grouped.has(cleanName)) grouped.set(cleanName, []);
    grouped.get(cleanName).push(item);
  }

  console.log("=== فحص الأصناف التي لها عدة ألوان ومواصفات ===");
  let multiVariantCount = 0;
  let allVariantItemNumbersUnified = true;

  for (const [name, items] of grouped.entries()) {
    if (items.length > 1) {
      multiVariantCount++;
      const skus = [...new Set(items.map(i => i.itemNumber))];
      const colors = items.map(i => `${i.spec || 'بدون لون'} (مخزن: ${i.warehouse || '-'})`).join(' ، ');
      
      if (skus.length !== 1) {
        allVariantItemNumbersUnified = false;
        console.error(`❌ خطأ: الصنف "${name}" له أرقام متعددة: ${skus.join(', ')}`);
      } else {
        if (multiVariantCount <= 15) {
          console.log(`✔ [${skus[0]}] "${name}" (${items.length} ألوان/سجلات): ${colors}`);
        }
      }
    }
  }

  console.log(`\nإجمالي الأصناف التي تحتوي على ألوان/مستودعات متعددة: ${multiVariantCount}`);
  if (allVariantItemNumbersUnified) {
    console.log("✔ تأكيد 100%: جميع الأصناف ذات الألوان والمواصفات المتعددة تشترك في نفس رقم الصنف تماماً وبدون أي اختلاف!");
  } else {
    console.error("❌ توجد أصناف تحتاج توحيد!");
  }

  process.exit(0);
}

main().catch(console.error);
