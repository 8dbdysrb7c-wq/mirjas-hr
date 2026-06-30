import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
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

async function fixRecords() {
  const targetId = 'EMP-0010';
  const targetDate = '2026-06-20';

  const q = query(collection(db, 'hr_attendance'), where('employeeId', '==', targetId), where('date', '==', targetDate));
  const querySnapshot = await getDocs(q);
  
  for (const document of querySnapshot.docs) {
    await updateDoc(doc(db, 'hr_attendance', document.id), {
        timeIn: '07:32',
        timeOut: '16:47',
        status: 'مداوم'
    });
    console.log(`Updated record ${document.id} for EMP-0010 to 07:32 - 16:47`);
  }

  process.exit(0);
}

fixRecords();
