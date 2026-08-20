const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q',
  projectId: 'mirjaswork',
});
const db = initializeFirestore(app, {});
const ids = ['YW0lBfHDgxNUvMpGIKPg', 'BGErNz2gBpIrkRI0IXdS'];

async function main() {
  for (const id of ids) {
    const snapshot = await getDoc(doc(db, 'whatsapp_queue_v2', id));
    const data = snapshot.data() || {};
    console.log(JSON.stringify({
      id,
      phone: data.phone,
      status: data.status,
      sentAt: data.sentAt || null,
      error: data.error || null,
      wahaMessageId: data.wahaMessageId || null,
    }));
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
