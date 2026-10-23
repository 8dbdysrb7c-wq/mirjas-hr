import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

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
  console.log("=== مطابقة وتحديث وتدقيق بطاقات التكلفة مع المخزون وقوائم الأسعار ===");

  const [costingsSnap, stockSnap] = await Promise.all([
    getDocs(collection(db, 'product_costings')),
    getDocs(collection(db, 'stock'))
  ]);

  const costings = costingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const stock = stockSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fgStockByName = new Map();
  const allStockByName = new Map();

  stock.forEach(item => {
    const cleanName = normalize(item.name);
    if (!cleanName) return;
    if (!allStockByName.has(cleanName)) allStockByName.set(cleanName, item);
    if (item.category === 'بضاعة جاهزة' || (item.itemNumber && item.itemNumber.startsWith('FG-'))) {
      if (!fgStockByName.has(cleanName)) fgStockByName.set(cleanName, item);
    }
  });

  console.log(`عدد بطاقات التكلفة الإجمالي: ${costings.length}`);
  console.log(`عدد أصناف البضاعة الجاهزة في المخزون: ${fgStockByName.size}`);

  let batch = writeBatch(db);
  let opCount = 0;

  const commitBatch = async () => {
    if (opCount > 0) {
      await batch.commit();
      console.log(`تم تنفيذ دفعة تحديث (${opCount} عمليات).`);
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  const addOp = async () => {
    opCount++;
    if (opCount >= 400) {
      await commitBatch();
    }
  };

  let updatedCostings = 0;
  const auditReport = [];

  for (const c of costings) {
    let rawName = c.productName || c.name || '';
    let cleanName = normalize(rawName);

    let matchedStock = null;

    // Manual aliases for specific name variations
    const aliases = {
      'شرشف مطاط بيبي 70*140سم': 'شرشف مطاط مايكروفايبر بيبي 70*140سم',
      'شرشف مطاط بيبي 70*140': 'شرشف مطاط مايكروفايبر بيبي 70*140سم'
    };
    if (aliases[cleanName]) {
      cleanName = normalize(aliases[cleanName]);
      matchedStock = fgStockByName.get(cleanName);
    }

    // Try finding exact match in FG stock
    if (!matchedStock) {
      matchedStock = fgStockByName.get(cleanName);
    }

    // If not found, try stripping color/model suffix (e.g. " - موديل 10 بني سادة")
    if (!matchedStock && cleanName.includes(' - ')) {
      const baseName = cleanName.split(' - ')[0].trim();
      matchedStock = fgStockByName.get(baseName);
      if (matchedStock) {
        console.log(`مطابقة بالاسم الأساسي: "${rawName}" -> "${matchedStock.name}"`);
        rawName = matchedStock.name;
        cleanName = normalize(matchedStock.name);
      }
    }

    // If still not found, try partial match (e.g., "شرشف مطاط بيبي" -> "شرشف مطاط مايكروفايبر بيبي")
    if (!matchedStock) {
      for (const [sName, sItem] of fgStockByName.entries()) {
        if (sName.includes(cleanName) || cleanName.includes(sName)) {
          console.log(`مطابقة تقريبية: "${rawName}" -> "${sItem.name}"`);
          matchedStock = sItem;
          rawName = sItem.name;
          cleanName = normalize(sItem.name);
          break;
        }
      }
    }

    if (matchedStock) {
      const targetSku = matchedStock.itemNumber;
      const targetName = matchedStock.name;
      const targetId = matchedStock.id;

      // Check if anything needs updating
      let changed = false;
      const updateData = {};

      if (c.productName !== targetName) {
        updateData.productName = targetName;
        changed = true;
      }
      if (c.productCode !== targetSku) {
        updateData.productCode = targetSku;
        changed = true;
      }
      if (c.stockItemNumber !== targetSku) {
        updateData.stockItemNumber = targetSku;
        changed = true;
      }
      if (c.productId !== targetId) {
        updateData.productId = targetId;
        changed = true;
      }

      // Update materials inside the costing if their codes changed
      if (Array.isArray(c.materials)) {
        let matsChanged = false;
        const updatedMats = c.materials.map(m => {
          const mClean = normalize(m.name);
          const mStock = allStockByName.get(mClean);
          if (mStock && mStock.itemNumber && m.itemNumber !== mStock.itemNumber) {
            matsChanged = true;
            return { ...m, itemNumber: mStock.itemNumber, name: mStock.name };
          }
          return m;
        });
        if (matsChanged) {
          updateData.materials = updatedMats;
          changed = true;
        }
      }

      if (changed) {
        updateData.updatedAt = new Date().toISOString();
        batch.update(doc(db, 'product_costings', c.id), updateData);
        await addOp();
        updatedCostings++;
      }

      auditReport.push({
        status: 'مطابق بنجاح',
        name: targetName,
        code: targetSku,
        costingId: c.id,
        materialsCount: (c.materials || []).length,
        costApplicability: c.costApplicability || 'تكلفة مصنع',
        salePrice: c.salePrice || 0
      });
    } else {
      console.log(`⚠ لم يتم العثور على صنف مخزون لبطاقة التكلفة: "${rawName}"`);
      auditReport.push({
        status: 'غير مطابق بالمخزون',
        name: rawName,
        code: c.productCode,
        costingId: c.id
      });
    }
  }

  await commitBatch();

  console.log(`\n========================================`);
  console.log(`=== اكتمال التدقيق والمطابقة بنجاح! ===`);
  console.log(`- إجمالي بطاقات التكلفة المفحوصة: ${costings.length}`);
  console.log(`- بطاقات التكلفة المحدثة والمتزامنة: ${updatedCostings}`);
  console.log(`- بطاقات التكلفة المطابقة 100%: ${auditReport.filter(r => r.status === 'مطابق بنجاح').length} / ${costings.length}`);
  console.log(`========================================`);

  process.exit(0);
}

main().catch(err => {
  console.error("خطأ:", err);
  process.exit(1);
});
