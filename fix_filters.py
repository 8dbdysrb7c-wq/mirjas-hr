import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace patterns like (o.orderNumber || '').toString().toLowerCase()
# and (item.phone || '').toLowerCase()
# with String(item.phone || '').toLowerCase()

# Let's just manually replace the specific lines that I know could have numerical values
replacements = [
    (
        "const matchSearch = searchTerm ? (mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;",
        "const matchSearch = searchTerm ? String(mp.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;"
    ),
    (
        "const matchSearch = searchTerm ? (r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;",
        "const matchSearch = searchTerm ? String(r.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;"
    ),
    (
        "const matchSearch = searchTerm ? ((o.orderNumber || '').toString().includes(searchTerm) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;",
        "const matchSearch = searchTerm ? (String(o.orderNumber || '').includes(searchTerm) || String(o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;"
    ),
    (
        "const matchSearch = searchTerm ? ((o.orderNumber || '').toString().includes(searchTerm) || (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (o.productName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;",
        "const matchSearch = searchTerm ? (String(o.orderNumber || '').includes(searchTerm) || String(o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(o.productName || '').toLowerCase().includes(searchTerm.toLowerCase())) : true;"
    ),
    (
        "const matchSearch = (item.employeeName || '').toLowerCase().includes(term) || (item.employeeId || '').toLowerCase().includes(term) || (item.details || item.reason || '').toLowerCase().includes(term);",
        "const matchSearch = String(item.employeeName || '').toLowerCase().includes(term) || String(item.employeeId || '').toLowerCase().includes(term) || String(item.details || item.reason || '').toLowerCase().includes(term);"
    ),
    (
        "const matchSearch = (item.title || '').toLowerCase().includes(term) || (item.supervisorName || '').toLowerCase().includes(term);",
        "const matchSearch = String(item.title || '').toLowerCase().includes(term) || String(item.supervisorName || '').toLowerCase().includes(term);"
    ),
    (
        "const matchSearch = (item.content || '').toLowerCase().includes(term) || (item.supervisorName || '').toLowerCase().includes(term);",
        "const matchSearch = String(item.content || '').toLowerCase().includes(term) || String(item.supervisorName || '').toLowerCase().includes(term);"
    ),
    (
        "const matchSearch = (item.name || '').toLowerCase().includes(term) || (item.phone || '').toLowerCase().includes(term) || (item.location || '').toLowerCase().includes(term);",
        "const matchSearch = String(item.name || '').toLowerCase().includes(term) || String(item.phone || '').toLowerCase().includes(term) || String(item.location || '').toLowerCase().includes(term);"
    ),
    (
        "(mission.sourceEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(mission.sourceEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "(mission.targetEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(mission.targetEntity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "(mission.assignedEmployeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(mission.assignedEmployeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "missionType.toLowerCase().includes(searchTerm.toLowerCase())",
        "String(missionType || '').toLowerCase().includes(searchTerm.toLowerCase())"
    ),
    (
        "(item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "(getStockVariantLabel(item) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(getStockVariantLabel(item) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "(item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||",
        "String(item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||"
    ),
    (
        "(item.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())",
        "String(item.warehouse || '').toLowerCase().includes(searchTerm.toLowerCase())"
    )
]

for old_s, new_s in replacements:
    content = content.replace(old_s, new_s)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
