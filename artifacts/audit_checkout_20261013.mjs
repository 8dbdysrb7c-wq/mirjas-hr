import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'node:fs/promises';
const db = getFirestore(initializeApp({ projectId: 'mirjaswork', apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' }));
const ids = ['EMP-0027','EMP-0003','EMP-0002','EMP-0004'];
const day = '2026-10-13';
const audit = {};
for (const source of ['reports','hr_attendance','attendance_logs','missing_punches','employee_reports','supervisor_reports']) {
  const snapshot = await getDocs(query(collection(db, source), where('date','==', day)));
  audit[source] = snapshot.docs.map(d => ({ ...d.data(), id:d.id })).filter(r => ids.some(id => [r.employeeId,r.userId,r.supervisorId].includes(id)));
}
const logs = await getDocs(query(collection(db,'operations_log'),where('timestamp','>=','2026-10-12T21:00:00.000Z'),where('timestamp','<','2026-10-13T21:00:00.000Z')));
audit.operations_log = logs.docs.map(d => ({...d.data(),id:d.id})).filter(r => ids.includes(r.userId) || ids.some(id=>JSON.stringify(r).includes(id)));
await fs.writeFile('artifacts/checkout-audit-2026-10-13.json', JSON.stringify(audit,null,2));
for (const [source,records] of Object.entries(audit)) {
  console.log(source, JSON.stringify(records.map(r=>({id:r.id,employeeId:r.employeeId,userId:r.userId,name:r.employeeName||r.userName,date:r.date,timeIn:r.timeIn,timeOut:r.timeOut,status:r.status,createdAt:r.createdAt,submittedAt:r.submittedAt,updatedAt:r.updatedAt,timestamp:r.timestamp,action:r.action,details:r.details,time:r.time,reason:r.reason,attendancePending:r.attendancePending}))));
}
process.exit(0);
