const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Instead of exact string match, we can use regex
content = content.replace(/const \[stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData\] = await Promise\.all\(\[/, 'const [stockData, settingsData, vouchersData, customersData, employeesData, salesData, missionsData, stocktakesData, assetsData] = await Promise.all([');

content = content.replace(/getStocktakes\(\)/, 'getStocktakes(),\\n      getHRAssets()');

content = content.replace(/setStocktakes\(stocktakesData \|\| \[\]\);/, 'setStocktakes(stocktakesData || []);\\n    setAssets(assetsData || []);');

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully patched fetchData with regex!");
