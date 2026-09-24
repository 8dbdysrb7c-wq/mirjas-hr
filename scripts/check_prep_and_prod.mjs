import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  const prepSnap = await getDocs(collection(db, 'preparation_orders'));
  console.log(`Found ${prepSnap.size} in preparation_orders:`);
  prepSnap.forEach(d => console.log(d.id, d.data().orderNumber, d.data().status));

  const prodSnap = await getDocs(collection(db, 'orders'));
  console.log(`Found ${prodSnap.size} in orders (production):`);
  prodSnap.forEach(d => console.log(d.id, d.data().orderNumber, d.data().status));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
