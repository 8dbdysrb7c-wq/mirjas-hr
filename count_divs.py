import re

with open(r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{activeTab === \'statuses\' && (')
end_idx = content.find('{activeTab === \'users\' && (')
block = content[start_idx:end_idx]

grid_start = block.find('<div className="grid grid-cols-2 gap-8">')
table_start = block.find('{/* حالات حركة التوصيل */}')
grid_inner = block[grid_start + len('<div className="grid grid-cols-2 gap-8">') : table_start]

print('grid_inner divs:', grid_inner.count('<div') - grid_inner.count('</div'))

w_full_start = block.find('<div className="w-full">')
table_html = block[w_full_start + len('<div className="w-full">') : block.rfind('</div>\n            </div>\n          </div>\n        )}')]
print('table_html divs:', table_html.count('<div') - table_html.count('</div'))

