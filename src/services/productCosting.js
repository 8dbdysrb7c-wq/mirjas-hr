import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';

export const getProductCosting = async (productId) => {
  if (!productId) return null;
  const snap = await getDoc(doc(db, 'product_costings', String(productId)));
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
};

export const getProductCostings = async () => {
  const snap = await getDocs(collection(db, 'product_costings'));
  return snap.docs.map(document => ({ ...document.data(), id: document.id }));
};

export const getProductCostingHistory = async (productId) => {
  if (!productId) return [];
  const snap = await getDocs(query(collection(db, 'product_costing_history'), where('productId', '==', String(productId))));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }))
    .sort((a, b) => String(b.changedAt || '').localeCompare(String(a.changedAt || '')));
};

export const getCostCenterSettings = async () => {
  const snap = await getDoc(doc(db, 'settings', 'productCosting'));
  return snap.exists() ? snap.data() : null;
};

export const saveCostCenterSettings = async (settings, user) => {
  const payload = { ...settings, updatedAt: new Date().toISOString(), updatedBy: user?.name || '' };
  await setDoc(doc(db, 'settings', 'productCosting'), payload, { merge: true });
  return payload;
};

export const saveProductCosting = async (costing, user) => {
  if (!costing?.productId) throw new Error('PRODUCT_REQUIRED');
  const ref = doc(db, 'product_costings', String(costing.productId));
  const oldSnap = await getDoc(ref);
  const previous = oldSnap.exists() ? oldSnap.data() : null;
  const now = new Date().toISOString();
  const previousCost = Number(previous?.finalUnitCost) || 0;
  const currentCost = Number(costing.finalUnitCost) || 0;
  const costChangedAfterApproval = Boolean(previous?.pricingApprovedAt) && Math.abs(previousCost - currentCost) > 0.0005;
  const payload = JSON.parse(JSON.stringify({
    ...costing,
    id: String(costing.productId),
    pricingNeedsReview: costChangedAfterApproval || Boolean(previous?.pricingNeedsReview),
    updatedAt: now,
    updatedBy: user?.name || ''
  }));
  const historyRef = doc(collection(db, 'product_costing_history'));
  const batch = writeBatch(db);
  batch.set(ref, payload);
  batch.set(historyRef, {
    productId: String(costing.productId), productName: costing.productName || '', productCode: costing.productCode || '',
    previousUnitCost: previous?.finalUnitCost ?? null, newUnitCost: payload.finalUnitCost,
    previousSalePrice: previous?.salePrice ?? null, newSalePrice: payload.salePrice,
    costChangePercent: previousCost ? ((currentCost - previousCost) / previousCost) * 100 : null,
    pricingVersion: previous?.pricingVersion || 0,
    changedAt: now, changedBy: user?.name || '', snapshot: payload
  });
  await batch.commit();
  return payload;
};

export const approveProductSellingPrice = async (costing, masterProductId, user) => {
  if (!costing?.productId || !masterProductId) throw new Error('PRODUCT_REQUIRED');
  const costingRef = doc(db, 'product_costings', String(costing.productId));
  const masterRef = doc(db, 'masterProducts', String(masterProductId));
  const [costingSnap, masterSnap] = await Promise.all([getDoc(costingRef), getDoc(masterRef)]);
  const previousCosting = costingSnap.exists() ? costingSnap.data() : {};
  const previousMaster = masterSnap.exists() ? masterSnap.data() : {};
  const pricingVersion = (Number(previousCosting.pricingVersion) || 0) + 1;
  const now = new Date().toISOString();
  const safePricing = {
    basePrice: Number(costing.salePrice) || 0,
    targetPrice: Number(costing.targetPrice || costing.salePrice) || 0,
    minimumPrice: Number(costing.minimumPrice || costing.breakEvenPrice) || 0,
    quantityTiers: (costing.quantityTiers || []).map(t => ({
      from: Number(t.from) || 1, to: t.to === null || t.to === '' ? null : Number(t.to),
      costingDiscountPercent: Number(t.discountPercent) || 0,
      listPrice: Number(costing.salePrice) || 0,
      discountPercent: Number(t.discountPercent) || 0,
      priceListDiscountPercent: Number(t.discountPercent) || 0,
      priceListDiscountOverridden: false,
      targetPrice: Number(t.salePrice) || 0,
      minimumPrice: Number(t.minimumPrice) || 0
    })),
    pricingVersion,
    pricingCostAtApproval: Number(costing.finalUnitCost) || 0,
    pricingApprovedAt: now, pricingApprovedBy: user?.name || ''
  };
  safePricing.pricingSnapshot = {
    source: 'product_costing',
    productId: String(costing.productId),
    version: pricingVersion,
    savedAt: now,
    savedBy: user?.name || '',
    basePrice: safePricing.basePrice,
    targetPrice: safePricing.targetPrice,
    quantityTiers: safePricing.quantityTiers.map(tier => ({ ...tier }))
  };
  const versionRef = doc(collection(db, 'product_pricing_versions'));
  const historyRef = doc(collection(db, 'product_costing_history'));
  const batch = writeBatch(db);
  batch.set(masterRef, safePricing, { merge: true });
  batch.set(costingRef, {
    pricingVersion,
    pricingCostAtApproval: Number(costing.finalUnitCost) || 0,
    pricingNeedsReview: false,
    pricingApprovedAt: now,
    pricingApprovedBy: user?.name || ''
  }, { merge: true });
  batch.set(versionRef, {
    productId: String(costing.productId), masterProductId: String(masterProductId),
    productName: costing.productName || '', productCode: costing.productCode || '',
    version: pricingVersion, approvedAt: now, approvedBy: user?.name || '',
    previousSalePrice: previousMaster?.basePrice ?? previousCosting?.salePrice ?? null,
    previousUnitCost: previousCosting?.pricingCostAtApproval ?? previousCosting?.finalUnitCost ?? null,
    unitCost: Number(costing.finalUnitCost) || 0, salePrice: safePricing.basePrice,
    marginPercent: Number(costing.marginPercent) || 0, markupPercent: Number(costing.markupPercent) || 0,
    quantityTiers: safePricing.quantityTiers, snapshot: JSON.parse(JSON.stringify(costing))
  });
  batch.set(historyRef, {
    type: 'pricing_approval', productId: String(costing.productId), productName: costing.productName || '', productCode: costing.productCode || '',
    pricingVersion, previousUnitCost: previousCosting?.pricingCostAtApproval ?? previousCosting?.finalUnitCost ?? null,
    newUnitCost: Number(costing.finalUnitCost) || 0, previousSalePrice: previousMaster?.basePrice ?? previousCosting?.salePrice ?? null,
    newSalePrice: safePricing.basePrice, changedAt: now, changedBy: user?.name || '', snapshot: costing
  });
  await batch.commit();
  return safePricing;
};
