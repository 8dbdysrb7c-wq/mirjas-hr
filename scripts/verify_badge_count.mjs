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
  const salesOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const pendingSales = salesOrders.filter(o => {
    const numStr = String(o.orderNumber || '').toUpperCase();
    if (numStr.startsWith('PREP-') || numStr.startsWith('PRO-') || o.isPreparation || o.isProduction) return false;
    if (o.isDeleted || o.deleted || o.status === 'محذوف' || o.status === 'ملغي' || o.status === 'ملغى') return false;
    return o.status !== 'منتهي' && o.status !== 'تم التوصيل' && o.status !== 'تم التسليم للتوصيل' && o.status !== 'تم تسليمها للتوصيل' && o.status !== 'قيد التوصيل';
  });

  console.log(`Remaining sales orders count: ${salesOrders.length}`);
  console.log(`Pending sales orders count for badge: ${pendingSales.length}`);
  pendingSales.forEach(o => console.log(` - Order #${o.orderNumber} | Customer: ${o.customerName} | Status: ${o.status}`));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
