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

async function main() {
    console.log("Fetching stock items...");
    const snap = await getDocs(collection(db, 'stock'));
    const allStock = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    const sewingItems = allStock.filter(item => 
        item.category === 'مستهلكات الخياطة' || 
        item.category === 'مستلزمات خياطة' ||
        (item.category && item.category.includes('خياطة')) ||
        (item.category && item.category.includes('مستهلكات'))
    );
    
    console.log(`Found ${sewingItems.length} sewing consumables.`);
    
    // Group by unique name or itemNumber to ensure consistent renumbering
    // We group by itemNumber if available, to treat multiple instances of the same item as one group.
    const grouped = {};
    for (const item of sewingItems) {
        // Group by itemNumber, fallback to name
        const key = item.itemNumber || item.name;
        if (!grouped[key]) grouped[key] = { items: [], name: item.name, oldItemNumbers: new Set() };
        grouped[key].items.push(item);
        if (item.itemNumber) grouped[key].oldItemNumbers.add(item.itemNumber);
    }
    
    // Convert to array and sort alphabetically by name
    const uniqueGroups = Object.values(grouped);
    uniqueGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    
    console.log(`Grouped into ${uniqueGroups.length} unique items to renumber.`);
    
    let batch = writeBatch(db);
    let opCount = 0;
    
    const commitBatch = async () => {
        if (opCount > 0) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
        }
    };
    
    const incrementOp = async () => {
        opCount++;
        if (opCount >= 450) await commitBatch();
    };
    
    // 1. Update stock
    let counter = 1;
    const oldToNewMap = {}; // mapping old itemNumber -> new itemNumber
    
    for (const group of uniqueGroups) {
        const newNumber = `CON-${String(counter).padStart(5, '0')}`;
        console.log(`Assigning ${newNumber} to ${group.name}`);
        
        for (const oldNum of group.oldItemNumbers) {
            oldToNewMap[oldNum] = newNumber;
        }
        
        for (const item of group.items) {
            const ref = doc(db, 'stock', item.id);
            batch.update(ref, {
                itemNumber: newNumber,
                itemCode: '' // Remove itemCode as requested
            });
            await incrementOp();
        }
        counter++;
    }
    
    console.log("Updating stock_vouchers...");
    // 2. Update stock_vouchers
    const vouchersSnap = await getDocs(collection(db, 'stock_vouchers'));
    for (const d of vouchersSnap.docs) {
        const data = d.data();
        if (data.items && Array.isArray(data.items)) {
            let changed = false;
            const newItems = data.items.map(vItem => {
                if (vItem.itemNumber && oldToNewMap[vItem.itemNumber]) {
                    changed = true;
                    return { ...vItem, itemNumber: oldToNewMap[vItem.itemNumber] };
                }
                return vItem;
            });
            if (changed) {
                batch.update(doc(db, 'stock_vouchers', d.id), { items: newItems });
                await incrementOp();
            }
        }
    }
    
    console.log("Updating hr_assets...");
    // 3. Update hr_assets
    const assetsSnap = await getDocs(collection(db, 'hr_assets'));
    for (const d of assetsSnap.docs) {
        const data = d.data();
        if (data.itemNumber && oldToNewMap[data.itemNumber]) {
            batch.update(doc(db, 'hr_assets', d.id), { 
                itemNumber: oldToNewMap[data.itemNumber] 
            });
            await incrementOp();
        }
    }
    
    console.log("Updating stocktakes...");
    // 4. Update stocktakes
    const stocktakesSnap = await getDocs(collection(db, 'stocktakes'));
    for (const d of stocktakesSnap.docs) {
        const data = d.data();
        let changed = false;
        if (data.items && Array.isArray(data.items)) {
            const newItems = data.items.map(sItem => {
                if (sItem.itemNumber && oldToNewMap[sItem.itemNumber]) {
                    changed = true;
                    return { ...sItem, itemNumber: oldToNewMap[sItem.itemNumber] };
                }
                return sItem;
            });
            if (changed) {
                batch.update(doc(db, 'stocktakes', d.id), { items: newItems });
                await incrementOp();
            }
        }
    }
    
    await commitBatch();
    console.log("Successfully completed updates! The items have been sorted, renumbered to CON-00001+, and itemCode removed.");
    process.exit(0);
}

main().catch(console.error);
