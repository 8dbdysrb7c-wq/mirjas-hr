const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function run() {
    try {
        const docSnap = await getDoc(doc(db, 'whatsapp_config', 'status'));
        if (docSnap.exists()) {
            console.log('CURRENT FIRESTORE STATUS:', docSnap.data());
        } else {
            console.log('DOCUMENT NOT FOUND');
        }
    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

run();
