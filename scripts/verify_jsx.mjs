import fs from 'fs';

const content = fs.readFileSync('src/pages/EmployeeDashboard.jsx', 'utf8');

// Match all imported symbols
const importMatches = [...content.matchAll(/import\s*\{([^}]+)\}\s*from/g)];
const allImported = new Set();
for (const match of importMatches) {
  match[1].split(',').forEach(s => {
    const trimmed = s.trim().split(/\s+as\s+/)[0].trim();
    if (trimmed) allImported.add(trimmed);
  });
}

// Default imports
const defaultImports = [...content.matchAll(/import\s+([A-Za-z0-9_]+)\s+from/g)].map(m => m[1]);
defaultImports.forEach(i => allImported.add(i));

// Check JSX elements <SomeIdentifier
const jsxMatches = [...content.matchAll(/<([A-Z][a-zA-Z0-9_]+)/g)].map(m => m[1]);
const uniqueJsx = [...new Set(jsxMatches)];

// Local declarations
const localDeclMatches = [...content.matchAll(/(?:const|let|var|function)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);
const localDecls = new Set(localDeclMatches);

const undefinedJsx = uniqueJsx.filter(name => !allImported.has(name) && !localDecls.has(name));

console.log('Undefined JSX Components in EmployeeDashboard.jsx:', undefinedJsx);
