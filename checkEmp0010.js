import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
  const targetId = 'EMP-0010';
  
  // Fetch employees to find EMP-0010
  const empsSnapshot = await getDocs(collection(db, 'employees'));
  let targetEmp = null;
  empsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.id === targetId || data.name.includes('نعمة')) {
          targetEmp = data;
          console.log(`Found Employee: ${targetEmp.id} - ${targetEmp.name}`);
      }
  });

  if (!targetEmp) {
      console.log('Employee نعمة not found in employees collection!');
  }

  // Check attendance (hr_attendance)
  const q = query(collection(db, 'hr_attendance'));
  const querySnapshot = await getDocs(q);
  
  let foundRecords = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.employeeId === targetId || (targetEmp && data.employeeName === targetEmp.name) || data.employeeId === '10' || data.userId === '10' || data.employeeName?.includes('نعمة')) {
        foundRecords.push({ id: doc.id, ...data });
    }
  });

  // Sort by date
  foundRecords.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));

  if (foundRecords.length > 0) {
      console.log(`--- FOUND ${foundRecords.length} ATTENDANCE RECORDS FOR ${targetId} (نعمة) ---`);
      foundRecords.slice(0, 5).forEach(r => {
        console.log(`Date: ${r.date}, Time In: ${r.timeIn}, Time Out: ${r.timeOut}, Status: ${r.status}, ID used: ${r.employeeId}`);
      });
  } else {
      console.log(`--- NO ATTENDANCE RECORDS FOUND FOR ${targetId} ---`);
  }

  // Check attendance_logs
  const q2 = query(collection(db, 'attendance_logs'));
  const querySnapshot2 = await getDocs(q2);
  
  let foundLogs = [];
  querySnapshot2.forEach((doc) => {
    const data = doc.data();
    if (data.employeeId === targetId || (targetEmp && data.employeeName === targetEmp.name) || data.employeeId === '10' || data.userId === '10' || data.employeeName?.includes('نعمة')) {
        foundLogs.push({ id: doc.id, ...data });
    }
  });

  foundLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (foundLogs.length > 0) {
      console.log(`--- FOUND ${foundLogs.length} ATTENDANCE LOGS FOR ${targetId} (نعمة) ---`);
      foundLogs.slice(0, 10).forEach(l => {
          console.log(`Time: ${new Date(l.timestamp).toLocaleString()}, Type: ${l.type}, Status: ${l.status}, User Name: ${l.userName || l.employeeName}, User ID used: ${l.userId || l.employeeId}`);
      });
  } else {
      console.log(`--- NO ATTENDANCE LOGS FOUND FOR ${targetId} ---`);
  }

  process.exit(0);
}

check();
