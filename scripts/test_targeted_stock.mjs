import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, where, query } from 'firebase/firestore';

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
  const testNames = ['مخدة رويال ميموري فوم', 'مسند ساند طبي ظهر', 'مخدة طبية فندقية فخمة'];
  const q = query(collection(db, 'stock'), where('name', 'in', testNames));
  const snap = await getDocs(q);
  console.log(`Targeted query returned ${snap.size} docs (instead of 596):`);
  snap.forEach(d => console.log(d.id, d.data().name, d.data().quantity));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
