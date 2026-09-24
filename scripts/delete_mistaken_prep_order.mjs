import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, getDoc } from 'firebase/firestore';

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
  const docRef = doc(db, 'sales_orders', 'z1qlEkRaIyAP0cdpa15X');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("Document does not exist in sales_orders.");
    process.exit(0);
  }
  console.log("Found document in sales_orders:", snap.data().orderNumber);
  try {
    await deleteDoc(docRef);
    console.log("Successfully deleted PREP-0001 from sales_orders!");
  } catch (err) {
    console.error("Error deleting from sales_orders:", err.message);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
