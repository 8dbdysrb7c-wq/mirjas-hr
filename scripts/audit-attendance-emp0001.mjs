import { freeAuthAdmin } from './free_auth_admin.mjs';
const { db } = await freeAuthAdmin();
try {
for (const name of ['hr_attendance','attendance_logs','employee_reports','supervisor_reports','hr_missing_punches']) {
 const snap = await db.collection(name).where('date','==','2026-09-14').get();
 const rows = snap.docs.map(d => ({...d.data(), docId:d.id})).filter(r => [r.employeeId,r.userId,r.supervisorId].some(v => /^EMP-0*1$/i.test(String(v))) || /رائدة|رائده/.test(r.employeeName || r.name || ''));
 console.log(JSON.stringify({collection:name, rows:rows.map(r=>Object.fromEntries(['docId','id','employeeId','userId','employeeName','date','timeIn','timeOut','time','status','notes','createdAt','updatedAt'].map(k=>[k,r[k]])))},null,2));
}
} finally { await db.terminate(); }
