import re

with open('src/pages/admin/AdminSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add toggleLeavePermission
toggle_func = """  const toggleLeavePermission = async (empId, type) => {
    const newEmps = [...employees];
    const index = newEmps.findIndex(x => x.id === empId);
    if (index > -1) {
      const emp = newEmps[index];
      const currentAllowed = emp.allowedLeaveTypes || ALL_LEAVE_TYPES;
      let newAllowed;
      if (currentAllowed.includes(type)) {
        newAllowed = currentAllowed.filter(t => t !== type);
      } else {
        newAllowed = [...currentAllowed, type];
      }
      newEmps[index] = { ...emp, allowedLeaveTypes: newAllowed };
      setEmployees(newEmps);
      
      try {
        await saveEmployee(newEmps[index]);
      } catch(err) {
        console.error("Failed to save leave permission", err);
      }
    }
  };

  const addItem = (field) => {"""

content = content.replace("  const addItem = (field) => {", toggle_func)

# 2. Add the tab button
tabs_old = """        <div className={`premium-tab ${activeTab === 'missingpunches' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('missingpunches')}>
          <Fingerprint size={18} /> <span>الختمات الناقصة</span>
        </div>
      </div>"""

tabs_new = """        <div className={`premium-tab ${activeTab === 'missingpunches' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('missingpunches')}>
          <Fingerprint size={18} /> <span>الختمات الناقصة</span>
        </div>
        <div className={`premium-tab ${activeTab === 'leavepermissions' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('leavepermissions')}>
          <Calendar size={18} /> <span>صلاحيات الإجازات</span>
        </div>
      </div>"""

content = content.replace(tabs_old, tabs_new)

with open('src/pages/admin/AdminSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
