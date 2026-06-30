import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"WARNING: String not found in {filepath}:\n{old[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

old_div = """    <>
            <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">"""

new_div = """    <>
      <div className="glass-card flex flex-col min-h-[500px] animate-fade-in">"""

update_file('src/pages/hr/HRLeaves.jsx', [
    (old_div, new_div)
])
