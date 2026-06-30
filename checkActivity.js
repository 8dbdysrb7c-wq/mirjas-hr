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

  // Check attendance_logs
  const q2 = query(collection(db, 'attendance_logs'), where('date', '==', today));
  const querySnapshot2 = await getDocs(q2);
  
  let foundRecords2 = [];
  querySnapshot2.forEach((doc) => {
    const data = doc.data();
    if (data.employeeId === 'EMP-0008' || (targetEmp && data.employeeName === targetEmp.name) || data.employeeId === '8' || data.userId === '8') {
        foundRecords2.push(data);
    }
  });

  if (foundRecords2.length > 0) {
      console.log('--- FOUND ATTENDANCE LOGS FOR EMP-0008 TODAY ---');
      console.log(JSON.stringify(foundRecords2, null, 2));
  } else {
      console.log('--- NO ATTENDANCE LOGS FOUND FOR EMP-0008 TODAY ---');
  }

  // Check reports
  const q3 = query(collection(db, 'reports'), where('date', '==', today));
  const querySnapshot3 = await getDocs(q3);
  
  let foundRecords3 = [];
  querySnapshot3.forEach((doc) => {
    const data = doc.data();
    if (data.userId === 'EMP-0008' || (targetEmp && data.userName === targetEmp.name) || data.userId === '8') {
        foundRecords3.push(data);
    }
  });

  if (foundRecords3.length > 0) {
      console.log('--- FOUND REPORTS FOR EMP-0008 TODAY ---');
      console.log(JSON.stringify(foundRecords3, null, 2));
  } else {
      console.log('--- NO REPORTS FOUND FOR EMP-0008 TODAY ---');
  }

  process.exit(0);
}

check();
