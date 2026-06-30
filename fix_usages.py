import re

filepath = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src\pages\admin\AdminReports.jsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (r"getSortedData\(filteredEmployeesReports\)", r"sortedRowsByTab.employees"),
    (r"getSortedData\(filteredSalesOrders\)", r"sortedRowsByTab.sales"),
    (r"getSortedData\(filteredProductionOrders\)", r"sortedRowsByTab.production"),
    (r"getSortedData\(filteredDeliveryMissions\)", r"sortedRowsByTab.delivery"),
    (r"getSortedData\(filteredStockItems\)", r"sortedRowsByTab.stock"),
    (r"getSortedData\(filteredHR\)", r"sortedRowsByTab.hr"),
    (r"getSortedData\(filteredMissingPunches\)", r"sortedRowsByTab.missingpunches"),
    (r"getSortedData\(filteredTasks\)", r"sortedRowsByTab.tasks"),
    (r"getSortedData\(filteredSupervisorReports\)", r"sortedRowsByTab.supervisors"),
    (r"getSortedData\(filteredCustomersReports\)", r"sortedRowsByTab.customers")
]

for old, new in replacements:
    # Only replace inside the JSX render block, where they have `)` or `.map` immediately after
    content = re.sub(old + r"\.map", new + ".map", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed usages.")
