import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalize = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');

async function main() {
  const [costingsSnap, stockSnap] = await Promise.all([
    getDocs(collection(db, 'product_costings')),
    getDocs(collection(db, 'stock'))
  ]);

  const costings = costingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const stockByName = new Map();
  const stockByCode = new Map();

  stock.forEach(item => {
    const cleanName = normalize(item.name);
    if (cleanName && !stockByName.has(cleanName)) stockByName.set(cleanName, item);
    if (item.itemNumber) stockByCode.set(item.itemNumber.toUpperCase(), item);
  });

  console.log("=== فحص البطاقات الـ 58 والتفاصيل الدقيقة ===");
  costings.forEach(c => {
    const cName = normalize(c.productName || c.name);
    const cCode = (c.productCode || c.stockItemNumber || c.code || '').toUpperCase();
    const matchName = stockByName.get(cName);
    const matchCode = stockByCode.get(cCode);

    if (!matchName || matchName.name !== c.productName) {
      console.log(`\nاختلاف مسمى:`);
      console.log(`  بطاقة التكلفة: "${c.productName}" [Code: ${cCode}] (ID: ${c.id})`);
      console.log(`  المخزون حسب الكود: "${matchCode?.name}" [Code: ${matchCode?.itemNumber}] (ID: ${matchCode?.id})`);
    }
  });

  // Also check materials in all costings to ensure all material codes (FAB, CON, PKG) are matching current stock!
  console.log("\n=== فحص المواد الخام ومستهلكات الخياطة والتغليف داخل بطاقات التكلفة ===");
  let updatedMaterialsCount = 0;
  let totalMaterials = 0;

  costings.forEach(c => {
    if (Array.isArray(c.materials)) {
      c.materials.forEach(m => {
        totalMaterials++;
        const mName = normalize(m.name);
        const mStock = stockByName.get(mName);
        if (mStock && mStock.itemNumber && m.itemNumber !== mStock.itemNumber) {
          updatedMaterialsCount++;
          console.log(`  مادة تحتاج تحديث كود في "${c.productName}": "${m.name}" من [${m.itemNumber || 'بدون'}] -> [${mStock.itemNumber}]`);
        }
      });
    }
  });

  console.log(`إجمالي بنود المواد في بطاقات التكلفة: ${totalMaterials}`);
  console.log(`بنود مواد تحتاج تحديث كود المواد الخام/المستهلكات: ${updatedMaterialsCount}`);

  process.exit(0);
}

main().catch(console.error);
