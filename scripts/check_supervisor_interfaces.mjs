import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
const source = readFileSync(new URL('../src/firebase.js', import.meta.url), 'utf8');
const config = Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(match => [match[1], match[2]]));
const db = getFirestore(initializeApp(config));
const snapshot = await getDocs(collection(db, 'employees'));
for (const record of snapshot.docs) {
  const data = record.data();
  if (/[اأإ]ماني|عماد/.test(data.name || '')) {
    const fields = ['name','employeeId','level','role','roles','department','jobTitle','accessAdmin','isSupervisor','hasHRAccess','hasSupervisorReportsAccess','supervisorPermissions'];
    console.log(JSON.stringify({id:record.id,...Object.fromEntries(fields.map(key=>[key,data[key]]))},null,2));
  }
}
process.exit(0);

