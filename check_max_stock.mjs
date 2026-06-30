import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMax() {
  const snap = await getDocs(collection(db, 'stock'));
  let max = 0;
  let maxItem = null;
  snap.forEach(d => {
    let num = d.data().itemNumber;
    let match = num ? num.match(/\d+/) : null;
    if (match) {
      let val = parseInt(match[0], 10);
      if (val > max) { max = val; maxItem = d.data(); }
    }
  });
  console.log("MAX ID:", max);
  console.log("Max item details:", maxItem);
  process.exit(0);
}
checkMax();
