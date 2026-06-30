const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function check() {
    const docSnap = await getDoc(doc(db, 'settings', 'globalSettings'));
    if (docSnap.exists()) {
        const data = docSnap.data().value || {};
        console.log("Delivery Whatsapp in DB:", data.notifications?.delivery?.whatsapp);
    }
    process.exit(0);
}
check().catch(console.error);
