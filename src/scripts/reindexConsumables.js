import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
  measurementId: "G-1D6XHXSKVG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
  console.log("Starting stock re-indexing migration...");
  
  // 1. Fetch all stock items
  const stockSnapshot = await getDocs(collection(db, "stock"));
  const stockDocs = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Fetched ${stockDocs.length} total stock items.`);
  
  const targetCategories = ["مستهلكات خياطة", "مستهلكات الخياطة", "مستلزمات خياطة"];
  
  const consumableStock = stockDocs.filter(item => 
    item.category && targetCategories.includes(item.category.trim())
  );
  
  console.log(`Found ${consumableStock.length} items in category 'مستهلكات خياطة'.`);
  
  // Group unique item names
  const uniqueNamesMap = new Map();
  consumableStock.forEach(item => {
    const name = item.name?.trim();
    if (name) {
      if (!uniqueNamesMap.has(name)) {
        uniqueNamesMap.set(name, []);
      }
      uniqueNamesMap.get(name).push(item);
    }
  });
  
  // Sort names alphabetically (Arabic locale sorting)
  const sortedNames = Array.from(uniqueNamesMap.keys()).sort((a, b) => 
    a.localeCompare(b, "ar")
  );
  
  console.log(`Sorted ${sortedNames.length} unique consumable items alphabetically.`);
  
  // Build new mapping: Name -> New Item Number (CON-XXXXX)
  const newNumMap = new Map(); // Name -> CON-XXXXX
  sortedNames.forEach((name, index) => {
    const sequenceNum = String(index + 1).padStart(5, '0');
    const newItemNumber = `CON-${sequenceNum}`;
    newNumMap.set(name, newItemNumber);
    console.log(`Mapped: "${name}" -> ${newItemNumber}`);
  });
  
  // Update stock items in Firestore with new item numbers
  let updatedStockCount = 0;
  for (const [name, items] of uniqueNamesMap.entries()) {
    const newNo = newNumMap.get(name);
    for (const item of items) {
      if (item.itemNumber !== newNo) {
        const itemRef = doc(db, "stock", item.id);
        await updateDoc(itemRef, { itemNumber: newNo });
        updatedStockCount++;
      }
    }
  }
  
  console.log(`Updated ${updatedStockCount} stock documents with new SKU numbers.`);
  
  // 2. Fetch all custody assets
  const assetsSnapshot = await getDocs(collection(db, "hr_assets"));
  const assetDocs = assetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Fetched ${assetDocs.length} custody documents.`);
  
  let updatedAssetsCount = 0;
  for (const asset of assetDocs) {
    if (Array.isArray(asset.items)) {
      let isModified = false;
      const updatedItems = asset.items.map(item => {
        const itemName = item.name?.trim();
        const itemCat = item.category?.trim();
        const oldNo = item.itemNumber || "";
        
        // Check if this item belongs to the consumables category or is prefix CON-
        const isConsumable = targetCategories.includes(itemCat) || oldNo.startsWith("CON-");
        
        if (isConsumable) {
          if (newNumMap.has(itemName)) {
            const newNo = newNumMap.get(itemName);
            if (oldNo !== newNo) {
              console.log(`Custody update: "${itemName}" -> ${newNo} (old: ${oldNo}) in asset doc ${asset.id}`);
              isModified = true;
              return { ...item, itemNumber: newNo };
            }
          } else {
            // Missing/deleted from stock!
            if (oldNo !== "") {
              console.log(`Custody missing item: "${itemName}" set itemNumber to "" (old: ${oldNo}) in asset doc ${asset.id}`);
              isModified = true;
              return { ...item, itemNumber: "" };
            }
          }
        }
        return item;
      });
      
      if (isModified) {
        const assetRef = doc(db, "hr_assets", asset.id);
        await updateDoc(assetRef, { items: updatedItems });
        updatedAssetsCount++;
      }
    }
  }
  
  console.log(`Updated ${updatedAssetsCount} custody documents in Firestore.`);
  console.log("Migration completed successfully!");
  process.exit(0);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
