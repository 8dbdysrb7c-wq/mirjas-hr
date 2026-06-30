import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function deleteAll() {
  console.log("Deleting all sales_orders...");
  const salesSnapshot = await getDocs(collection(db, "sales_orders"));
  for (const document of salesSnapshot.docs) {
    await deleteDoc(doc(db, "sales_orders", document.id));
  }
  console.log(`Deleted ${salesSnapshot.size} sales orders.`);

  console.log("Deleting all orders...");
  const ordersSnapshot = await getDocs(collection(db, "orders"));
  for (const document of ordersSnapshot.docs) {
    await deleteDoc(doc(db, "orders", document.id));
  }
  console.log(`Deleted ${ordersSnapshot.size} production orders.`);
  
  process.exit(0);
}

deleteAll();
