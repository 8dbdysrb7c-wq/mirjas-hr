import re

filepath = 'c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminLive.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to extract the three sections.
# They are delimited by comments.

attendance_start = content.find('      {/* Employee Attendance Tracking */}')
smoking_start = content.find('      {/* Smoking Area Widget */}')
orders_start = content.find('      {/* Live Orders Tracking */}')

# The end of the orders section is right before `    </div>\n  );\n};`
orders_end = content.find('    </div>\n  );\n};\n\nexport default AdminLive;')

if attendance_start == -1 or smoking_start == -1 or orders_start == -1 or orders_end == -1:
    print("Could not find sections!")
    exit(1)

attendance_section = content[attendance_start:smoking_start]
smoking_section = content[smoking_start:orders_start]
orders_section = content[orders_start:orders_end]

# We need to put them in the new order: Orders -> Smoking -> Attendance
new_content = content[:attendance_start] + orders_section + smoking_section + attendance_section + content[orders_end:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully reordered AdminLive.jsx")
