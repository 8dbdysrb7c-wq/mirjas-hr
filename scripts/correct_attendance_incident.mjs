import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, writeBatch } from 'firebase/firestore';
const source=readFileSync('src/firebase.js','utf8');
const config=Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
const db=getFirestore(initializeApp(config));
const date='2026-10-17'; const exclusions=new Set(['EMP-0004','EMP-0007','EMP-0009']);
const snaps=await Promise.all([getDocs(collection(db,'employees')),getDocs(query(collection(db,'hr_attendance'),where('date','==',date))),getDocs(query(collection(db,'attendance_logs'),where('date','==',date))),getDoc(doc(db,'hr_salary_periods','2026-10'))]);
if(snaps[3].exists()&&['locked','archived'].includes(snaps[3].data().status))throw Error('Salary period locked');
const employees=snaps[0].docs.map(d=>({ ...d.data(),id:d.id})).filter(e=>e.id!=='admin'&&e.employmentStatus==='فعال'&&!exclusions.has(e.id));
const records=snaps[1].docs.map(d=>({...d.data(),id:d.id}));const logs=snaps[2].docs.map(d=>({...d.data(),id:d.id}));
const before={date,hr:records,logs,employees:employees.map(e=>({id:e.id,name:e.name,shiftStart:e.shiftStart})),excluded:[...exclusions]};
writeFileSync('artifacts/attendance-2026-10-17-correction-backup.json',JSON.stringify(before,null,2));
const timestamp=new Date().toISOString();const batch=writeBatch(db);const applied=[];
for(const e of employees){
 if(!/^\d{2}:\d{2}$/.test(e.shiftStart||''))throw Error('Missing shift start: '+e.id);
 const matches=records.filter(r=>[r.employeeId,r.userId].includes(e.id));if(matches.length>1)throw Error('Duplicate attendance: '+e.id);
 const existing=matches[0];const key=`${e.id}_${date}`;const log=logs.find(r=>r.id===key);
 const note='تصحيح إداري بطلب الإدارة: إثبات بداية الدوام حسب موعد الموظف بسبب تعطل البصمة الجغرافية';
 const base={employeeId:e.id,userId:e.id,employeeName:e.name,date,timeIn:e.shiftStart,status:'مداوم',updatedAt:timestamp,source:'admin-attendance-correction',locationConfirmed:false,correction:{reason:note,correctedAt:timestamp,previousTimeIn:existing?.timeIn||log?.timeIn||'',previousStatus:existing?.status||log?.status||''}};
 batch.set(doc(db,'hr_attendance',existing?.id||key),{...base,notes:[existing?.notes,note].filter(Boolean).join(' | ')},{merge:true});
 batch.set(doc(db,'attendance_logs',key),{...base,notes:[log?.notes,note].filter(Boolean).join(' | ')},{merge:true});
 applied.push({id:e.id,name:e.name,timeIn:e.shiftStart});
}
batch.set(doc(collection(db,'hr_audit_logs')),{date,timestamp,user:'المدير العام',action:'تصحيح حضور جماعي بسبب عطل البصمة',description:'إثبات بداية الدوام للموظفين الفعالين باستثناء جهاد ومها وسلسبيل',applied,excluded:[...exclusions]});
await batch.commit();
for(const x of applied){const log=await getDoc(doc(db,'attendance_logs',`${x.id}_${date}`));if(log.data()?.timeIn!==x.timeIn)throw Error('Verification failed: '+x.id);}
for(const id of exclusions){const old=logs.find(r=>r.id===`${id}_${date}`);const after=await getDoc(doc(db,'attendance_logs',`${id}_${date}`));if(JSON.stringify(after.data())!==JSON.stringify(old&&Object.fromEntries(Object.entries(old).filter(([k])=>k!=='id'))))throw Error('Excluded employee changed: '+id);}
writeFileSync('artifacts/attendance-2026-10-17-correction-result.json',JSON.stringify({date,applied,excluded:[...exclusions],verified:true},null,2));
console.log(JSON.stringify({date,count:applied.length,applied,excluded:[...exclusions],verified:true},null,2));process.exit(0);
