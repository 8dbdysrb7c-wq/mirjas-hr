import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("AlertTriangle, CheckCircle} from 'lucide-react'", "AlertTriangle, CheckCircle, User} from 'lucide-react'")

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
