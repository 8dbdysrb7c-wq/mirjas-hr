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
  const snap = await getDocs(collection(db, 'stock'));
  const names = ['مخدة رويال ميموري فوم', 'مسند ساند طبي ظهر', 'مخدة طبية فندقية فخمة'];
  for (const n of names) {
    const doc = snap.docs.find(d => d.data().name?.trim() === n || `${d.data().name?.trim()} - ${d.data().spec?.trim()}` === n);
    console.log(`"${n}" -> found:`, doc ? { id: doc.id, name: doc.data().name, spec: doc.data().spec, qty: doc.data().quantity } : 'NOT FOUND');
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
