import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, writeBatch } from 'firebase/firestore';
const source = readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8');
const config = Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(match => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
const targets = [
  ['hr_attendance', 'ySOGMhbSxaiEXoWuK8CE', 'timeIn'],
  ['attendance_logs', 'EMP-0005_2026-10-03', 'timeIn'],
  ['missing_punches', '9ekAYqxvxciP1MuLLJah', 'time']
];
const snapshots = await Promise.all(targets.map(([name, id]) => getDoc(doc(db, name, id))));
const before = snapshots.map((snapshot, index) => {
  const data = snapshot.data();
  if (!snapshot.exists() || data.employeeId !== 'EMP-0005' || data.date !== '2026-10-03'
      || data[targets[index][2]] !== '7:30 م') throw new Error('Record changed; refusing correction');
  return { collection: targets[index][0], id: snapshot.id, data };
});
writeFileSync(new URL('../artifacts/overtime-punch-correction-before.json', import.meta.url), JSON.stringify(before, null, 2));
const timestamp = new Date().toISOString();
const batch = writeBatch(db);
targets.forEach(([name, id, field]) => batch.update(doc(db, name, id), {
  [field]: '07:30', updatedAt: timestamp,
  timeCorrection: { field, previousValue: '7:30 م', correctedValue: '07:30', reason: 'تصحيح صباح/مساء بطلب المدير: الدخول 7:30 صباحاً', correctedAt: timestamp }
}));
await batch.commit();
for (const [name, id, field] of targets) {
  const snapshot = await getDoc(doc(db, name, id));
  if (snapshot.data()[field] !== '07:30') throw new Error('Correction verification failed');
  console.log(`${name}/${id}: ${field}=07:30`);
}
process.exit(0);
