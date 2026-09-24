import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfigContent = fs.readFileSync("./src/firebase.js", "utf-8");
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]*?});/);
if (!configMatch) {
  console.error("Could not parse firebaseConfig from src/firebase.js");
  process.exit(1);
}
const configStr = configMatch[1];
const firebaseConfig = eval(`(${configStr})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Checking globalSettings.warehouses...");
  const settingsDoc = await getDoc(doc(db, "settings", "globalSettings"));
  if (settingsDoc.exists()) {
    const s = settingsDoc.data();
    console.log("globalSettings.warehouses:", s.warehouses);
  }

  console.log("\nChecking stock collection for virtual warehouses in breakdown/warehouse fields...");
  const stockSnap = await getDocs(collection(db, "stock"));
  const foundBreakdownWarehouses = new Set();
  const suspiciousItems = [];

  stockSnap.forEach((docSnap) => {
    const item = docSnap.data();
    if (item.warehouse) foundBreakdownWarehouses.add(item.warehouse);
    if (Array.isArray(item.breakdown)) {
      item.breakdown.forEach((b) => {
        if (b.warehouse) foundBreakdownWarehouses.add(b.warehouse);
        if (b.warehouse && (b.warehouse.includes("خياطة") || b.warehouse.includes("تحضير") || b.warehouse.includes("تغليف"))) {
          suspiciousItems.push({ id: docSnap.id, name: item.name, warehouse: b.warehouse, quantity: b.quantity });
        }
      });
    }
  });

  console.log("All unique warehouses found across stock items:", Array.from(foundBreakdownWarehouses));
  console.log(`Found ${suspiciousItems.length} suspicious breakdown entries in stock items:`, suspiciousItems);
}

run().catch(console.error);
