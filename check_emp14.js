import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
  console.log("Fetching leaves...");
  const leavesSnap = await getDocs(collection(db, 'hr_leaves'));
  const leaves = leavesSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  
  const empLeaves = leaves.filter(l => l.employeeId === 'EMP-0014');
  console.log("EMP-0014 LEAVES:", JSON.stringify(empLeaves, null, 2));

  console.log("Fetching attendance...");
  const attSnap = await getDocs(collection(db, 'hr_attendance'));
  const atts = attSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  
  const empAtts = atts.filter(a => a.employeeId === 'EMP-0014');
  console.log("EMP-0014 ATTENDANCE:", JSON.stringify(empAtts, null, 2));

  process.exit(0);
}

check().catch(console.error);
