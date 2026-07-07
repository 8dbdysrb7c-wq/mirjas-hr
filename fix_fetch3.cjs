const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The file now contains the literal characters '\n'
content = content.replace('getStocktakes(),\\n      getHRAssets()', 'getStocktakes(),\n      getHRAssets()');

content = content.replace('setStocktakes(stocktakesData || []);\\n    setAssets(assetsData || []);', 'setStocktakes(stocktakesData || []);\n    setAssets(assetsData || []);');

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully fixed the newline issue in AdminStock.jsx!");
