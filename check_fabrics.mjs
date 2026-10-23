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

  const fabricItems = allStock.filter(i => 
    i.category === 'أقمشة' || 
    (i.category && i.category.includes('قماش')) ||
    (i.itemNumber && i.itemNumber.startsWith('FAB-'))
  );

  console.log(`Total stock: ${allStock.length}`);
  console.log(`Fabric items in category 'أقمشة' or with FAB-: ${fabricItems.length}`);
  
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
  
  console.log(`\nSorted Alphabetical Order (${sortedNames.length} items):`);
  sortedNames.forEach((name, idx) => {
    const newSku = `FAB-${String(idx + 1).padStart(5, '0')}`;
    const items = grouped.get(name);
    const oldSkus = [...new Set(items.map(i => i.itemNumber))].join(', ');
    console.log(`${newSku} | Old: [${oldSkus}] | Name: "${name}" (${items.length} records)`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
