import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  console.log("=== EMPLOYEES MATCHING ISMAIL ===");
  const empsSnapshot = await getDocs(collection(db, 'employees'));
  const ismailEmps = [];
  empsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && (data.name.includes("اسماعيل") || data.name.includes("إسماعيل"))) {
      ismailEmps.push({ id: doc.id, ...data });
      console.log(`ID: ${doc.id}, Name: ${data.name}, Type: ${data.employeeType || 'N/A'}, Level: ${data.level || 'N/A'}, Role: ${data.role || 'N/A'}`);
    }
  });

  console.log("\n=== MISSING PUNCHES ===");
  const mpSnapshot = await getDocs(collection(db, 'missingpunches'));
  mpSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.employeeName && (data.employeeName.includes("اسماعيل") || data.employeeName.includes("إسماعيل"))) {
      console.log(`ID: ${doc.id}, EmpName: ${data.employeeName}, Date: ${data.date}, Reason: ${data.reason}, Status: ${data.status}`);
    }
  });

  console.log("\n=== ATTENDANCE RECORDS FOR ISMAIL ===");
  const attSnapshot = await getDocs(collection(db, 'attendance'));
  attSnapshot.forEach(doc => {
    const data = doc.data();
    const ismailEmpIds = ismailEmps.map(e => e.id);
    if (ismailEmpIds.includes(data.employeeId) || (data.employeeName && (data.employeeName.includes("اسماعيل") || data.employeeName.includes("إسماعيل")))) {
      console.log(`ID: ${doc.id}, Date: ${data.date || data.createdAt}, Name: ${data.employeeName || data.employeeId}, TimeIn: ${data.timeIn}, TimeOut: ${data.timeOut}`);
    }
  });
}

check();
