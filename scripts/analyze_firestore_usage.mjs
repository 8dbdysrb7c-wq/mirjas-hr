import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfigContent = fs.readFileSync("./src/firebase.js", "utf-8");
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]*?});/);
const configStr = configMatch[1];
const firebaseConfig = eval(`(${configStr})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = [
  "stock",
  "salesOrders",
  "orders",
  "preparationOrders",
  "notifications",
  "employee_alerts",
  "attendance_logs",
  "employees",
  "reports",
  "supervisorReports",
  "supervisorTasks",
  "missions",
  "quotes",
  "customers",
  "logs",
  "stocktakes",
  "stockVouchers",
  "priceLists",
  "leaves"
];

async function run() {
  console.log("Analyzing Firestore collections document counts...");
  const results = [];
  for (const colName of COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      results.push({ collection: colName, count: snap.size });
    } catch (e) {
      results.push({ collection: colName, error: e.message });
    }
  }
  results.sort((a, b) => (b.count || 0) - (a.count || 0));
  console.table(results);
}

run().catch(console.error);
