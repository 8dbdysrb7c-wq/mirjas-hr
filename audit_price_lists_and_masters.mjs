import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, deleteDoc } from 'firebase/firestore';

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

async function check() {
  const [masterSnap, stockSnap, priceListsSnap, costingsSnap] = await Promise.all([
    getDocs(collection(db, 'masterProducts')),
    getDocs(collection(db, 'stock')),
    getDocs(collection(db, 'priceLists')),
    getDocs(collection(db, 'product_costings'))
  ]);

  const masters = masterSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const priceLists = priceListsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const costings = costingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`masterProducts count: ${masters.length}`);
  console.log(`stock count: ${stock.length}`);
  console.log(`priceLists count: ${priceLists.length}`);
  console.log(`product_costings count: ${costings.length}`);

  // Check master products items and their itemNumbers
  console.log('\n--- Sample masterProducts ---');
  masters.slice(0, 15).forEach(m => {
    console.log(`ID: ${m.id} | Name: "${m.name}" | ItemNumber: "${m.itemNumber}"`);
  });

  // Check if any masterProduct has old FG numbers
  const oldFgMasters = masters.filter(m => m.itemNumber && /FG-\d{5}/.test(m.itemNumber));
  console.log(`\nmasterProducts with FG- codes: ${oldFgMasters.length}`);
  oldFgMasters.slice(0, 20).forEach(m => {
    console.log(`  ${m.itemNumber} -> ${m.name}`);
  });

  // Check priceLists items
  console.log(`\n--- Inspecting priceLists items ---`);
  priceLists.forEach(pl => {
    console.log(`PriceList: "${pl.customerName || pl.name || pl.id}" | Items: ${(pl.items || []).length}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
