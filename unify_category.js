import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log("جاري توحيد التصنيفات...");
    const snap = await getDocs(collection(db, 'stock'));
    const allStock = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Find all items that got numbered with CON-
    const conItems = allStock.filter(item => item.itemNumber && item.itemNumber.startsWith('CON-'));
    
    let batch = writeBatch(db);
    let opCount = 0;
    let updatedCount = 0;
    
    const commitBatch = async () => {
        if (opCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
        }
    };
    
    for (const item of conItems) {
        // Unify the category strictly to "مستهلكات خياطة" so they all appear in the same filter
        if (item.category !== 'مستهلكات خياطة') {
            batch.update(doc(db, 'stock', item.id), { category: 'مستهلكات خياطة' });
            opCount++;
            updatedCount++;
            if (opCount >= 450) await commitBatch();
        }
    }
    
    await commitBatch();
    console.log(`تم توحيد تصنيف ${updatedCount} أصناف مخفية لتصبح "مستهلكات خياطة" وتظهر في القائمة.`);
    process.exit(0);
}

main().catch(console.error);
