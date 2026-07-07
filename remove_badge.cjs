const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'AdminStock.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// We are going to find the specific block and remove it.
const regex = /<div className="text-\[10px\] text-muted flex gap-1 justify-center flex-wrap mt-1">[\s\S]*?\{\(loc\.location \|\| ''\)\.split\(\/\[,، -\]\/\)\.filter\(Boolean\)\.map\(\(l, i\) => \([\s\S]*?<span key=\{i\} style=\{\{ border: '1px solid #10b981', color: '#059669', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' \}\}>\{l\}<\/span>[\s\S]*?\)\)[\s\S]*?\}[\s\S]*?<\/div>/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log("Successfully removed shelf badges from expanded rows!");
} else {
    console.log("Could not find the target block using regex!");
}
