import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkSort() {
  const snap = await getDocs(collection(db, 'stock'));
  const stock = [];
  snap.forEach(d => stock.push(d.data()));

  const sortedStock = [...stock].sort((a, b) => {
    const aValue = a['itemNumber'] || '';
    const bValue = b['itemNumber'] || '';
    
    const strA = String(aValue).toLowerCase();
    const strB = String(bValue).toLowerCase();
    
    if (strA < strB) return -1;
    if (strA > strB) return 1;
    return 0;
  });

  const groupedStock = Object.values(sortedStock.reduce((acc, item) => {
    if (!acc[item.itemNumber]) {
      acc[item.itemNumber] = { ...item, locations: [item] };
    } else {
      acc[item.itemNumber].locations.push(item);
    }
    return acc;
  }, {}));

  console.log("First 10 items:");
  for (let i = 0; i < Math.min(10, groupedStock.length); i++) {
    console.log(i + 1, groupedStock[i].itemNumber, groupedStock[i].name);
  }
  process.exit(0);
}
checkSort();
