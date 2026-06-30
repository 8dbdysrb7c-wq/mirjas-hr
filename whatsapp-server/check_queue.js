const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function check() {
    console.log("Fetching last 5 whatsapp_queue items...");
    const q = query(collection(db, 'whatsapp_queue'), orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${doc.id}] phone: ${data.phone}, status: ${data.status}, msg: ${data.message.substring(0, 30)}...`);
    });
    process.exit(0);
}
check().catch(console.error);
