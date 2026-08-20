/**
 * Builds the exact catalog displayed by the main price-list screen.
 *
 * Stock rows are intentionally kept in the price-list catalog even when the
 * same product also exists in masterProducts. catalogRowId is unique per
 * displayed row so selectors must not collapse those intersections.
 */
export const buildVisiblePriceListCatalog = (masterProducts = [], stockItems = []) => {
  const masters = Array.isArray(masterProducts) ? masterProducts : [];
  const stock = Array.isArray(stockItems) ? stockItems : [];
  const uniqueStockItems = [];
  const seenItemNumbers = new Set();

  stock.forEach((item) => {
    if (item.category !== 'بضاعة جاهزة') return;
    if (item.itemNumber && item.itemNumber.trim() !== '') {
      if (seenItemNumbers.has(item.itemNumber)) return;
      seenItemNumbers.add(item.itemNumber);
    }
    uniqueStockItems.push(item);
  });

  const findMaster = (item) => masters.find((masterProduct) =>
    (masterProduct.itemNumber && item.itemNumber && masterProduct.itemNumber === item.itemNumber)
    || (masterProduct.name && item.name && masterProduct.name.trim() === item.name.trim())
  );
  const usedMasterIds = new Set();
  const visibleProducts = [];

  uniqueStockItems.forEach((item) => {
    const matchedMaster = findMaster(item);
    if (matchedMaster?.excludedFromPriceList) {
      usedMasterIds.add(matchedMaster.id);
      return;
    }
    if (matchedMaster) usedMasterIds.add(matchedMaster.id);

    visibleProducts.push({
      id: matchedMaster?.id || `temp-${item.id}`,
      catalogRowId: `stock:${item.id}`,
      stockId: item.id,
      masterId: matchedMaster?.id || '',
      itemNumber: item.itemNumber || matchedMaster?.itemNumber || '-',
      name: item.name || matchedMaster?.name || 'بدون اسم',
      basePrice: matchedMaster?.basePrice || 0,
      defaultDiscount: matchedMaster?.defaultDiscount || 0,
      targetPrice: matchedMaster?.targetPrice || 0,
      minimumPrice: matchedMaster?.minimumPrice || 0,
      quantityTiers: matchedMaster?.quantityTiers?.length
        ? matchedMaster.quantityTiers
        : (matchedMaster?.pricingSnapshot?.quantityTiers || []),
      pricingSnapshot: matchedMaster?.pricingSnapshot || null,
      pricingApprovedAt: matchedMaster?.pricingApprovedAt || '',
      pricingVersion: matchedMaster?.pricingVersion || 0,
      unit: item.unit || matchedMaster?.unit || 'قطعة',
      category: item.category || matchedMaster?.category || '',
      department: item.department || item.section || matchedMaster?.department || '',
      spec: item.spec || matchedMaster?.spec || '',
      notes: matchedMaster?.notes || '',
      isFromStock: true
    });
  });

  masters.forEach((masterProduct) => {
    if (usedMasterIds.has(masterProduct.id) || masterProduct.excludedFromPriceList) return;
    visibleProducts.push({
      ...masterProduct,
      catalogRowId: `master:${masterProduct.id}`,
      stockId: '',
      masterId: masterProduct.id,
      itemNumber: masterProduct.itemNumber || '-',
      isFromStock: false
    });
  });

  return visibleProducts;
};

