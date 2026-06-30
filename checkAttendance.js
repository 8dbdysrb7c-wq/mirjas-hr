import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

// We need firebase config. Let's read from src/firebase.js
const firebaseContent = readFileSync('./src/firebase.js', 'utf8');
const configMatch = firebaseContent.match(/const firebaseConfig = ({[\s\S]*?});/);
if (!configMatch) {
  console.log("Could not find firebaseConfig");
  process.exit(1);
}

// Evaluate the config
const firebaseConfig = eval('(' + configMatch[1] + ')');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  // Get today's date
  const selectedDate = new Date().toISOString().split('T')[0];
  console.log("Checking attendance for", selectedDate);
  
  const q = query(collection(db, 'hr_attendance'), where('date', '==', selectedDate));
  const snapshot = await getDocs(q);
  console.log(`Found ${snapshot.size} records in hr_attendance.`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, '->', data.employeeId, data.employeeName, data.timeIn, data.status);
  });
  
  process.exit(0);
}

check().catch(console.error);
