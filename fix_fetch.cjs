const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const target = `  const fetchData = async () => {
    setLoading(true);
    const [stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData] = await Promise.all([
      getStock(),
      getGlobalSettings(),
      getStockVouchers(),
      getCustomers(),
      getEmployees(),
      getSalesOrders(),
      getMissions(),
      getStocktakes()
    ]);
    setStock(stockData);
    setGlobalSettings(settingsData);
    setVouchers(vouchersData || []);
    setCustomers(customersData || []);
    setEmployees(employeesData || []);
    setSalesOrders(salesData || []);
    setMissions(missionsData || []);
    setStocktakes(stocktakesData || []);
    setLoading(false);
  };`;

const replacement = `  const fetchData = async () => {
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
    setGlobalSettings(settingsData);
    setVouchers(vouchersData || []);
    setCustomers(customersData || []);
    setEmployees(employeesData || []);
    setSalesOrders(salesData || []);
    setMissions(missionsData || []);
    setStocktakes(stocktakesData || []);
    setAssets(assetsData || []);
    setLoading(false);
  };`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Successfully replaced fetchData!");
} else {
    console.log("Target not found!");
}
