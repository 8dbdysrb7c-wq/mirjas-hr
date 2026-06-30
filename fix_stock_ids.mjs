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

async function fix() {
  const snap = await getDocs(collection(db, 'stock'));
  
  const items = [];
  snap.forEach(d => {
    items.push({ id: d.id, data: d.data() });
  });

  let maxNum = 0;
  for (const item of items) {
    let currentId = item.data.itemNumber;
    let num = 0;
    if (currentId) {
      const match = String(currentId).match(/\d+/);
      if (match) {
        num = parseInt(match[0], 10);
      }
    }
    
    if (num > maxNum) maxNum = num;
  }

  // Find items that don't have SKU-XXXX format
  for (const item of items) {
    let currentId = item.data.itemNumber || '';
    if (!currentId.match(/^SKU-\d{4}$/)) {
      // If it has a number, format it correctly
      const match = currentId.match(/\d+/);
      let newId;
      if (match) {
        newId = `SKU-${String(match[0]).padStart(4, '0')}`;
      } else {
        maxNum++;
        newId = `SKU-${String(maxNum).padStart(4, '0')}`;
      }
      
      item.data.itemNumber = newId;
      await setDoc(doc(db, 'stock', item.id), item.data);
      console.log(`Updated stock item ${item.id} from ${currentId} to ${newId}`);
    }
  }
  
  console.log("Done");
  process.exit(0);
}
fix();
