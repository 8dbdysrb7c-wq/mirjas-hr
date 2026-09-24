import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';

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

// Reproduce exact functions from stockAvailability.js
const cleanStockProductName = (value) => String(value || '')
  .replace(/\s*\(المتوفر:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, '')
  .replace(/\s*\(الموجود:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المحجوز:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المتاح:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, '')
  .trim();

const isCancelledOrder = (order) => {
  const status = String(order?.status || '').trim();
  return status === 'ملغي' || status === 'ملغى' || Boolean(order?.ignoredAudit);
};

const isReservableSalesItem = (item) => {
  const status = String(item?.itemStatus || '').trim();
  return ['جاهز', 'قيد التجهيز', 'جاهز للتسليم', 'تم التجهيز', 'تم التسليم'].includes(status);
};

const buildReservedQuantityMap = (orders = [], excludedOrderId = '') => {
  const reserved = {};
  orders.forEach(order => {
    if (order?.stockDeducted || isCancelledOrder(order) || (excludedOrderId && order?.id === excludedOrderId)) return;
    (order?.items || []).forEach(item => {
      const immediateReservation = isReservableSalesItem(item) ? Number(item.quantity) || 0 : 0;
      const receivedReservation = Math.min(Number(item.quantity) || 0, Number(item.receivedReservedQuantity) || 0);
      const quantity = Math.max(immediateReservation, receivedReservation);
      if (quantity <= 0) return;
      const key = cleanStockProductName(item.productName || item.name);
      if (key && quantity > 0) reserved[key] = (reserved[key] || 0) + quantity;
    });
  });
  return reserved;
};

async function testSave() {
  console.log("Reading all sales_orders and stock...");
  const [salesSnap, stockSnap] = await Promise.all([
    getDocs(collection(db, 'sales_orders')),
    getDocs(collection(db, 'stock'))
  ]);
  const allOrders = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${allOrders.length} sales orders and ${stockSnap.size} stock items.`);

  const orderToSave = {
    customerName: "مخازن المدينة التجارية",
    orderDate: "2026-09-15",
    deliveryDate: "2026-09-17",
    status: "جديد",
    orderNotes: "تسليم فرع عمان مول",
    items: [
      {
        productName: "مخدة رويال ميموري فوم",
        quantity: 12,
        notes: "تشكيلة من لونين",
        itemStatus: "قيد التجهيز"
      },
      {
        productName: "مسند ساند طبي ظهر",
        quantity: 1,
        notes: "شتوي",
        itemStatus: "قيد التجهيز"
      },
      {
        productName: "مخدة طبية فندقية فخمة",
        quantity: 12,
        notes: "قماش البولستر الجديد",
        itemStatus: "قيد التجهيز"
      }
    ],
    createdBy: "عماد فتحي زياد عزيز عوض",
    lastActionBy: "عماد فتحي زياد عزيز عوض"
  };

  const existingReservations = buildReservedQuantityMap(allOrders);
  const newReservations = buildReservedQuantityMap([orderToSave]);
  console.log("New reservations to add:", newReservations);

  const reservationKeys = [...new Set([...Object.keys(newReservations)])];
  console.log("Reservation keys:", reservationKeys);

  const physicalByProduct = {};
  stockSnap.docs.forEach(stockDoc => {
    const item = stockDoc.data();
    const key = cleanStockProductName(`${String(item.name || '').trim()}${item.spec ? ` - ${String(item.spec).trim()}` : ''}`);
    physicalByProduct[key] = (physicalByProduct[key] || 0) + Number(item.quantity || 0);
  });

  for (const key of reservationKeys) {
    console.log(`Product: "${key}" | Physical in stock: ${physicalByProduct[key]} | Existing reserved: ${existingReservations[key] || 0} | New to reserve: ${newReservations[key]}`);
  }

  // Check if stock_reservations documents exist or how they look
  for (const key of reservationKeys) {
    const encKey = encodeURIComponent(key);
    console.log(`Key: "${key}" -> encoded: "${encKey}"`);
    try {
      const docRef = doc(db, 'stock_reservations', encKey);
      const snap = await getDoc(docRef);
      console.log(`Document exists: ${snap.exists()}, data:`, snap.data());
    } catch (err) {
      console.error(`Error reading stock_reservations for "${key}":`, err);
    }
  }

  // Now test the transaction dry-run without writing if we want, or test transaction get:
  try {
    await runTransaction(db, async transaction => {
      const reservationSnapshots = new Map();
      for (const key of reservationKeys) {
        const ref = doc(db, 'stock_reservations', encodeURIComponent(key));
        const snap = await transaction.get(ref);
        reservationSnapshots.set(key, { ref, snap });
        console.log(`Inside transaction: got snap for ${key}`);
      }
      // Check validation
      for (const key of reservationKeys) {
        const entry = reservationSnapshots.get(key);
        const storedTotal = entry.snap.exists()
          ? Number(entry.snap.data().quantity || 0)
          : Number(existingReservations[key] || 0);
        const nextTotal = storedTotal + Number(newReservations[key] || 0);
        console.log(`Key ${key}: stored=${storedTotal}, nextTotal=${nextTotal}, physical=${physicalByProduct[key]}`);
        if (nextTotal > Number(physicalByProduct[key] || 0)) {
          throw new Error(`الكمية المتاحة للصنف ${key} لا تكفي بسبب حجز طلبية أخرى في نفس الوقت (المتاح: ${physicalByProduct[key]}, المطلوب حجزه: ${nextTotal})`);
        }
      }
      console.log("Transaction validation PASSED! Not writing to avoid polluting test.");
    });
  } catch (txErr) {
    console.error("TRANSACTION ERROR:", txErr.message);
  }
}

testSave().catch(console.error);
