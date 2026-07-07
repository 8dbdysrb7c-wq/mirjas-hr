import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Fetching stock...");
  const querySnapshot = await getDocs(collection(db, 'stock'));
  const stock = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

  console.log(`Found ${stock.length} items.`);

  const targets = [];
  for (let i = 39; i <= 45; i++) {
    targets.push(`AST-${String(i).padStart(5, '0')}`);
  }

  const itemsToUpdate = stock.filter(item => targets.includes(item.itemNumber));
  console.log(`Found ${itemsToUpdate.length} items to update.`);

  // Find max CON ID to start assigning new IDs
  const conItems = stock.filter(item => item.itemNumber && item.itemNumber.startsWith('CON-'));
  const ids = conItems.map(item => {
    const parts = item.itemNumber.split('-');
    return parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
  });
  let nextConId = Math.max(0, ...ids) + 1;

  for (const item of itemsToUpdate) {
    const oldCode = item.itemNumber;
    const newCode = `CON-${String(nextConId).padStart(5, '0')}`;
    console.log(`Updating ${oldCode} to ${newCode}...`);
    
    item.itemNumber = newCode;
    item.category = 'مستهلكات الخياطة';
    
    await setDoc(doc(db, 'stock', item.id), item);
    nextConId++;
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch(console.error);
