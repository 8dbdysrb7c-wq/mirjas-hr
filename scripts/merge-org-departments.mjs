import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q', authDomain: 'mirjaswork.firebaseapp.com', projectId: 'mirjaswork', appId: '1:742199978686:web:6fc97d192fa99d8dd60cef' });
const db = getFirestore(app);
const [departmentSnap, employeeSnap] = await Promise.all([getDocs(collection(db, 'hrOrganizationDepartments')), getDocs(collection(db, 'employees'))]);
const departments = departmentSnap.docs.map(row => ({ id: row.id, ...row.data() }));
const employees = employeeSnap.docs.map(row => ({ id: row.id, ...row.data() }));
const byName = name => departments.find(department => department.name === name);
const sewingTarget = byName('الخياطة');
const logisticsTarget = byName('اللوجستي');
const sources = ['القص والخياطة', 'تغليف وتشطيب', 'الدعم اللوجستي'].map(byName).filter(Boolean);
if (!sewingTarget || !logisticsTarget || sources.length !== 3) throw new Error('تعذر تحديد جميع الأقسام المصدر أو الهدف');
const sewingSourceIds = new Set([byName('القص والخياطة').id, byName('تغليف وتشطيب').id]);
const logisticsSourceId = byName('الدعم اللوجستي').id;
const moved = employees.filter(employee => sewingSourceIds.has(employee.organizationDepartmentId) || employee.organizationDepartmentId === logisticsSourceId);

const batch = writeBatch(db);
const backupId = `before-department-merge-${new Date().toISOString().replace(/[:.]/g, '-')}`;
batch.set(doc(db, 'hrOrganizationBackups', backupId), {
  createdAt: new Date().toISOString(), reason: 'قبل دمج أقسام الخياطة والتغليف والدعم اللوجستي',
  departments: [...sources, sewingTarget, logisticsTarget],
  employees: moved.map(employee => ({ id: employee.id, organizationDepartmentId: employee.organizationDepartmentId, department: employee.department, roles: employee.roles || [] }))
});

moved.forEach(employee => {
  const toSewing = sewingSourceIds.has(employee.organizationDepartmentId);
  const target = toSewing ? sewingTarget : logisticsTarget;
  batch.set(doc(db, 'employees', employee.id), { organizationDepartmentId: target.id, department: target.name, roles: [target.name] }, { merge: true });
});

batch.set(doc(db, 'hrOrganizationDepartments', sewingTarget.id), {
  order: 1,
  description: 'إدارة وتنفيذ أعمال القص والخياطة والتفصيل، ثم استلام المنجز وفحصه وتشطيبه وتغليفه حسب كروت الإنتاج والكميات والمواصفات المعتمدة.'
}, { merge: true });
batch.set(doc(db, 'hrOrganizationDepartments', logisticsTarget.id), {
  order: 0,
  description: 'تنظيم وتنفيذ الدعم اللوجستي وحركة المواد والأصناف والتجهيز والتحميل والتنزيل، وتوفير احتياجات أقسام الإنتاج والمخزون والتسليم.'
}, { merge: true });
sources.forEach(source => batch.delete(doc(db, 'hrOrganizationDepartments', source.id)));
await batch.commit();
console.log(JSON.stringify({ backupId, sewingTarget: sewingTarget.id, logisticsTarget: logisticsTarget.id, movedToSewing: moved.filter(employee => sewingSourceIds.has(employee.organizationDepartmentId)).map(employee => employee.name), movedToLogistics: moved.filter(employee => employee.organizationDepartmentId === logisticsSourceId).map(employee => employee.name), deletedDepartments: sources.map(source => source.name) }, null, 2));
process.exit(0);
