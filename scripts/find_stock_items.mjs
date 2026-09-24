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
  const matches = snap.docs.filter(d => {
    const n = d.data().name || '';
    return n.includes('رويال') || n.includes('ساند') || n.includes('فندقية');
  });
  matches.forEach(d => console.log(d.id, { name: d.data().name, spec: d.data().spec, category: d.data().category, quantity: d.data().quantity }));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
