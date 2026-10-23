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

const isPkgCategory = (cat) => {
  const c = String(cat || '').trim();
  return /^(?:ال)?تغليف$/.test(c) || c.includes('تغليف') || c.includes('كرتون');
};

async function main() {
  const snap = await getDocs(collection(db, 'stock'));
  const allStock = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const pkgItems = allStock.filter(i => 
    isPkgCategory(i.category) || (i.itemNumber && String(i.itemNumber).startsWith('PKG-'))
  );

  console.log(`Total stock items: ${allStock.length}`);
  console.log(`Packaging items matching category or PKG-: ${pkgItems.length}`);

  // Group by clean trimmed name
  const grouped = new Map();
  for (const item of pkgItems) {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) continue;
    if (!grouped.has(cleanName)) {
      grouped.set(cleanName, []);
    }
    grouped.get(cleanName).push(item);
  }

  const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });
  const sortedNames = [...grouped.keys()].sort((a, b) => collator.compare(a, b) || a.localeCompare(b, 'ar'));

  console.log(`\nUnique packaging item names: ${sortedNames.length}`);
  console.log("\n--- الترتيب الأبجدي للأصناف ---");
  sortedNames.forEach((name, idx) => {
    const newSku = `PKG-${String(idx + 1).padStart(5, '0')}`;
    const items = grouped.get(name);
    const oldSkus = [...new Set(items.map(i => i.itemNumber))].join(', ');
    const specs = items.map(i => i.spec || 'بدون مواصفة').join(' | ');
    console.log(`${newSku} | Old: [${oldSkus}] | "${name}" (${items.length} records) [${specs}]`);
  });

  const seqSnap = await getDoc(doc(db, 'stock_sequences', 'PKG'));
  console.log("\nCurrent stock_sequences/PKG:", seqSnap.exists() ? seqSnap.data() : "NOT FOUND");

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
