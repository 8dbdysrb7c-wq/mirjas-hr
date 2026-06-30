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

        if '<th' not in content:
            continue

        print(f"Processing {filepath}")
        modified = False

        # Add ArrowUpDown to imports if needed
        if 'ArrowUpDown' not in content:
            if 'lucide-react' in content:
                content = re.sub(r'(import\s+\{[^}]*)(\}\s+from\s+[\'"]lucide-react[\'"])', r'\1, ArrowUpDown\2', content)
                modified = True
            else:
                content = "import { ArrowUpDown } from 'lucide-react';\n" + content
                modified = True

        # Now find <th onClick={...}>...</th> that DON'T have ArrowUpDown
        # We need to use regex to find `<th [^>]*onClick[^>]*>(.*?)</th>`
        # and if ArrowUpDown is not inside \1, append it.
        
        def replace_th(match):
            th_open = match.group(1)
            inner_html = match.group(2)
            if 'onClick' in th_open and 'ArrowUpDown' not in inner_html:
                # Add flex div to keep text and icon together properly
                new_inner = f'<div className="flex items-center justify-between gap-1">{inner_html.strip()} <ArrowUpDown size={{14}} className="text-muted" /></div>'
                return f'<th{th_open}>{new_inner}</th>'
            return match.group(0)

        new_content = re.sub(r'<th([^>]*)>(.*?)</th>', replace_th, content, flags=re.DOTALL)
        
        if new_content != content:
            content = new_content
            modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print("Finished processing.")
