const fs = require('fs');
const acorn = require('acorn');
const jsx = require('acorn-jsx');

const parser = acorn.Parser.extend(jsx());

const files = [
  'src/pages/admin/AdminSettings.jsx',
  'src/pages/admin/DataManagementTab.jsx',
  'src/services/data_management.js',
  'src/store.js'
];

files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    parser.parse(code, { sourceType: 'module', ecmaVersion: 2020 });
    console.log(`${file} is syntax correct.`);
  } catch (err) {
    console.error(`Syntax error in ${file}:`, err.message);
  }
});
