import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

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

async function check() {
  console.log("Fetching stock...");
  const querySnapshot = await getDocs(collection(db, 'stock'));
  const stock = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  
  console.log(`Found ${stock.length} items total.`);
  
  // Find everything related to 39, 40, 41, 42, 43, 44, 45 or "زردية"
  const targets = stock.filter(item => {
    if (!item.itemNumber) return false;
    if (item.itemNumber.includes('39') || item.itemNumber.includes('40') || 
        item.itemNumber.includes('41') || item.itemNumber.includes('42') ||
        item.itemNumber.includes('43') || item.itemNumber.includes('44') ||
        item.itemNumber.includes('45')) return true;
    if (item.name && (item.name.includes('زردية') || item.name.includes('مفك') || item.name.includes('مقص'))) return true;
    return false;
  });

  console.log("Found matches:");
  for (const t of targets) {
     console.log(`ID: ${t.id}, itemNumber: ${t.itemNumber}, name: ${t.name}, category: ${t.category}`);
  }

  // FORCE FIX: Find AST items with 39-45 even with different zero padding
  const itemsToUpdate = stock.filter(item => {
    if (!item.itemNumber) return false;
    const match = item.itemNumber.match(/^(AST|SKU)-0*([3-4][0-9])$/);
    if (match) {
      const num = parseInt(match[2], 10);
      return num >= 39 && num <= 45;
    }
    return false;
  });

  console.log(`Found ${itemsToUpdate.length} items to update exactly!`);

  if (itemsToUpdate.length > 0) {
    const conItems = stock.filter(item => item.itemNumber && item.itemNumber.startsWith('CON-'));
    let nextConId = Math.max(0, ...conItems.map(i => {
       const parts = i.itemNumber.split('-');
       return parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
    })) + 1;

    for (const item of itemsToUpdate) {
      const old = item.itemNumber;
      const newCode = `CON-${String(nextConId).padStart(5, '0')}`;
      item.itemNumber = newCode;
      item.category = 'مستهلكات الخياطة';
      console.log(`Updating ${old} to ${newCode}`);
      await setDoc(doc(db, 'stock', item.id), item);
      nextConId++;
    }
    console.log("Migration applied.");
  }
  
  process.exit(0);
}

check().catch(console.error);
