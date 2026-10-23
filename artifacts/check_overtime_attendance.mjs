import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
const db = getFirestore(initializeApp({ projectId: 'mirjaswork', apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' }));
const bySource = {};
for (const source of ['hr_leaves','hr_attendance','attendance_logs','employee_reports','supervisor_reports']) {
  try {
    const snap = await getDocs(query(collection(db, source), where('date','==','2026-10-11')));
    bySource[source] = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, attendanceSource: source }));
    for (const doc of snap.docs) {
      const r = doc.data();
      if (!JSON.stringify([r.employeeName,r.userName,r.supervisorName]).includes('سالم')) continue;
      console.log(JSON.stringify({ source, id: doc.id, employeeId:r.employeeId, userId:r.userId, supervisorId:r.supervisorId, employeeName:r.employeeName, userName:r.userName, supervisorName:r.supervisorName,date:r.date,startDate:r.startDate,timeIn:r.timeIn,timeOut:r.timeOut,status:r.status,type:r.type,isLeave:r.isLeave }));
    }
  } catch (e) { console.log(source, e.code, e.message); }
}
const { resolveOvertimeAttendance } = await import('../src/utils/overtimeAttendance.js');
const leave = bySource.hr_leaves.find(r => r.employeeId === 'EMP-0010' && r.type === 'بدل عمل إضافي');
console.log('RESOLVED', resolveOvertimeAttendance(Object.entries(bySource).filter(([k]) => k !== 'hr_leaves').flatMap(([,v]) => v), leave));
process.exit(0);
