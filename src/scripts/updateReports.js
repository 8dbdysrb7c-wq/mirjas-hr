import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBw... (doesn't matter)",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:123"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const updateReports = async () => {
  const reportsRef = collection(db, 'supervisor_reports');
  const snapshot = await getDocs(reportsRef);
  let updatedCount = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();
    let needsUpdate = false;
    
    if (data.employeeEvaluations && Array.isArray(data.employeeEvaluations)) {
      data.employeeEvaluations = data.employeeEvaluations.map(ev => {
        if (ev.rating === 'ممتاز') { needsUpdate = true; return { ...ev, rating: '95%' }; }
        if (ev.rating === 'جيد') { needsUpdate = true; return { ...ev, rating: '85%' }; }
        if (ev.rating === 'مقبول') { needsUpdate = true; return { ...ev, rating: '65%' }; }
        if (ev.rating === 'سيئ') { needsUpdate = true; return { ...ev, rating: '40%' }; }
        return ev;
      });
    }

    if (needsUpdate) {
      await setDoc(doc(db, 'supervisor_reports', docSnapshot.id), data, { merge: true });
      updatedCount++;
    }
  }
  
  console.log(`Successfully updated ${updatedCount} reports to percentage format.`);
};

updateReports().catch(console.error);
