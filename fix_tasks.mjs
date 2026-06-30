import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  const snap = await getDocs(collection(db, 'supervisor_tasks'));
  
  // sort tasks by creation time if available or just by id to be deterministic
  const tasks = [];
  snap.forEach(d => {
    tasks.push({ id: d.id, data: d.data() });
  });

  // Try sorting by createdAt or logs timestamp if exists
  tasks.sort((a, b) => {
    const timeA = a.data.createdAt ? new Date(a.data.createdAt).getTime() : 0;
    const timeB = b.data.createdAt ? new Date(b.data.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  let maxNum = 0;
  for (const item of tasks) {
    maxNum++;
    const newId = `TSK-${String(maxNum).padStart(4, '0')}`;
    item.data.taskNumber = newId;
    await setDoc(doc(db, 'supervisor_tasks', item.id), item.data);
    console.log(`Updated task ${item.id} to ${newId}`);
  }
  console.log("Done");
  process.exit(0);
}
fix();
