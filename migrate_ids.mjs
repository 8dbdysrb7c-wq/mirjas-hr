import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Starting migration...");
  const empSnap = await getDocs(collection(db, 'employees'));
  let employees = [];
  empSnap.forEach(doc => employees.push({ ...doc.data(), oldDocId: doc.id }));

  // Exclude admin
  const toMigrate = employees.filter(e => e.id !== 'admin' && e.oldDocId !== 'admin');
  
  // Sort them so the numbering is consistent (by old ID)
  toMigrate.sort((a, b) => {
    let aNum = parseInt(a.id);
    let bNum = parseInt(b.id);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return String(a.id).localeCompare(String(b.id));
  });

  const mapping = {}; // oldId -> newId
  
  let counter = 1;
  for (const emp of toMigrate) {
    const newId = `EMP-${String(counter).padStart(4, '0')}`;
    mapping[emp.id] = newId;
    counter++;
  }

  console.log("Mapping:", mapping);

  // 1. Create new employee docs and delete old ones
  for (const emp of toMigrate) {
    const newId = mapping[emp.id];
    const newEmpData = { ...emp, id: newId };
    delete newEmpData.oldDocId;
    
    // update assignedEmployees if any
    if (newEmpData.assignedEmployees && Array.isArray(newEmpData.assignedEmployees)) {
      newEmpData.assignedEmployees = newEmpData.assignedEmployees.map(old => mapping[old] || old);
    }

    await setDoc(doc(db, 'employees', newId), newEmpData);
    if (emp.oldDocId !== newId) {
      await deleteDoc(doc(db, 'employees', emp.oldDocId));
    }
    console.log(`Migrated employee ${emp.name} from ${emp.id} to ${newId}`);
  }

  // Update admin's assignedEmployees just in case
  const adminEmp = employees.find(e => e.id === 'admin');
  if (adminEmp) {
      let updated = false;
      const newAssigned = (adminEmp.assignedEmployees || []).map(old => {
          if (mapping[old]) { updated = true; return mapping[old]; }
          return old;
      });
      if (updated) {
          const adminDataToSave = { ...adminEmp };
          delete adminDataToSave.oldDocId;
          adminDataToSave.assignedEmployees = newAssigned;
          await setDoc(doc(db, 'employees', 'admin'), adminDataToSave, { merge: true });
          console.log("Updated admin assignedEmployees");
      }
  }

  // 2. Update related collections
  const collectionsToUpdate = [
    { name: 'hr_attendance', field: 'employeeId' },
    { name: 'hr_violations', field: 'employeeId' },
    { name: 'hr_advances', field: 'employeeId' },
    { name: 'hr_leaves', field: 'employeeId' },
    { name: 'hr_salaries', field: 'employeeId' },
    { name: 'reports', field: 'userId' },
    { name: 'supervisor_reports', field: 'supervisorId' },
    { name: 'users', field: 'id' } // Just in case there is a users collection
  ];

  for (const col of collectionsToUpdate) {
    try {
      const snap = await getDocs(collection(db, col.name));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let updated = false;
        const newData = { ...data };

        if (data[col.field] && mapping[data[col.field]]) {
          newData[col.field] = mapping[data[col.field]];
          updated = true;
        }

        // specifically for supervisor_reports -> employeeEvaluations
        if (col.name === 'supervisor_reports' && data.employeeEvaluations) {
          newData.employeeEvaluations = data.employeeEvaluations.map(ev => {
            if (ev.employeeId && mapping[ev.employeeId]) {
              updated = true;
              return { ...ev, employeeId: mapping[ev.employeeId] };
            }
            return ev;
          });
        }

        if (updated) {
          await setDoc(doc(db, col.name, docSnap.id), newData);
          console.log(`Updated ${col.name} document ${docSnap.id}`);
        }
      }
    } catch (e) {
      console.log(`Skipping collection ${col.name} due to error: ${e.message}`);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
