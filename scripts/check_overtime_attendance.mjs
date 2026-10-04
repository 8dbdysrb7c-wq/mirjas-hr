import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
const source = readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8');
const config = Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(match => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
for (const name of ['hr_attendance', 'attendance_logs', 'missing_punches', 'hr_leaves']) {
  const snapshot = await getDocs(query(collection(db, name), where('date', '==', '2026-10-03')));
  const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(row =>
    [row.employeeId, row.userId].includes('EMP-0005') || String(row.employeeName || '').includes('البراء'));
  console.log(JSON.stringify({ collection: name, records }, null, 2));
}
process.exit(0);
