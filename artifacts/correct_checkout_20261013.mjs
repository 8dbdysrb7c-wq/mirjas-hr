import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, runTransaction } from 'firebase/firestore';
import { reportAttendanceFields } from '../src/utils/reportAttendance.js';
import fs from 'node:fs/promises';
const db = getFirestore(initializeApp({ projectId: 'mirjaswork', apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' }));
const day='2026-10-13';
const approved = {'EMP-0003':'14:42','EMP-0002':'16:37','EMP-0004':'16:48','EMP-0027':'17:44'};
const hrSnapshot = await getDocs(query(collection(db,'hr_attendance'),where('date','==',day)));
const results=[];
for (const [id,timeOut] of Object.entries(approved)) {
  const hrRefs = hrSnapshot.docs.filter(d => [d.data().employeeId,d.data().userId].includes(id)).map(d => d.ref);
  if (!hrRefs.length) throw Error(`Missing HR record ${id}`);
  const reportRef=doc(db,'reports',`${id}_${day}`);
  const logRef=doc(db,'attendance_logs',`${id}_${day}`);
  const auditRef=doc(db,'operations_log',`checkout_admin_correction_${id}_${day}`);
  const refs=[reportRef,logRef,...hrRefs];
  const result=await runTransaction(db,async tx=>{
    const snapshots=await Promise.all(refs.map(ref=>tx.get(ref)));
    const report=snapshots[0].data();
    if (!report || report.date!==day || report.userId!==id) throw Error(`Report identity mismatch ${id}`);
    if (snapshots.some(s=>s.exists()&&s.data().timeOut&&s.data().timeOut!=='--:--')) return {id,status:'skipped_existing_checkout'};
    const before=snapshots.map((s,i)=>({path:refs[i].path,data:s.exists()?s.data():null}));
    const correctedAt=new Date().toISOString();
    const note='تصحيح إداري معتمد: اعتماد وقت تقديم تقرير يوم 2026-10-13 كوقت خروج بطلب الإدارة؛ ليس ختمة موقع أصلية.';
    const meta={checkoutCorrection:{source:'admin_approved_report_submission_time',approvedTime:timeOut,date:day,correctedAt}};
    const attendance={...snapshots[2].data(),timeOut};
    tx.update(reportRef,{...reportAttendanceFields(report,attendance),...meta});
    for (let i=1;i<refs.length;i++) {
      const prior=snapshots[i].data()||{};
      tx.set(refs[i],{employeeId:id,userId:id,employeeName:report.userName||prior.employeeName||'',date:day,timeIn:attendance.timeIn,timeOut,status:'مداوم',updatedAt:correctedAt,notes:[prior.notes,note].filter(Boolean).join(' | '),...meta},{merge:true});
    }
    tx.set(auditRef,{userName:'الإدارة',module:'الحضور والانصراف',action:'تصحيح إداري لبصمة الخروج',employeeId:id,employeeName:report.userName,date:day,timeOut,timestamp:correctedAt,details:note,before,authorization:'موافقة المستخدم الصريحة على أوقات تقديم التقارير كتصحيح إداري'});
    return {id,name:report.userName,timeOut,status:'corrected',before};
  });
  results.push(result);
}
await fs.writeFile('artifacts/checkout-correction-2026-10-13.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({before,...summary})=>summary)));
for (const id of Object.keys(approved)) {
  const snaps=await getDocs(query(collection(db,'hr_attendance'),where('employeeId','==',id),where('date','==',day)));
  console.log('VERIFIED',id,snaps.docs.map(d=>d.data().timeOut).join(','));
}
process.exit(0);
