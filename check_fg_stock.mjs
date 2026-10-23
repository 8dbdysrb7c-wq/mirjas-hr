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

async function main() {
  const snap = await getDocs(collection(db, 'stock'));
  const allStock = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const categories = {};
  for (const item of allStock) {
    const cat = item.category || 'بدون تصنيف';
    categories[cat] = (categories[cat] || 0) + 1;
  }
  console.log("Categories in Stock:", categories);

  const fgItems = allStock.filter(i => 
    i.category === 'بضاعة جاهزة' || 
    i.category === 'البضاعة الجاهزة' ||
    (i.category && (i.category.includes('جاهز') || i.category.includes('بضاعة'))) ||
    (i.itemNumber && i.itemNumber.startsWith('FG-'))
  );

  console.log(`\nTotal items matching FG criteria: ${fgItems.length}`);
  
  // Group by trimmed name
  const grouped = new Map();
  for (const item of fgItems) {
    const name = (item.name || '').trim();
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name).push(item);
  }

  // Sort alphabetically by Arabic locale
  const sortedNames = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, 'ar'));

  console.log(`\nUnique FG Item Names (${sortedNames.length}):`);
  sortedNames.forEach((name, idx) => {
    const newSku = `FG-${String(idx + 1).padStart(5, '0')}`;
    const items = grouped.get(name);
    const oldSkus = [...new Set(items.map(i => i.itemNumber))].join(', ');
    const cats = [...new Set(items.map(i => i.category))].join(', ');
    console.log(`${newSku} | Old: [${oldSkus}] | Cat: [${cats}] | Name: "${name}" (${items.length} records)`);
  });

  // Check sequence counters if any
  const seqSnap = await getDocs(collection(db, 'stock_sequences'));
  console.log("\nStock sequences collection docs:");
  seqSnap.forEach(d => console.log(d.id, d.data()));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
