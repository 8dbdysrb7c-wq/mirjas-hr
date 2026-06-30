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

        modified = False

        # The broken text looks like:
        # <th onClick={() =><div className="flex items-center justify-between gap-1">handleSort('employeeName')} className="...">\n              الموظف\n            </th>
        # Wait, the inner_html was everything after the FIRST `>` of `<th`.
        # So the original `>` was at `onClick={() =>`
        # We need to restore it.
        # Let's find: <th([^>]*)><div className="flex items-center justify-between gap-1">(.*?)</div></th>
        
        def fix_th(match):
            th_part1 = match.group(1) # e.g. ` onClick={() =`
            inner = match.group(2)    # e.g. `handleSort('x')} className="...">  Name `
            
            # We need to reconstruct the original <th ...> ... </th>
            # The original string was `<th` + th_part1 + `>` + inner
            original_string = f"<th{th_part1}>{inner}"
            
            # Now we need to parse it correctly. 
            # We know the inner part contains the rest of the attributes AND the actual inner HTML.
            # It looks like: `handleSort('x')} className="...">  Name `
            # Let's find the FIRST `>` in `inner` which should be the end of the `<th>` tag.
            idx = original_string.find('>', 4) # start searching after `<th `
            if idx != -1:
                real_th_open = original_string[:idx+1]
                real_inner = original_string[idx+1:]
                
                # Now apply the flex div safely
                if 'ArrowUpDown' not in real_inner:
                    new_inner = f'<div className="flex items-center justify-between gap-1">{real_inner.strip()} <ArrowUpDown size={{14}} className="text-muted" /></div>'
                else:
                    new_inner = real_inner
                    
                return f'{real_th_open}{new_inner}</th>'
                
            return match.group(0)

        new_content = re.sub(r'<th([^>]*)><div className="flex items-center justify-between gap-1">(.*?)</div></th>', fix_th, content, flags=re.DOTALL)

        if new_content != content:
            content = new_content
            modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed {filepath}")

print("Finished fixing.")
