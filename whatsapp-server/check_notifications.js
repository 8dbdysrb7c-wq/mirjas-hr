const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function check() {
    console.log("Fetching last 10 notifications...");
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${doc.id}] title: ${data.title}, msg: ${data.message}`);
    });
    process.exit(0);
}
check().catch(console.error);
