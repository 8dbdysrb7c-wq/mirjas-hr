import re

with open('src/pages/hr/HRSalaryReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Imports
content = content.replace(
    "import { getEmployees, getHRViolations, getHRAttendance, getDepartments } from '../../store';",
    "import { getEmployees, getHRViolations, getHRAttendance, getDepartments, getGlobalSettings } from '../../store';"
)

# 2. Add state
content = content.replace(
    "const [departments, setDepartments] = useState({});",
    "const [departments, setDepartments] = useState({});\n  const [settings, setSettings] = useState(null);"
)

# 3. Update fetchData
old_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [emps, viols, atts, depts] = await Promise.all([
      getEmployees(), 
      getHRViolations(), 
      getHRAttendance(),
      getDepartments()
    ]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setDepartments(depts || {});
    if (emps.length > 0) setSelectedEmployeeId(emps[0].id);
    setLoading(false);
  };"""

new_fetch = """  const fetchData = async () => {
    setLoading(true);
    const [emps, viols, atts, depts, glbSettings] = await Promise.all([
      getEmployees(), 
      getHRViolations(), 
      getHRAttendance(),
      getDepartments(),
      getGlobalSettings()
    ]);
    setEmployees(emps);
    setViolations(viols);
    setAttendance(atts);
    setDepartments(depts || {});
    setSettings(glbSettings);
    if (emps.length > 0) setSelectedEmployeeId(emps[0].id);
    setLoading(false);
  };"""

content = content.replace(old_fetch, new_fetch)

# 4. Replace Mr Sleep in slip
old_slip_logo = """<h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>Mr Sleep</h2>"""
new_slip_logo = """{settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px' }} />
                ) : (
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}"""
content = content.replace(old_slip_logo, new_slip_logo)

# 5. Replace Mr Sleep in sheet
old_sheet_logo = """<h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>Mr Sleep</h2>"""
new_sheet_logo = """{settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain', marginBottom: '8px' }} />
                ) : (
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1a8d9b', margin: '0 0 4px 0' }}>{settings?.siteName || 'Mr Sleep'}</h2>
                )}"""
content = content.replace(old_sheet_logo, new_sheet_logo)

with open('src/pages/hr/HRSalaryReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
