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

async function reorder() {
  console.log("Fetching stock items...");
  const snap = await getDocs(collection(db, 'stock'));
  
  const items = [];
  snap.forEach(d => {
    items.push({ id: d.id, data: d.data() });
  });

  console.log(`Found ${items.length} items. Sorting alphabetically by name...`);
  // Sort by name alphabetically (Arabic friendly)
  items.sort((a, b) => {
    const nameA = a.data.name || '';
    const nameB = b.data.name || '';
    return nameA.localeCompare(nameB, 'ar');
  });

  console.log("Updating items...");
  // Update itemNumbers
  let counter = 1;
  for (const item of items) {
    const newId = `SKU-${String(counter).padStart(4, '0')}`;
    if (item.data.itemNumber !== newId) {
      item.data.itemNumber = newId;
      await setDoc(doc(db, 'stock', item.id), item.data);
      console.log(`Updated stock item '${item.data.name}' to ${newId}`);
    }
    counter++;
  }
  
  console.log("Done");
  process.exit(0);
}
reorder();
