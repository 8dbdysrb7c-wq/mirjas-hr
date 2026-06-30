import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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

async function migrate() {
  console.log('Starting data migration...');

  // 1. Fetch all employees to build a name-to-id map
  const empsSnapshot = await getDocs(collection(db, 'employees'));
  const emps = [];
  empsSnapshot.forEach(d => {
    emps.push({ docId: d.id, ...d.data() });
  });

  const nameToIdMap = {};
  emps.forEach(emp => {
    if (emp.name && emp.id) {
        // use lower case or trimmed name to be safe
        nameToIdMap[emp.name.trim()] = emp.id;
        // also map first name or parts if necessary, but exact match is safer
    }
  });

  console.log(`Loaded ${emps.length} employees.`);

  // Function to find correct employee ID by name
  const findCorrectId = (name) => {
      if (!name) return null;
      const tName = name.trim();
      if (nameToIdMap[tName]) return nameToIdMap[tName];
      
      // Try partial match if exact fails
      for (const emp of emps) {
          if (emp.name.includes(tName) || tName.includes(emp.name)) {
              return emp.id;
          }
      }
      return null;
  };

  let updatedHrAttendance = 0;
  // 2. Migrate hr_attendance
  const hrAttSnapshot = await getDocs(collection(db, 'hr_attendance'));
  for (const document of hrAttSnapshot.docs) {
      const data = document.data();
      const correctId = findCorrectId(data.employeeName);
      
      if (correctId && data.employeeId !== correctId) {
          console.log(`[hr_attendance] Updating record for ${data.employeeName}: ${data.employeeId} -> ${correctId}`);
          await updateDoc(doc(db, 'hr_attendance', document.id), {
              employeeId: correctId
          });
          updatedHrAttendance++;
      }
  }

  let updatedLogs = 0;
  // 3. Migrate attendance_logs
  const logsSnapshot = await getDocs(collection(db, 'attendance_logs'));
  for (const document of logsSnapshot.docs) {
      const data = document.data();
      const name = data.userName || data.employeeName;
      const currentId = data.userId || data.employeeId;
      const correctId = findCorrectId(name);
      
      if (correctId && currentId !== correctId) {
          console.log(`[attendance_logs] Updating log for ${name}: ${currentId} -> ${correctId}`);
          await updateDoc(doc(db, 'attendance_logs', document.id), {
              userId: correctId,
              employeeId: correctId
          });
          updatedLogs++;
      }
  }

  console.log(`Migration Complete. Updated ${updatedHrAttendance} hr_attendance records and ${updatedLogs} attendance_logs.`);
  process.exit(0);
}

migrate();
