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

        # Check if table exists
        if '<table' not in content and '<th' not in content:
            continue

        print(f"Processing {filepath}")
        modified = False

        # Add ArrowUpDown to imports if needed
        if 'lucide-react' in content and 'ArrowUpDown' not in content:
            content = re.sub(r'(import\s+\{[^}]*)(\}\s+from\s+[\'"]lucide-react[\'"])', r'\1, ArrowUpDown\2', content)
            modified = True
        elif 'lucide-react' not in content:
            content = "import { ArrowUpDown } from 'lucide-react';\n" + content
            modified = True

        # Check if handleSort already exists
        if 'const handleSort =' not in content and 'function handleSort' not in content:
            # We need to inject sortConfig and handleSort
            # Find the main component declaration
            match = re.search(r'const\s+([A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>\s*\{', content)
            if match:
                component_start = match.end()
                injection = """
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
"""
                content = content[:component_start] + injection + content[component_start:]
                modified = True

        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

print("Done phase 1")
