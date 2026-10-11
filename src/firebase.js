import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Clean up any stale/corrupted multi-tab Firestore IndexedDB databases in the background
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    window.indexedDB.databases?.().then(dbs => {
      dbs?.forEach(d => {
        if (d.name && d.name.startsWith('firestore/')) {
          try { window.indexedDB.deleteDatabase(d.name); } catch (_) {}
        }
      });
    }).catch(() => {});
  } catch (_) {}
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

// Initialize Firebase with in-memory cache to prevent cross-tab IndexedDB assertion failures
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: memoryLocalCache()
});
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { db, analytics };

