import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    key = match.group(1)
    full_str = match.group(0)
    return full_str.replace('<ArrowUpDown size={14} className="text-muted" />', f"{{getSortIcon('{key}')}}")

new_content = re.sub(r'<th[^>]*onClick=\{\(\) => handleSort\(\'([^\']+)\'\)\}[^>]*>.*?</th>', replacer, content, flags=re.DOTALL)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
