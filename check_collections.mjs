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

const collectionsToCheck = [
  'stock',
  'stock_vouchers',
  'stock_sequences',
  'orders',
  'sales_orders',
  'preparation_orders',
  'price_lists',
  'master_products',
  'product_costings',
  'barcodes',
  'stocktakes',
  'assets',
  'hr_assets'
];

async function main() {
  for (const colName of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`Collection '${colName}': ${snap.size} documents`);
    } catch (e) {
      console.log(`Collection '${colName}': error/not found (${e.message})`);
    }
  }
}

main().catch(console.error);
