import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBw... (doesn't matter)",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:abc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, 'employees'));
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${data.id}, Name: ${data.name}, Level: ${data.level}, Role: ${data.role}`);
  });
}
check();
