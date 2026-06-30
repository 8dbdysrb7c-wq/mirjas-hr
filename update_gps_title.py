import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the title
old_title = 'إعدادات مواقع العمل (فروع الشركة)'
new_title = 'إعدادات البصمة والمواقع الجغرافية (فروع الشركة)'
content = content.replace(old_title, new_title)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Title updated")
