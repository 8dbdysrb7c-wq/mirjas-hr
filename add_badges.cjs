const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');

// 1. Add 'الموقع' header
if (!content.includes('<th className="text-center">الموقع</th>')) {
    content = content.replace(
        /<th className="text-center">المخزن<\/th>\s*<th className="text-center">المواصفة<\/th>/,
        '<th className="text-center">المخزن</th>\n                  <th className="text-center">الموقع</th>\n                  <th className="text-center">المواصفة</th>'
    );
}

// 2. Add Location Badges to the main row
const targetTd = /<td className="text-sm text-center">\s*<div className="badge bg-slate-100 text-slate-700 mx-auto">\s*\{group\.locations\.length\} \{group\.locations\.length === 1 \? 'موقع' : 'مواقع'\}\s*<\/div>\s*<\/td>\s*<td className="text-sm text-center">\{displaySpec\}<\/td>/;

const replacementTd = `<td className="text-sm text-center">
                          <div className="badge bg-slate-100 text-slate-700 mx-auto">
                            {group.locations.length} {group.locations.length === 1 ? 'موقع' : 'مواقع'}
                          </div>
                        </td>
                        <td className="text-sm text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {group.locations.map(loc => loc.location).filter(Boolean).map((locStr, idx) => (
                              <span key={idx} style={{ border: '1.5px solid #10b981', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                {locStr}
                              </span>
                            ))}
                            {group.locations.every(loc => !loc.location) && <span className="text-muted">-</span>}
                          </div>
                        </td>
                        <td className="text-sm text-center">{displaySpec}</td>`;

if (!content.includes("1.5px solid #10b981")) {
    content = content.replace(targetTd, replacementTd);
}

fs.writeFileSync('src/pages/admin/AdminStock.jsx', content);
console.log("Location column and badges added successfully!");
