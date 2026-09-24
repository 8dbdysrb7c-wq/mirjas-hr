import { initializeApp } from 'firebase/app';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q',
  authDomain: 'mirjaswork.firebaseapp.com',
  projectId: 'mirjaswork',
  storageBucket: 'mirjaswork.firebasestorage.app',
  messagingSenderId: '742199978686',
  appId: '1:742199978686:web:6fc97d192fa99d8dd60cef'
});

const db = getFirestore(app);
const removed = new Set([
  'مستودع إنتاج قيد الخياطة',
  'مستودع إنتاج قيد التغليف',
  'مستودع قبل الخياطة',
  'بانتظار استلام التغليف',
  'مستودع إنتاج قيد التحضير'
]);

const deleteMatching = async (collectionName, predicate) => {
  const snapshot = await getDocs(collection(db, collectionName));
  const matches = snapshot.docs.filter(entry => predicate(entry.data()));
  for (const entry of matches) await deleteDoc(doc(db, collectionName, entry.id));
  return matches.length;
};

const stockDeleted = await deleteMatching('stock', data => removed.has(data.warehouse));
const vouchersDeleted = await deleteMatching('stock_vouchers', data => removed.has(data.warehouse) || removed.has(data.destinationWarehouse));
const stocktakesDeleted = await deleteMatching('stocktakes', data => removed.has(data.warehouse));

const settingsRef = doc(db, 'settings', 'globalSettings');
const settingsSnapshot = await getDoc(settingsRef);
let settingsRemoved = 0;
if (settingsSnapshot.exists()) {
  const settings = settingsSnapshot.data();
  const warehouses = Array.isArray(settings.warehouses) ? settings.warehouses : [];
  const physicalWarehouses = warehouses.filter(warehouse => !removed.has(warehouse));
  settingsRemoved = warehouses.length - physicalWarehouses.length;
  await setDoc(settingsRef, { ...settings, warehouses: physicalWarehouses });
}

console.log(JSON.stringify({ stockDeleted, vouchersDeleted, stocktakesDeleted, settingsRemoved }));
process.exit(0);
