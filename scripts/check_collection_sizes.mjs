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
  const alertsSnap = await getDocs(collection(db, 'employee_alerts'));
  console.log(`Total docs in employee_alerts: ${alertsSnap.size}`);
  
  const notificationsSnap = await getDocs(collection(db, 'notifications'));
  console.log(`Total docs in notifications: ${notificationsSnap.size}`);
  
  const attendanceSnap = await getDocs(collection(db, 'attendance_logs'));
  console.log(`Total docs in attendance_logs: ${attendanceSnap.size}`);
  
  const reportsSnap = await getDocs(collection(db, 'reports'));
  console.log(`Total docs in reports: ${reportsSnap.size}`);
  
  const stockSnap = await getDocs(collection(db, 'stock'));
  console.log(`Total docs in stock: ${stockSnap.size}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
