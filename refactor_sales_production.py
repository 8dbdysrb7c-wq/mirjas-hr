import os
import re

base_dir = r"c:\Users\a.awwad\.gemini\antigravity\mirjas-hr\src"
admin_dir = os.path.join(base_dir, "pages", "admin")
dashboard_file = os.path.join(base_dir, "pages", "AdminDashboard.jsx")
emp_dashboard_file = os.path.join(base_dir, "pages", "EmployeeDashboard.jsx")

# 1. Rename files
old_sales_path = os.path.join(admin_dir, "AdminSales.jsx")
old_sales_simple_path = os.path.join(admin_dir, "AdminSalesSimple.jsx")
new_production_path = os.path.join(admin_dir, "AdminProduction.jsx")
new_sales_path = os.path.join(admin_dir, "AdminSales.jsx")

# Rename step 1: simple to temp
temp_sales_path = os.path.join(admin_dir, "AdminSales_TEMP.jsx")
if os.path.exists(old_sales_simple_path):
    os.rename(old_sales_simple_path, temp_sales_path)

# Rename step 2: old sales to production
if os.path.exists(old_sales_path):
    os.rename(old_sales_path, new_production_path)

# Rename step 3: temp to new sales
if os.path.exists(temp_sales_path):
    os.rename(temp_sales_path, new_sales_path)


# 2. Update Component Names inside the files
def replace_in_file(filepath, replacements):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Update AdminProduction.jsx (was AdminSales)
replace_in_file(new_production_path, [
    ("const AdminSales = ({", "const AdminProduction = ({"),
    ("export default AdminSales;", "export default AdminProduction;")
])

# Update AdminSales.jsx (was AdminSalesSimple)
replace_in_file(new_sales_path, [
    ("const AdminSalesSimple = ({", "const AdminSales = ({"),
    ("export default AdminSalesSimple;", "export default AdminSales;")
])

# 3. Update Dashboards
replace_in_file(dashboard_file, [
    ("import AdminProduction from './admin/AdminSales';", "import AdminProduction from './admin/AdminProduction';"),
    ("import AdminSales from './admin/AdminSalesSimple';", "import AdminSales from './admin/AdminSales';")
])

replace_in_file(emp_dashboard_file, [
    ("import AdminSales from './admin/AdminSales';", "import AdminProduction from './admin/AdminProduction';"),
    ("import AdminSalesSimple from './admin/AdminSalesSimple';", "import AdminSales from './admin/AdminSales';"),
    ("<AdminSalesSimple user={user} notificationTarget={notificationTarget} />", "<AdminSales user={user} notificationTarget={notificationTarget} />"),
    ("<AdminSales user={user} notificationTarget={notificationTarget} />", "<AdminProduction user={user} notificationTarget={notificationTarget} />")
])

print("Refactoring completed.")
