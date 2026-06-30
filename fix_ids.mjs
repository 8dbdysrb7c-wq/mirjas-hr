import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

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

async function fix() {
  const empSnap = await getDocs(collection(db, 'employees'));
  let maxNum = 0;
  let toFix = [];
  empSnap.forEach(doc => {
    const data = doc.data();
    if (data.id && data.id.startsWith('EMP-')) {
      const num = parseInt(data.id.replace('EMP-', ''), 10);
      if (num > maxNum) maxNum = num;
    } else if (data.id !== 'admin') {
      toFix.push({ ...data, oldDocId: doc.id });
    }
  });

  const mapping = {};
  for (const emp of toFix) {
    maxNum++;
    const newId = `EMP-${String(maxNum).padStart(4, '0')}`;
    mapping[emp.id] = newId;
    const newEmpData = { ...emp, id: newId };
    delete newEmpData.oldDocId;
    
    await setDoc(doc(db, 'employees', newId), newEmpData);
    await deleteDoc(doc(db, 'employees', emp.oldDocId));
    console.log(`Fixed employee ${emp.name} from ${emp.id} to ${newId}`);
  }

  if (Object.keys(mapping).length > 0) {
    const collectionsToUpdate = [
      { name: 'hr_attendance', field: 'employeeId' },
      { name: 'hr_violations', field: 'employeeId' },
      { name: 'hr_advances', field: 'employeeId' },
      { name: 'hr_leaves', field: 'employeeId' },
      { name: 'hr_salaries', field: 'employeeId' },
      { name: 'reports', field: 'userId' },
      { name: 'supervisor_reports', field: 'supervisorId' },
    ];

    for (const col of collectionsToUpdate) {
      const snap = await getDocs(collection(db, col.name));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        let updated = false;
        const newData = { ...data };

        if (data[col.field] && mapping[data[col.field]]) {
          newData[col.field] = mapping[data[col.field]];
          updated = true;
        }

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
    }
  }

  console.log("Done");
  process.exit(0);
}
fix();
