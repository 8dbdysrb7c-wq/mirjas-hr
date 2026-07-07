const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add saveGlobalSettings to the import
if (!content.includes('saveGlobalSettings')) {
  content = content.replace(/getGlobalSettings, isAdmin/, 'getGlobalSettings, saveGlobalSettings, isAdmin');
}

// 2. Modify fetchData
const oldFetchData = `  const fetchData = async () => {
    setLoading(true);
    const [stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData, assetsData] = await Promise.all([
      getStock(),
      getGlobalSettings(),
      getStockVouchers(),
      getCustomers(),
      getEmployees(),
      getSalesOrders(),
      getMissions(),
      getStocktakes(),
      getHRAssets()
    ]);
    setStock(stockData);
    setGlobalSettings(settingsData);`;

const newFetchData = `  const fetchData = async () => {
    setLoading(true);
    const [stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData, assetsData] = await Promise.all([
      getStock(),
      getGlobalSettings(),
      getStockVouchers(),
      getCustomers(),
      getEmployees(),
      getSalesOrders(),
      getMissions(),
      getStocktakes(),
      getHRAssets()
    ]);

    // Auto-sync locations
    const allExistingLocs = [...new Set([
      ...stockData.flatMap(s => (s.location || '').split(/[,، -]/).filter(Boolean)),
      ...assetsData.flatMap(a => (a.items || []).flatMap(i => (i.location || '').split(/[,، -]/).filter(Boolean)))
    ])];
    
    let needsUpdate = false;
    const currentLocs = settingsData.stockLocations || [];
    allExistingLocs.forEach(l => {
      if (!currentLocs.includes(l)) {
        currentLocs.push(l);
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
       settingsData.stockLocations = currentLocs;
       try {
         await saveGlobalSettings(settingsData);
       } catch (e) {
         console.error("Failed to auto-sync locations", e);
       }
    }

    setStock(stockData);
    setGlobalSettings(settingsData);`;

// Let's use regex in case of CRLF issues
const fetchDataRegex = /const fetchData = async \(\) => \{[\s\S]*?const \[stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData, assetsData\] = await Promise\.all\(\[[\s\S]*?getStock\(\),[\s\S]*?getGlobalSettings\(\),[\s\S]*?getStockVouchers\(\),[\s\S]*?getCustomers\(\),[\s\S]*?getEmployees\(\),[\s\S]*?getSalesOrders\(\),[\s\S]*?getMissions\(\),[\s\S]*?getStocktakes\(\),[\s\S]*?getHRAssets\(\)[\s\S]*?\]\);[\s\S]*?setStock\(stockData\);[\s\S]*?setGlobalSettings\(settingsData\);/;

if (fetchDataRegex.test(content)) {
    content = content.replace(fetchDataRegex, newFetchData);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Successfully injected auto-sync into fetchData!");
} else {
    console.log("Could not find fetchData pattern!");
}
