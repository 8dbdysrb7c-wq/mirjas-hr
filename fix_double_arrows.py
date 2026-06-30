import os
import re

directories = [
    r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages",
    r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\hr",
    r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin"
]

for directory in directories:
    if not os.path.exists(directory): continue
    for filename in os.listdir(directory):
        if not filename.endswith(".jsx"): continue
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for double arrows pattern:
        # <div className="flex items-center gap-1">اسم الموظف {getSortIcon('userName')}</div> <ArrowUpDown size={14} className="text-muted" />
        # Or similar. We want to remove `<ArrowUpDown size={14} className="text-muted" />` if the line also has `getSortIcon` or `renderSortIcon`.
        
        modified = False
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if ('getSortIcon' in line or 'renderSortIcon' in line) and '<ArrowUpDown size={14} className="text-muted" />' in line:
                # Remove the trailing <ArrowUpDown size={14} className="text-muted" />
                lines[i] = line.replace(' <ArrowUpDown size={14} className="text-muted" />', '')
                modified = True

        if modified:
            new_content = '\n'.join(lines)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed double arrows in {filepath}")

