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

const isConCategory = (cat) => {
  const c = String(cat || '').trim();
  return c === 'مستهلكات الخياطة' || c === 'مستهلكات خياطة' || c === 'مستهلكات' || c.includes('مستهلك') || c.includes('خياطة');
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

  const conItems = allStock.filter(i => 
    isConCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('CON-'))
  );

  console.log(`\nTotal sewing consumables matching category or CON-: ${conItems.length}`);

  // Group by clean trimmed name
  const grouped = new Map();
  for (const item of conItems) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) continue;
    if (!grouped.has(cleanName)) {
      grouped.set(cleanName, []);
    }
    grouped.get(cleanName).push(item);
  }

  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const sortedNames = [...grouped.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));

  console.log(`\nUnique sewing consumables item names: ${sortedNames.length}`);
  console.log("\n--- الترتيب الأبجدي للأصناف ---");
  sortedNames.forEach((name, idx) => {
    const newSku = `CON-${String(idx + 1).padStart(5, '0')}`;
    const items = grouped.get(name);
    const oldSkus = [...new Set(items.map(i => i.itemNumber))].join(', ');
    const cats = [...new Set(items.map(i => i.category))].join(', ');
    const specs = items.map(i => i.spec || 'بدون مواصفة').join(' | ');
    console.log(`${newSku} | Old: [${oldSkus}] | Cat: [${cats}] | "${name}" (${items.length} records) [${specs}]`);
  });

  const seqSnap = await getDoc(doc(db, 'stock_sequences', 'CON'));
  console.log("\nCurrent stock_sequences/CON:", seqSnap.exists() ? seqSnap.data() : "NOT FOUND");

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
