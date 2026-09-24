import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q',
  authDomain: 'mirjaswork.firebaseapp.com',
  projectId: 'mirjaswork',
  storageBucket: 'mirjaswork.firebasestorage.app',
  messagingSenderId: '742199978686',
  appId: '1:742199978686:web:6fc97d192fa99d8dd60cef'
});

const db = getFirestore(app);
const [employeesSnap, departmentsSnap, vacanciesSnap] = await Promise.all([
  getDocs(collection(db, 'employees')),
  getDocs(collection(db, 'hrOrganizationDepartments')),
  getDocs(collection(db, 'hrOrganizationVacancies'))
]);

const employees = employeesSnap.docs.map(row => ({ id: row.id, ...row.data() }))
  .filter(employee => employee.isActive !== false && !['غير فعال', 'مستقيل', 'منتهي خدمات'].includes(employee.employmentStatus || employee.status))
  .map(employee => ({
    id: employee.id,
    name: employee.name,
    jobTitle: employee.jobTitle || '',
    department: employee.department || employee.roles?.[0] || '',
    level: employee.level || employee.role || '',
    directManager: employee.directManager || '',
    directManagerId: employee.directManagerId || '',
    shiftStart: employee.shiftStart || '',
    shiftEnd: employee.shiftEnd || '',
    workShiftName: employee.workShiftName || '',
    employmentType: employee.employmentType || employee.salaryType || (employee.dailyRate || employee.isDailyWorker ? 'مياومات' : 'دائم'),
    hasJobDescription: Boolean(String(employee.jobDescription || '').trim()),
    organizationDepartmentId: employee.organizationDepartmentId || ''
  }))
  .sort((a, b) => String(a.department).localeCompare(String(b.department), 'ar') || String(a.name).localeCompare(String(b.name), 'ar'));

console.log(JSON.stringify({
  counts: { employees: employees.length, departments: departmentsSnap.size, vacancies: vacanciesSnap.size },
  departmentsInEmployees: [...new Set(employees.map(employee => employee.department).filter(Boolean))],
  jobTitles: [...new Set(employees.map(employee => employee.jobTitle).filter(Boolean))],
  missing: {
    department: employees.filter(employee => !employee.department).map(employee => `${employee.id}:${employee.name}`),
    jobTitle: employees.filter(employee => !employee.jobTitle).map(employee => `${employee.id}:${employee.name}`),
    manager: employees.filter(employee => !employee.directManager && !['إدارة', 'admin'].includes(employee.level)).map(employee => `${employee.id}:${employee.name}`),
    jobDescription: employees.filter(employee => !employee.hasJobDescription).map(employee => `${employee.id}:${employee.name}`),
    organizationLink: employees.filter(employee => !employee.organizationDepartmentId).map(employee => `${employee.id}:${employee.name}`)
  },
  employees
}, null, 2));
process.exit(0);
