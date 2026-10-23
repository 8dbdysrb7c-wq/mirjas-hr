import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, initializeFirestore, limit, orderBy, query, runTransaction, setDoc, where } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
//#region src/firebase.js
const app = initializeApp({
	apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
	authDomain: "mirjaswork.firebaseapp.com",
	projectId: "mirjaswork",
	storageBucket: "mirjaswork.firebasestorage.app",
	messagingSenderId: "742199978686",
	appId: "1:742199978686:web:6fc97d192fa99d8dd60cef",
	measurementId: "G-1D6XHXSKVG"
});
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
typeof window !== "undefined" && getAnalytics(app);
//#endregion
//#region src/utils/stockAvailability.js
const cleanStockProductName = (value) => {
	let result = String(value || "");
	let prev;
	do {
		prev = result;
		result = result.replace(/\s*\(المتوفر:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, "").replace(/\s*\(الموجود:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المحجوز:\s*[-+]?\d+(?:\.\d+)?\s*\|\s*المتاح:\s*[-+]?\d+(?:\.\d+)?\)\s*$/, "").replace(/\s*\(مستودع:\s*[^\)]+\)\s*$/, "").trim();
	} while (result !== prev);
	return result;
};
const isCancelledOrder = (order) => {
	const status = String(order?.status || "").trim();
	return status === "ملغي" || status === "ملغى" || Boolean(order?.ignoredAudit);
};
const isReservableSalesItem = (item) => {
	const status = String(item?.itemStatus || "").trim();
	return [
		"جاهز",
		"قيد التجهيز",
		"جاهز للتسليم",
		"تم التجهيز",
		"تم التسليم"
	].includes(status);
};
const buildReservedQuantityMap = (orders = [], excludedOrderId = "") => {
	const reserved = {};
	orders.forEach((order) => {
		if (order?.stockDeducted || isCancelledOrder(order) || excludedOrderId && order?.id === excludedOrderId) return;
		(order?.items || []).forEach((item) => {
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
//#endregion
//#region src/services/sales.js
const getOrders = async () => {
	try {
		return (await getDocs(collection(db, "orders"))).docs.map((doc) => ({
			...doc.data(),
			id: doc.id
		})).filter((order) => !String(order.orderNumber || "").trim().toUpperCase().startsWith("PREP-"));
	} catch (error) {
		console.error("Error in getOrders:", error);
		return [];
	}
};
const syncProductionStatusToSalesOrder = async (prodOrPrepOrder, orderType = "auto") => {
	if (!prodOrPrepOrder) return false;
	try {
		const isPrep = orderType === "preparation" || String(prodOrPrepOrder.orderNumber || "").toUpperCase().startsWith("PREP-") || !!prodOrPrepOrder.hasPreparationDetails;
		let salesOrderDoc = null;
		if (prodOrPrepOrder.salesOrderId) {
			const snap = await getDoc(doc(db, "sales_orders", prodOrPrepOrder.salesOrderId));
			if (snap.exists()) salesOrderDoc = {
				...snap.data(),
				id: snap.id
			};
		}
		if (!salesOrderDoc && prodOrPrepOrder.salesOrderNumber) {
			const snap = await getDocs(query(collection(db, "sales_orders"), where("orderNumber", "==", prodOrPrepOrder.salesOrderNumber), limit(1)));
			if (!snap.empty) salesOrderDoc = {
				...snap.docs[0].data(),
				id: snap.docs[0].id
			};
		}
		if (!salesOrderDoc && prodOrPrepOrder.orderNotes) {
			const match = prodOrPrepOrder.orderNotes.match(/ORD-\d+/);
			if (match) {
				const snap = await getDocs(query(collection(db, "sales_orders"), where("orderNumber", "==", match[0]), limit(1)));
				if (!snap.empty) salesOrderDoc = {
					...snap.docs[0].data(),
					id: snap.docs[0].id
				};
			}
		}
		if (!salesOrderDoc || !Array.isArray(salesOrderDoc.items) || salesOrderDoc.items.length === 0) return false;
		const normalize = (str) => String(str || "").replace(/أ|إ|آ/g, "ا").replace(/ى/g, "ي").trim().replace(/\s+/g, " ");
		const cardStatus = prodOrPrepOrder.status || "";
		const cardItems = Array.isArray(prodOrPrepOrder.items) && prodOrPrepOrder.items.length > 0 ? prodOrPrepOrder.items : [{
			productName: prodOrPrepOrder.productName,
			quantity: prodOrPrepOrder.quantity,
			status: cardStatus
		}];
		let hasChanged = false;
		const updatedSalesItems = salesOrderDoc.items.map((salesItem) => {
			const sName = normalize(salesItem.productName);
			const matchedCardItem = cardItems.find((ci) => {
				const cName = normalize(ci.productName);
				return cName === sName || cName.includes(sName) || sName.includes(cName);
			}) || (cardItems.length === 1 && salesOrderDoc.items.length === 1 ? cardItems[0] : null);
			if (!matchedCardItem) return salesItem;
			let newStatus = salesItem.itemStatus;
			if (isPrep) {
				const isFinished = cardStatus === "منتهي" || matchedCardItem.status === "منتهي" || matchedCardItem.status === "جاهز";
				const isCancelled = cardStatus === "ملغي" || matchedCardItem.status === "ملغي";
				if (isFinished) newStatus = "جاهز";
				else if (isCancelled) newStatus = "ملغي";
				else newStatus = "قيد التحضير";
			} else {
				const isFinished = cardStatus === "منتهي" || matchedCardItem.status === "منتهي" || matchedCardItem.status === "جاهز";
				const isCancelled = cardStatus === "ملغي" || matchedCardItem.status === "ملغي";
				if (isFinished) newStatus = "جاهز";
				else if (isCancelled) newStatus = "ملغي";
				else if (matchedCardItem.stageQuantities) {
					const sq = matchedCardItem.stageQuantities;
					const sewing = Number(sq.sewing || 0);
					const pending = Number(sq.pendingPackaging || 0);
					const pkg = Number(sq.packaging || 0);
					const fin = Number(sq.finished || 0);
					const tot = Number(matchedCardItem.quantity || sewing + pending + pkg + fin || 0);
					if (tot > 0 && fin >= tot) newStatus = "جاهز";
					else if (pending > 0 || pkg > 0 || fin > 0 && sewing === 0) newStatus = "إنتاج قيد التغليف";
					else newStatus = "إنتاج قيد الخياطة";
				} else {
					const cItemStatus = matchedCardItem.status || cardStatus;
					if ([
						"مرحلة التغليف",
						"بانتظار استلام التغليف",
						"تحويل جزئي للتغليف",
						"تغليف جزئي",
						"تم التحويل إلى قسم التغليف"
					].includes(cItemStatus)) newStatus = "إنتاج قيد التغليف";
					else newStatus = "إنتاج قيد الخياطة";
				}
			}
			if (newStatus && newStatus !== salesItem.itemStatus) {
				hasChanged = true;
				let itemToReturn = {
					...salesItem,
					itemStatus: newStatus
				};
				if (newStatus === "ملغي") {
					const noteText = isPrep ? "(تم إلغاء الصنف في التحضير)" : "(تم إلغاء الصنف في الإنتاج)";
					const currNotes = itemToReturn.notes || "";
					if (!currNotes.includes(noteText)) itemToReturn.notes = currNotes ? `${currNotes} ${noteText}` : noteText;
				}
				return itemToReturn;
			}
			return salesItem;
		});
		if (hasChanged) {
			await setDoc(doc(db, "sales_orders", salesOrderDoc.id), {
				items: updatedSalesItems,
				lastActionBy: isPrep ? "نظام التحضير" : "نظام الإنتاج",
				statusUpdateDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
			}, { merge: true });
			return true;
		}
		return false;
	} catch (err) {
		console.error("Error in syncProductionStatusToSalesOrder:", err);
		return false;
	}
};
const saveOrder = async (order) => {
	try {
		let orderToSave = { ...order };
		let isNew = !orderToSave.id;
		let oldStatus = null;
		if (!isNew) try {
			const oldSnap = await getDoc(doc(db, "orders", orderToSave.id));
			if (oldSnap.exists()) oldStatus = oldSnap.data().status;
		} catch (e) {}
		if (!orderToSave.id) {
			const maxNum = (await getOrders()).reduce((max, o) => {
				const match = String(o.orderNumber || "").match(/\d+/);
				return match ? Math.max(max, parseInt(match[0], 10)) : max;
			}, 0);
			orderToSave.orderNumber = `PRO-${String(maxNum + 1).padStart(4, "0")}`;
			const docRef = doc(collection(db, "orders"));
			orderToSave.id = docRef.id;
			await setDoc(docRef, orderToSave);
		} else {
			if (oldStatus !== orderToSave.status) orderToSave.statusHistory = [...Array.isArray(orderToSave.statusHistory) ? orderToSave.statusHistory : [], {
				from: oldStatus || "",
				to: orderToSave.status,
				changedAt: (/* @__PURE__ */ new Date()).toISOString(),
				changedBy: orderToSave.lastActionBy || orderToSave.updatedBy || "النظام"
			}];
			await setDoc(doc(db, "orders", orderToSave.id), orderToSave);
		}
		if (isNew) orderToSave.orderNumber, orderToSave.productName || orderToSave.items && orderToSave.items[0]?.productName, orderToSave.quantity || orderToSave.items && orderToSave.items[0]?.quantity, orderToSave.responsibleEmployeeId;
		else if (oldStatus !== orderToSave.status) orderToSave.orderNumber, orderToSave.status, orderToSave.responsibleEmployeeId;
		try {
			await syncProductionStatusToSalesOrder(orderToSave, "production");
		} catch (e) {
			console.error("Error syncing production order to sales:", e);
		}
		return orderToSave;
	} catch (error) {
		console.error("Error in saveOrder:", error);
		return null;
	}
};
const getPreparationOrders = async () => {
	try {
		return (await getDocs(collection(db, "preparation_orders"))).docs.map((doc) => ({
			...doc.data(),
			id: doc.id
		}));
	} catch (error) {
		console.error("Error in getPreparationOrders:", error);
		return [];
	}
};
const savePreparationOrder = async (order) => {
	try {
		let orderToSave = { ...order };
		let isNew = !orderToSave.id;
		let oldOrder = null;
		if (!isNew) {
			const docSnap = await getDoc(doc(db, "preparation_orders", orderToSave.id));
			if (docSnap.exists()) oldOrder = docSnap.data();
		}
		if (!orderToSave.id) {
			const maxNum = (await getPreparationOrders()).reduce((max, o) => {
				const match = String(o.orderNumber || "").match(/\d+/);
				return match ? Math.max(max, parseInt(match[0], 10)) : max;
			}, 0);
			orderToSave.orderNumber = `PREP-${String(maxNum + 1).padStart(4, "0")}`;
			const docRef = doc(collection(db, "preparation_orders"));
			orderToSave.id = docRef.id;
			await setDoc(docRef, orderToSave);
		} else await setDoc(doc(db, "preparation_orders", orderToSave.id), orderToSave);
		if (isNew) orderToSave.orderNumber, orderToSave.productName || orderToSave.items && orderToSave.items[0]?.productName, orderToSave.quantity || orderToSave.items && orderToSave.items[0]?.quantity, orderToSave.responsibleEmployeeId;
		else if (oldOrder && oldOrder.status !== orderToSave.status) orderToSave.orderNumber, orderToSave.status, orderToSave.responsibleEmployeeId;
		try {
			await syncProductionStatusToSalesOrder(orderToSave, "preparation");
		} catch (e) {
			console.error("Error syncing preparation order to sales:", e);
		}
		return orderToSave;
	} catch (error) {
		console.error("Error in savePreparationOrder:", error);
		return null;
	}
};
const saveSalesOrder = async (order, { preserveStatus = false } = {}) => {
	try {
		let orderToSave = { ...order };
		let isNew = !orderToSave.id;
		let oldStatus = null;
		let previousOrder = null;
		if (!isNew) try {
			const oldSnap = await getDoc(doc(db, "sales_orders", orderToSave.id));
			if (oldSnap.exists()) {
				previousOrder = {
					...oldSnap.data(),
					id: oldSnap.id
				};
				oldStatus = oldSnap.data().status;
			}
		} catch (e) {}
		const oldReservations = previousOrder ? buildReservedQuantityMap([previousOrder]) : {};
		const newReservations = !orderToSave.stockDeducted && !isCancelledOrder(orderToSave) ? buildReservedQuantityMap([orderToSave]) : {};
		const reservationKeys = [...new Set([...Object.keys(oldReservations), ...Object.keys(newReservations)])];
		const candidateNames = [...new Set([
			...reservationKeys,
			...reservationKeys.map((k) => k.split(" - ")[0].trim()),
			...(orderToSave.items || []).map((i) => cleanStockProductName(i.productName || i.name)),
			...(previousOrder?.items || []).map((i) => cleanStockProductName(i.productName || i.name))
		])].filter(Boolean);
		const ordersPromise = (async () => {
			try {
				if (!orderToSave.id) return (await getDocs(query(collection(db, "sales_orders"), orderBy("orderNumber", "desc"), limit(10)))).docs.map((d) => ({
					...d.data(),
					id: d.id
				}));
				else return (await getDocs(query(collection(db, "sales_orders"), where("status", "in", [
					"جديد",
					"قيد التجهيز",
					"قيد التنفيذ",
					"جاهز",
					"قيد الإنتاج",
					"قيد التحضير",
					"جاهز للتسليم",
					"جاهز للتسليم للتوصيل"
				])))).docs.map((d) => ({
					...d.data(),
					id: d.id
				}));
			} catch (err) {
				console.error("Error fetching targeted sales orders:", err);
				throw new Error("تعذر قراءة بيانات الطلبيات للتحقق من الترقيم والحجز. تم إلغاء العملية لمنع استنزاف الحصة.");
			}
		})();
		const stockPromise = (async () => {
			if (candidateNames.length === 0) return { docs: [] };
			try {
				const chunks = [];
				for (let i = 0; i < candidateNames.length; i += 30) chunks.push(candidateNames.slice(i, i + 30));
				const snapshots = await Promise.all(chunks.map((chunk) => getDocs(query(collection(db, "stock"), where("name", "in", chunk)))));
				const docs = [];
				snapshots.forEach((snap) => {
					(snap?.docs || []).forEach((d) => docs.push(d));
				});
				return { docs };
			} catch (err) {
				console.error("Error fetching targeted stock items:", err);
				throw new Error("تعذر قراءة بيانات المخزون المحددة للتحقق من الكميات. تم إلغاء العملية لمنع استنزاف الحصة.");
			}
		})();
		const [relevantOrders, stockSnapshot] = await Promise.all([ordersPromise, stockPromise]);
		if (!orderToSave.id) {
			const maxNum = relevantOrders.reduce((max, o) => {
				const str = String(o.orderNumber || "");
				if (str.startsWith("ORD-")) {
					const match = str.match(/ORD-(\d+)/);
					return match ? Math.max(max, parseInt(match[1], 10)) : max;
				}
				return max;
			}, 0);
			orderToSave.orderNumber = `ORD-${String(maxNum + 1).padStart(4, "0")}`;
			orderToSave.id = doc(collection(db, "sales_orders")).id;
		}
		const items = Array.isArray(orderToSave.items) ? orderToSave.items : [];
		const allItemsReady = items.length > 0 && items.every((item) => String(item.itemStatus || "").trim() === "جاهز");
		if (!preserveStatus && allItemsReady && ![
			"منتهي",
			"تم التسليم",
			"تم التسليم للتوصيل",
			"تم تسليمها للتوصيل",
			"تم التوصيل",
			"ملغي",
			"ملغى"
		].includes(String(orderToSave.status || "").trim())) {
			orderToSave.status = "جاهز للتسليم للتوصيل";
			orderToSave.readyForDeliveryAt = orderToSave.readyForDeliveryAt || (/* @__PURE__ */ new Date()).toISOString();
			orderToSave.readyForDeliveryBy = orderToSave.lastActionBy || orderToSave.updatedBy || orderToSave.createdBy || "النظام";
		}
		const existingReservations = buildReservedQuantityMap(relevantOrders, orderToSave.id);
		const physicalByProduct = {};
		stockSnapshot.docs.forEach((stockDoc) => {
			const item = stockDoc.data();
			const key = cleanStockProductName(`${String(item.name || "").trim()}${item.spec ? ` - ${String(item.spec).trim()}` : ""}`);
			physicalByProduct[key] = (physicalByProduct[key] || 0) + Number(item.quantity || 0);
			const rawName = cleanStockProductName(item.name);
			if (rawName && physicalByProduct[rawName] === void 0) physicalByProduct[rawName] = Number(item.quantity || 0);
		});
		await runTransaction(db, async (transaction) => {
			const reservationSnapshots = /* @__PURE__ */ new Map();
			await Promise.all(reservationKeys.map(async (key) => {
				const reservationRef = doc(db, "stock_reservations", encodeURIComponent(key));
				reservationSnapshots.set(key, {
					ref: reservationRef,
					snap: await transaction.get(reservationRef)
				});
			}));
			for (const key of reservationKeys) {
				const entry = reservationSnapshots.get(key);
				const storedTotal = entry.snap.exists() ? Number(entry.snap.data().quantity || 0) : Number(existingReservations[key] || 0) + Number(oldReservations[key] || 0);
				const nextTotal = Math.max(0, storedTotal - Number(oldReservations[key] || 0) + Number(newReservations[key] || 0));
				if ((orderToSave.items || []).some((item) => cleanStockProductName(item.productName || item.name) === key && isReservableSalesItem(item)) && nextTotal > Number(physicalByProduct[key] || 0)) throw new Error(`الكمية المتاحة للصنف ${key} لا تكفي بسبب حجز طلبية أخرى في نفس الوقت`);
				transaction.set(entry.ref, {
					productKey: key,
					quantity: nextTotal,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
					lastOrderNumber: orderToSave.orderNumber || ""
				});
			}
			transaction.set(doc(db, "sales_orders", orderToSave.id), orderToSave);
		});
		if (isNew) orderToSave.orderNumber, orderToSave.totalPrice, orderToSave.customerName, orderToSave.salespersonId;
		else if (oldStatus !== orderToSave.status) orderToSave.orderNumber, orderToSave.status, orderToSave.totalPrice, orderToSave.salespersonId;
		saveSalesOrder.lastError = null;
		return orderToSave;
	} catch (error) {
		console.error("Error in saveSalesOrder:", error);
		saveSalesOrder.lastError = error;
		return null;
	}
};
saveSalesOrder.lastError = null;
//#endregion
//#region scripts/convert_requested_drafts.mjs
const targets = [
	"draft_admin_0a114e75-120b-4009-bdbc-f7ca0e96f823",
	"draft_admin_745ec075-6e5c-4acd-8d3a-c08cdf291bf3",
	"draft_admin_6e24ceda-447b-4703-b3b8-3014a94523db",
	"draft_admin_7b9d28e0-1ffb-4f8a-a645-7e7c4859615c"
];
const apply = process.argv.includes("--apply");
const result = [];
for (const id of targets) {
	if (process.argv.includes("--skip-size-conflict") && id === "draft_admin_745ec075-6e5c-4acd-8d3a-c08cdf291bf3") continue;
	const snap = await getDoc(doc(db, "sales_order_drafts", id));
	if (!snap.exists()) throw Error("Missing draft " + id);
	const draft = snap.data(), f = draft.formData;
	if (!f.customerName || !f.items?.length || f.items.some((i) => !i.productName || !(Number(i.quantity) > 0) || !i.itemStatus)) throw Error("Incomplete draft " + id);
	if (new Set(f.items.map((i) => i.productName)).size !== f.items.length) throw Error("Duplicate item " + id);
	for (const item of f.items) {
		const required = item.itemStatus === "قيد الإنتاج" ? ["linkedProductionOrder"] : item.itemStatus === "قيد التحضير" ? ["linkedPreparationOrder"] : item.itemStatus === "تحضير وإنتاج" ? ["linkedProductionOrder", "linkedPreparationOrder"] : [];
		for (const key of required) if (!draft[key]?.items?.some((i) => i.productName === item.productName && Number(i.quantity) > 0)) throw Error("Missing linked card " + item.productName);
	}
	console.log(JSON.stringify({
		customer: f.customerName,
		count: f.items.length,
		production: draft.linkedProductionOrder?.items,
		preparation: draft.linkedPreparationOrder?.items
	}));
	if (!apply) continue;
	let saved = (await getDocs(collection(db, "sales_orders"))).docs.map((d) => ({
		...d.data(),
		id: d.id
	})).find((o) => o.sourceDraftId === id);
	if (!saved) {
		saved = await saveSalesOrder({
			...f,
			id: null,
			sourceDraftId: id,
			createdBy: draft.userName,
			lastActionBy: draft.userName,
			statusUpdateDate: "2026-10-07"
		});
		if (!saved) throw saveSalesOrder.lastError || Error("Save failed");
	}
	const row = {
		draftId: id,
		orderNumber: saved.orderNumber,
		id: saved.id,
		customer: saved.customerName
	};
	for (const [key, col, save] of [[
		"linkedProductionOrder",
		"orders",
		saveOrder
	], [
		"linkedPreparationOrder",
		"preparation_orders",
		savePreparationOrder
	]]) {
		const card = draft[key];
		if (!card?.items?.length) continue;
		let savedCard = (await getDocs(collection(db, col))).docs.map((d) => ({
			...d.data(),
			id: d.id
		})).find((o) => o.sourceDraftId === id);
		if (!savedCard) {
			savedCard = await save({
				...card,
				id: null,
				sourceDraftId: id,
				salesOrderId: saved.id,
				salesOrderNumber: saved.orderNumber,
				orderNotes: String(card.orderNotes || "").replaceAll(f.orderNumber, saved.orderNumber),
				createdBy: draft.userName,
				lastActionBy: draft.userName
			});
			if (!savedCard) throw Error("Card save failed " + id);
		}
		row[col] = savedCard.orderNumber;
	}
	await setDoc(doc(db, "sales_order_draft_conversion_receipts", id), {
		...row,
		convertedAt: (/* @__PURE__ */ new Date()).toISOString(),
		draftBackup: draft
	});
	result.push(row);
	fs.writeFileSync("artifacts/converted-sales-drafts.json", JSON.stringify(result, null, 2));
	console.log("SAVED " + JSON.stringify(row));
}
process.exit(0);
//#endregion
export {};
