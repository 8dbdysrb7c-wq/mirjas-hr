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
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Users count: ${usersSnap.size}`);
  usersSnap.forEach(u => {
    console.log(u.id, u.data().name, u.data().username, u.data().employeeId);
  });

  const empSnap = await getDocs(collection(db, 'employees'));
  const emad = empSnap.docs.find(d => (d.data().name || '').includes('عماد'));
  if (emad) {
    const d = emad.data();
    console.log("\nEmad in employees:");
    console.log("ID:", emad.id);
    console.log("Name:", d.name);
    console.log("sales perm:", d.permissions?.sales);
    console.log("orders perm:", d.permissions?.orders);
    console.log("sales section:", JSON.stringify(d.accessPolicy?.sections?.sales, null, 2));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
