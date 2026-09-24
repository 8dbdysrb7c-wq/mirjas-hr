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
  const emadUser = usersSnap.docs.find(d => (d.data().name || '').includes('عماد'));
  const data = emadUser.data();
  console.log("sales perm:", data.permissions?.sales);
  console.log("orders perm:", data.permissions?.orders);
  console.log("sales section in accessPolicy:", JSON.stringify(data.accessPolicy?.sections?.sales, null, 2));
  console.log("role:", data.role);
  console.log("id:", emadUser.id);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
