import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  console.log("Checking sales_order_drafts...");
  const draftsSnap = await getDocs(collection(db, 'sales_order_drafts'));
  console.log(`Found ${draftsSnap.size} drafts`);
  draftsSnap.forEach(d => {
    const data = d.data();
    console.log(`Draft ${d.id}: user=${data.userId || data.createdBy}, customer=${data.customerName}, items=${data.items?.length}, updated=${data.updatedAt}`);
    if (data.customerName?.includes('مخازن') || data.userId === 'EMP0265' || data.createdBy?.includes('عماد')) {
      console.log("Details:", JSON.stringify(data, null, 2));
    }
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
