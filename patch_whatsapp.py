import re

# We need to add the import statement and the WhatsApp notification logic.

# 1. HRLeaves.jsx
with open('src/pages/hr/HRLeaves.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { sendWhatsAppNotification }" not in content:
    content = content.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport { sendWhatsAppNotification } from '../../utils/whatsappService';")

leave_logic = """
      if (newStatus === 'مقبول' || newStatus === 'مرفوض') {
        try {
          const emp = employees.find(e => e.id === leave.employeeId);
          if (emp && emp.phone) {
            const actionText = newStatus === 'مقبول' ? 'الموافقة على' : 'رفض';
            const msg = `مرحباً ${emp.name}،\\nتم ${actionText} ${leave.type} الخاصة بك.\\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg);
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
      }
"""

if "await sendWhatsAppNotification(emp.phone, msg);" not in content:
    # insert inside handleStatusChange after saveHRLeave
    content = re.sub(
        r"(await saveHRLeave\(\{ \.\.\.leave, status: newStatus \}\);)",
        r"\1\n" + leave_logic,
        content
    )

with open('src/pages/hr/HRLeaves.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. HRAdvances.jsx
with open('src/pages/hr/HRAdvances.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { sendWhatsAppNotification }" not in content:
    content = content.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport { sendWhatsAppNotification } from '../../utils/whatsappService';")

advance_logic = """
      if (newStatus === 'مقبول' || newStatus === 'مرفوض') {
        try {
          const emp = employees.find(e => e.id === advance.employeeId);
          if (emp && emp.phone) {
            const actionText = newStatus === 'مقبول' ? 'الموافقة على' : 'رفض';
            const msg = `مرحباً ${emp.name}،\\nتم ${actionText} طلب السلفة بقيمة ${advance.amount} د.أ.\\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg);
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
      }
"""

if "await sendWhatsAppNotification(emp.phone, msg);" not in content:
    content = re.sub(
        r"(await saveHRAdvance\(\{ \.\.\.advance, status: newStatus \}, user\);)",
        r"\1\n" + advance_logic,
        content
    )

with open('src/pages/hr/HRAdvances.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. HROvertime.jsx
with open('src/pages/hr/HROvertime.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { sendWhatsAppNotification }" not in content:
    content = content.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport { sendWhatsAppNotification } from '../../utils/whatsappService';")

overtime_logic = """
      if (newStatus === 'مقبول' || newStatus === 'مرفوض') {
        try {
          const emp = employees.find(e => e.id === leave.employeeId);
          if (emp && emp.phone) {
            const actionText = newStatus === 'مقبول' ? 'الموافقة على' : 'رفض';
            const msg = `مرحباً ${emp.name}،\\nتم ${actionText} طلب العمل الإضافي الخاص بك.\\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg);
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
      }
"""

if "await sendWhatsAppNotification(emp.phone, msg);" not in content:
    content = re.sub(
        r"(await saveHRLeave\(\{ \.\.\.leave, status: newStatus \}\);)",
        r"\1\n" + overtime_logic,
        content
    )

with open('src/pages/hr/HROvertime.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 4. AdminSupervisorReports.jsx
with open('src/pages/admin/AdminSupervisorReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "import { sendWhatsAppNotification }" not in content:
    content = content.replace("import Swal from 'sweetalert2';", "import Swal from 'sweetalert2';\nimport { sendWhatsAppNotification } from '../../utils/whatsappService';")

report_logic = """
        try {
          const emp = employees.find(e => e.id === report.userId);
          if (emp && emp.phone) {
            const actionText = newStatus === 'مقبول' ? 'الموافقة على' : 'رفض';
            const msg = `مرحباً ${emp.name}،\\nتم ${actionText} تقرير العمل اليومي الخاص بك بتاريخ ${report.date}.\\n-- الإدارة`;
            await sendWhatsAppNotification(emp.phone, msg);
          }
        } catch(err) { console.error('WhatsApp Error:', err); }
"""

if "await sendWhatsAppNotification(emp.phone, msg);" not in content:
    content = re.sub(
        r"(const updatedReport = \{ \.\.\.report, status: newStatus \};\s*await saveReport\(updatedReport\);)",
        r"\1\n" + report_logic,
        content
    )

with open('src/pages/admin/AdminSupervisorReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")
