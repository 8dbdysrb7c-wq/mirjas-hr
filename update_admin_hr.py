import re

with open('src/pages/hr/AdminHR.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import HRMissingPunches
content = content.replace(
    "import HRSalaryReports from './HRSalaryReports';",
    "import HRSalaryReports from './HRSalaryReports';\nimport HRMissingPunches from './HRMissingPunches';"
)

content = content.replace(
    "import { Users, Clock, Calendar, AlertTriangle, FileText, Settings, Shield, Menu, X } from 'lucide-react';",
    "import { Users, Clock, Calendar, AlertTriangle, FileText, Settings, Shield, Menu, X, Fingerprint } from 'lucide-react';"
)

# 2. Add to renderContent
content = content.replace(
    "case 'leaves': return <HRLeaves user={user} />;",
    "case 'leaves': return <HRLeaves user={user} />;\n      case 'missing-punches': return <HRMissingPunches user={user} />;"
)

# 3. Add to navItems
nav_items_old = """    { id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar size={18} /> },
    { id: 'violations', label: 'المخالفات والخصومات', icon: <AlertTriangle size={18} /> },"""

nav_items_new = """    { id: 'leaves', label: 'الإجازات والمغادرات', icon: <Calendar size={18} /> },
    { id: 'missing-punches', label: 'الختمات الناقصة', icon: <Fingerprint size={18} /> },
    { id: 'violations', label: 'المخالفات والخصومات', icon: <AlertTriangle size={18} /> },"""

content = content.replace(nav_items_old, nav_items_new)

with open('src/pages/hr/AdminHR.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
