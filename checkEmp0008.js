import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseContent = readFileSync('src/firebase.js', 'utf8');
const configMatch = firebaseContent.match(/const firebaseConfig = ({[\s\S]*?});/);
let firebaseConfig;

if (configMatch) {
  eval(`firebaseConfig = ${configMatch[1]}`);
} else {
  console.error('Could not find firebase config');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const today = '2026-06-20';
  
  // Fetch employees to find EMP-0008
  const empsSnapshot = await getDocs(collection(db, 'employees'));
  let targetEmp = null;
  empsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.id === 'EMP-0008') {
          targetEmp = data;
      }
  });

  if (!targetEmp) {
      console.log('Employee EMP-0008 not found in employees collection!');
  } else {
      console.log(`Found Employee EMP-0008: ${targetEmp.name}`);
  }

  // Check attendance
  const q = query(collection(db, 'hr_attendance'), where('date', '==', today));
  const querySnapshot = await getDocs(q);
  
  let foundRecords = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.employeeId === 'EMP-0008' || (targetEmp && data.employeeName === targetEmp.name) || data.employeeId === '8' || data.userId === '8') {
        foundRecords.push(data);
    }
  });

  if (foundRecords.length > 0) {
      console.log('--- FOUND ATTENDANCE RECORDS FOR EMP-0008 TODAY ---');
      console.log(JSON.stringify(foundRecords, null, 2));
  } else {
      console.log('--- NO ATTENDANCE RECORDS FOUND FOR EMP-0008 TODAY ---');
  }

  process.exit(0);
}

check();
