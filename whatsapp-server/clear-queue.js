const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
    projectId: "mirjaswork",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function clearQueue() {
    console.log("جاري البحث عن الرسائل المعلقة في الطابور...");
    const qSnap = await getDocs(collection(db, 'whatsapp_queue'));
    let count = 0;
    
    for (const document of qSnap.docs) {
        await deleteDoc(doc(db, 'whatsapp_queue', document.id));
        count++;
    }
    
    console.log(`\n✅ تم مسح ${count} رسالة معلقة من الطابور بنجاح! السيرفر الآن آمن للتشغيل.`);
    process.exit(0);
}

clearQueue();
