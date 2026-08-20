const { initializeApp } = require('firebase/app');
const {
  initializeFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  Timestamp,
} = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q',
  projectId: 'mirjaswork',
});
const db = initializeFirestore(app, {});

const targetPhones = new Set(['00962799279014', '00962782360665']);

async function main() {
  const failed = await getDocs(
    query(collection(db, 'whatsapp_queue_v2'), where('status', '==', 'failed')),
  );

  const selected = failed.docs
    .filter((snapshot) => {
      const data = snapshot.data();
      return targetPhones.has(String(data.phone || '')) &&
        String(data.error || '').includes('ECONNREFUSED 127.0.0.1:3000');
    })
    .sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

  const newestByPhone = new Map();
  for (const snapshot of selected) {
    const phone = String(snapshot.data().phone);
    if (!newestByPhone.has(phone)) newestByPhone.set(phone, snapshot);
  }

  if (newestByPhone.size !== targetPhones.size) {
    throw new Error(`Expected 2 matching failed messages, found ${newestByPhone.size}`);
  }

  for (const [phone, snapshot] of newestByPhone) {
    await updateDoc(doc(db, 'whatsapp_queue_v2', snapshot.id), {
      status: 'pending',
      createdAt: Timestamp.now(),
      sentAt: null,
      error: null,
      retryRequestedAt: new Date().toISOString(),
    });
    console.log(`REQUEUED ${snapshot.id} ${phone}`);
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
