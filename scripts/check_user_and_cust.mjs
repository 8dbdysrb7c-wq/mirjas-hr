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
  const custSnap = await getDocs(collection(db, 'customers'));
  const targetCust = custSnap.docs.find(d => (d.data().name || '').includes('مخازن المدينة'));
  console.log("Customer:", targetCust ? { id: targetCust.id, ...targetCust.data() } : "NOT FOUND");

  const usersSnap = await getDocs(collection(db, 'users'));
  const emadUser = usersSnap.docs.find(d => (d.data().name || '').includes('عماد') || d.id === 'EMP0265' || d.data().employeeId === 'EMP0265');
  console.log("Emad user:", emadUser ? { id: emadUser.id, ...emadUser.data() } : "NOT FOUND");

  const empSnap = await getDocs(collection(db, 'employees'));
  const emadEmp = empSnap.docs.find(d => (d.data().name || '').includes('عماد') || d.id === 'EMP0265' || d.data().employeeId === 'EMP0265');
  console.log("Emad employee:", emadEmp ? { id: emadEmp.id, ...emadEmp.data() } : "NOT FOUND");

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
