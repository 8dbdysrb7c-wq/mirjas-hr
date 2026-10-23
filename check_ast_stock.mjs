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

const isAstCategory = (cat) => {
  const c = String(cat || '').trim();
  return c === 'أصول' || c === 'الأصول' || c === 'اصول' || c.includes('أصل') || c.includes('اصل');
};

async function main() {
  const snap = await getDocs(collection(db, 'stock'));
  const allStock = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const categories = {};
  allStock.forEach(i => {
    const c = i.category || 'بدون';
    categories[c] = (categories[c] || 0) + 1;
  });
  console.log("All categories in stock:", categories);

  const astItems = allStock.filter(i => 
    isAstCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('AST-'))
  );

  console.log(`\nTotal assets matching category or AST-: ${astItems.length}`);

  // Group by clean trimmed name
  const grouped = new Map();
  for (const item of astItems) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) continue;
    if (!grouped.has(cleanName)) {
      grouped.set(cleanName, []);
    }
    grouped.get(cleanName).push(item);
  }

  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const sortedNames = [...groupedByNameKeys(grouped)].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));

  function groupedByNameKeys(map) {
    return [...map.keys()];
  }

  console.log(`\nUnique assets item names: ${sortedNames.length}`);
  console.log("\n--- الترتيب الأبجدي للأصناف ---");
  sortedNames.forEach((name, idx) => {
    const newSku = `AST-${String(idx + 1).padStart(5, '0')}`;
    const items = grouped.get(name);
    const oldSkus = [...new Set(items.map(i => i.itemNumber))].join(', ');
    const cats = [...new Set(items.map(i => i.category))].join(', ');
    const specs = items.map(i => i.spec || 'بدون مواصفة').join(' | ');
    console.log(`${newSku} | Old: [${oldSkus}] | Cat: [${cats}] | "${name}" (${items.length} records) [${specs}]`);
  });

  const seqSnap = await getDoc(doc(db, 'stock_sequences', 'AST'));
  console.log("\nCurrent stock_sequences/AST:", seqSnap.exists() ? seqSnap.data() : "NOT FOUND");

  // Check hr_assets
  const hrAssetsSnap = await getDocs(collection(db, 'hr_assets'));
  console.log(`\nhr_assets count: ${hrAssetsSnap.size}`);
  hrAssetsSnap.forEach(d => {
    console.log("hr_asset doc:", d.id, JSON.stringify(d.data()));
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
