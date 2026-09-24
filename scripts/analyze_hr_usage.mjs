import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfigContent = fs.readFileSync("./src/firebase.js", "utf-8");
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]*?});/);
const configStr = configMatch[1];
const firebaseConfig = eval(`(${configStr})`);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HR_COLLECTIONS = [
  "attendance_logs",
  "hr_attendance",
  "hr_violations",
  "hr_leaves",
  "leaves",
  "hr_advances",
  "hr_bonuses",
  "hr_petitions",
  "hr_assets",
  "employee_alerts",
  "missing_punches",
  "employees",
  "reports",
  "supervisorReports",
  "supervisorTasks",
  "access_accounts",
  "production_logs"
];

async function run() {
  console.log("Analyzing HR Collections in Firestore...");
  const results = [];
  for (const colName of HR_COLLECTIONS) {
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
