import re

with open(r'c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('{activeTab === \'statuses\' && (')
end_idx = content.find('{activeTab === \'users\' && (')
block = content[start_idx:end_idx]

grid_start = block.find('<div className="grid grid-cols-2 gap-8">')
table_start = block.find('{/* حالات حركة التوصيل */}')
grid_inner = block[grid_start + len('<div className="grid grid-cols-2 gap-8">') : table_start]

# trace div count line by line in grid_inner
lines = grid_inner.split('\n')
count = 0
for i, line in enumerate(lines):
    count += line.count('<div') - line.count('</div')
    if count != 0:
        print(f"Line {i+1}: count={count} -> {line.strip()}")
print(f"Final grid_inner count: {count}")
