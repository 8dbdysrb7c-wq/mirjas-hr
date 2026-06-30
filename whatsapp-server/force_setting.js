const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function update() {
    await setDoc(doc(db, 'settings', 'globalSettings'), {
        value: {
            notifications: {
                delivery: {
                    whatsapp: true,
                    employee: true,
                    supervisor: true,
                    management: true
                }
            }
        }
    }, { merge: true });
    console.log("Forced delivery whatsapp to true INSIDE 'value' in DB.");
    process.exit(0);
}
update().catch(console.error);
