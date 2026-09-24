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
  const snap = await getDocs(collection(db, 'sales_orders'));
  console.log(`Found ${snap.size} sales orders:`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id} | OrderNumber: ${data.orderNumber} | Customer: ${data.customerName} | Status: "${data.status}" | Deleted: ${data.isDeleted || data.deleted || (data.status === 'محذوف')}`);
  });
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
