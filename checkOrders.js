import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import fs from 'fs';

const firebaseConfigStr = fs.readFileSync('c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/store.js', 'utf8');
const match = firebaseConfigStr.match(/const firebaseConfig = ({[\s\S]*?});/);
let firebaseConfig;
if (match) {
  eval(`firebaseConfig = ${match[1]}`);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOrders() {
  try {
    console.log("Fetching orders from 'orders' collection...");
    const q = query(collection(db, "orders"));
    const snapshot = await getDocs(q);
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    console.log("Total Production Orders:", orders.length);
    orders.sort((a,b) => (b.orderNumber || '').localeCompare(a.orderNumber || ''));
    console.log("Recent Production Orders:");
    orders.slice(0, 5).forEach(o => {
      console.log(`- ${o.orderNumber} | Customer: ${o.customerName} | SalesOrder: ${o.salesOrderNumber} | Items: ${o.items?.length}`);
    });

    console.log("\nFetching orders from 'sales_orders' collection...");
    const q2 = query(collection(db, "sales_orders"));
    const snapshot2 = await getDocs(q2);
    const salesOrders = [];
    snapshot2.forEach(doc => {
      salesOrders.push({ id: doc.id, ...doc.data() });
    });
    console.log("Total Sales Orders:", salesOrders.length);
    salesOrders.sort((a,b) => (b.orderNumber || '').localeCompare(a.orderNumber || ''));
    console.log("Recent Sales Orders:");
    salesOrders.slice(0, 5).forEach(o => {
      console.log(`- ${o.orderNumber} | Customer: ${o.customerName} | Items: ${o.items?.length}`);
    });
    
  } catch (e) {
    console.error(e);
  }
}

checkOrders();
