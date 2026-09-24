import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfigContent = fs.readFileSync("./src/firebase.js", "utf-8");
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]*?});/);
const configStr = configMatch[1];
const firebaseConfig = eval(`(${configStr})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const stockSnap = await getDocs(collection(db, "stock"));
  stockSnap.forEach((docSnap) => {
    const item = docSnap.data();
    if (item.warehouse && (item.warehouse.includes("تحضير") || item.warehouse.includes("خياطة") || item.warehouse.includes("تغليف"))) {
      console.log(`Item ID: ${docSnap.id}, Name: ${item.name}, itemNumber: ${item.itemNumber}, warehouse: "${item.warehouse}", quantity: ${item.quantity}`);
    }
  });
}

run().catch(console.error);
