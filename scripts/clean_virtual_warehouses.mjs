import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfigContent = fs.readFileSync("./src/firebase.js", "utf-8");
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]*?});/);
const configStr = configMatch[1];
const firebaseConfig = eval(`(${configStr})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FORBIDDEN_WAREHOUSES = [
  "مستودع إنتاج قيد التحضير",
  "مستودع إنتاج قيد الخياطة",
  "مستودع إنتاج قيد التغليف",
  "مستودع قبل الخياطة",
  "بانتظار استلام التغليف",
  "قيد التحضير",
  "قيد الخياطة"
];

async function run() {
  console.log("1. Checking and cleaning stock collection...");
  const stockSnap = await getDocs(collection(db, "stock"));
  let updatedStockCount = 0;

  for (const docSnap of stockSnap.docs) {
    const item = docSnap.data();
    let needsUpdate = false;
    const updates = {};

    if (item.warehouse && FORBIDDEN_WAREHOUSES.includes(item.warehouse.trim())) {
      // Set to default physical warehouse based on item or category
      const targetWarehouse = item.category === "مخدات" || (item.name && item.name.includes("مخدة")) ? "مصنع المخدة" : "مصنع البياضات";
      updates.warehouse = targetWarehouse;
      needsUpdate = true;
      console.log(`Updating item ${item.name} (${docSnap.id}) warehouse from "${item.warehouse}" to "${targetWarehouse}"`);
    }

    if (Array.isArray(item.breakdown)) {
      const filteredBreakdown = item.breakdown.filter(b => !FORBIDDEN_WAREHOUSES.includes((b.warehouse || "").trim()));
      if (filteredBreakdown.length !== item.breakdown.length) {
        updates.breakdown = filteredBreakdown;
        needsUpdate = true;
        console.log(`Cleaning breakdown for item ${item.name} (${docSnap.id})`);
      }
    }

    if (needsUpdate) {
      await updateDoc(doc(db, "stock", docSnap.id), updates);
      updatedStockCount++;
    }
  }
  console.log(`Stock items updated: ${updatedStockCount}`);

  console.log("\n2. Checking and cleaning settings/globalSettings...");
  const settingsDocRef = doc(db, "settings", "globalSettings");
  const settingsSnap = await getDoc(settingsDocRef);
  if (settingsSnap.exists()) {
    const data = settingsSnap.data();
    if (Array.isArray(data.warehouses)) {
      const cleanedWarehouses = data.warehouses.filter(w => !FORBIDDEN_WAREHOUSES.includes(w.trim()));
      if (cleanedWarehouses.length !== data.warehouses.length) {
        await updateDoc(settingsDocRef, { warehouses: cleanedWarehouses });
        console.log("Cleaned warehouses in globalSettings:", cleanedWarehouses);
      } else {
        console.log("globalSettings.warehouses already clean:", data.warehouses);
      }
    }
  }

  console.log("\n3. Checking stockTakes collection...");
  const stockTakesSnap = await getDocs(collection(db, "stocktakes"));
  console.log(`Found ${stockTakesSnap.size} stocktakes docs.`);
  for (const docSnap of stockTakesSnap.docs) {
    const st = docSnap.data();
    if (st.warehouse && FORBIDDEN_WAREHOUSES.includes(st.warehouse.trim())) {
      console.log(`Stocktake ${docSnap.id} has forbidden warehouse: ${st.warehouse}`);
    }
  }

  console.log("\n4. Checking stockVouchers collection...");
  const vouchersSnap = await getDocs(collection(db, "stockVouchers"));
  console.log(`Found ${vouchersSnap.size} stockVouchers docs.`);

  console.log("\nCleanup check complete!");
}

run().catch(console.error);
