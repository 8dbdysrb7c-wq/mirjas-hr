import { db } from './src/firebase.js';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

async function migrate() {
  console.log("Starting stock migration...");
  const stockRef = collection(db, 'stock');
  const snapshot = await getDocs(stockRef);
  
  if (snapshot.empty) {
    console.log("No stock items found.");
    return;
  }

  // 1. Fetch all items
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // 2. Group items by name
  const groupedByName = {};
  items.forEach(item => {
    const key = item.name ? item.name.trim() : 'Unknown';
    if (!groupedByName[key]) {
      groupedByName[key] = [];
    }
    groupedByName[key].push(item);
  });

  // 3. Sort the unique names alphabetically (Arabic)
  const sortedNames = Object.keys(groupedByName).sort((a, b) => a.localeCompare(b, 'ar'));

  // 4. Assign new SKUs
  console.log(`Found ${sortedNames.length} unique items. Updating...`);
  
  const batch = writeBatch(db);
  let skuCounter = 1;
  let totalUpdates = 0;

  for (const name of sortedNames) {
    const newSku = `SKU-${String(skuCounter).padStart(4, '0')}`;
    const itemLocations = groupedByName[name];
    
    for (const loc of itemLocations) {
      const docRef = doc(db, 'stock', loc.id);
      batch.update(docRef, { itemNumber: newSku });
      totalUpdates++;
    }
    skuCounter++;
  }

  // 5. Commit batch
  await batch.commit();
  console.log(`Migration completed successfully! Updated ${totalUpdates} documents across ${sortedNames.length} unique items.`);
  process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
