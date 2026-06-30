import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import_statement = "import { canPerformAction, getGlobalSettings, saveGlobalSettings, getEmployees, saveEmployee, getNotificationRoleOptions, normalizeNotificationSettings, updateNotificationModuleRule, updateNotificationSettings } from '../../store';\n"

if 'getGlobalSettings' not in content[:1000] and 'import { canPerformAction' not in content:
    idx = content.find("import React")
    if idx != -1:
        end_idx = content.find("\n", idx) + 1
        content = content[:end_idx] + import_statement + content[end_idx:]
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Imports added successfully.")
    else:
        print("import React not found")
else:
    print("Imports already exist")
