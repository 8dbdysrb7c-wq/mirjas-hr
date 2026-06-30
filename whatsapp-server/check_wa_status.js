const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function check() {
    const docSnap = await getDoc(doc(db, 'whatsapp_config', 'status'));
    if (docSnap.exists()) {
        console.log("WhatsApp Status:", docSnap.data());
    } else {
        console.log("No status document found.");
    }
    process.exit(0);
}
check().catch(console.error);
