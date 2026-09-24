import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const q = query(collection(db, 'stock'), where('category', 'in', ['بضاعة جاهزة', 'البضاعة الجاهزة']));
  const snap = await getDocs(q);
  console.log(`FG items in stock: ${snap.size}`);

  const activeOrdersQ = query(collection(db, 'sales_orders'), where('status', 'in', ['جديد', 'قيد التجهيز', 'قيد التنفيذ', 'جاهز', 'جاهز للتسليم للتوصيل']));
  const activeSnap = await getDocs(activeOrdersQ);
  console.log(`Active sales orders: ${activeSnap.size}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
