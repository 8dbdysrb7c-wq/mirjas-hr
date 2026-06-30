
import re

def fix_file(filepath, key, default_tab):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    replacement = f'''  const [activeTab, setActiveTab] = useState(() => {{
    return sessionStorage.getItem('{key}') || '{default_tab}';
  }});

  useEffect(() => {{
    sessionStorage.setItem('{key}', activeTab);
  }}, [activeTab]);'''

    # Ensure we don't replace if already replaced
    if 'sessionStorage.getItem' not in content:
        content = re.sub(r'const \[activeTab,\s*setActiveTab\]\s*=\s*useState\([^)]+\);', replacement, content, count=1)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {filepath}')

fix_file('src/pages/AdminDashboard.jsx', 'adminActiveTab', 'overview')
fix_file('src/pages/EmployeeDashboard.jsx', 'employeeActiveTab', 'home')

