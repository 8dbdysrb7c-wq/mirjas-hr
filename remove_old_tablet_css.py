
with open('src/index.css', 'r', encoding='utf-8') as f:
    lines = f.read()

import re
lines = re.sub(r'\.preview-active\.preview-tablet\.preview-portrait \.overview-grid,.*?\s*grid-template-columns:\s*repeat\(2, 1fr\)\s*!important;\s*\}', '', lines, flags=re.DOTALL)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(lines)
print('Done!')

