import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
const source = readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8');
const config = Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(match => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
const targets = new Map([
  ['EMP-0006', 'عبد الله يعقوب ايوب غيث'],
  ['EMP-0007', 'جهاد بركات فلاح المهيرات'],
  ['EMP-0011', 'اسماعيل مصباح صبحي شرف']
]);
const snapshot = await getDocs(collection(db, 'employees'));
const records = snapshot.docs.filter(record => targets.has(record.id));
if (records.length !== 3 || records.some(record => record.data().name !== targets.get(record.id))) throw new Error('Employee identity mismatch');
writeFileSync(new URL('../artifacts/health-insurance-before.json', import.meta.url), JSON.stringify(records.map(record => ({ id: record.id, data: record.data() })), null, 2));
const batch = writeBatch(db);
for (const record of records) batch.update(doc(db, 'employees', record.id), {
  healthInsuranceAmount: 15, healthInsurancePayer: 'employee', updatedAt: new Date().toISOString()
});
await batch.commit();
const verified = await getDocs(collection(db, 'employees'));
const insured = verified.docs.filter(record => Number(record.data().healthInsuranceAmount) > 0);
if (insured.length !== 3 || insured.some(record => !targets.has(record.id) || record.data().healthInsuranceAmount !== 15 || record.data().healthInsurancePayer !== 'employee')) throw new Error('Health insurance verification failed');
console.log(insured.map(record => `${record.id}: ${record.data().name} — 15 JD employee deduction`).join('\n'));
process.exit(0);
