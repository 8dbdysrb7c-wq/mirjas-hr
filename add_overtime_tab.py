import re

def update_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
        else:
            print(f"WARNING: String not found in {filepath}:\n{old[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# HRLeaves.jsx updates

old_tabs = """      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('leaves')}>
          الإجازات والمغادرات والعمل الإضافي
        </button>
        <button className={`btn ${activeTab === 'missingpunches' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('missingpunches')}>
          الختمات الناقصة
        </button>
      </div>

      {activeTab === 'leaves' && ("""

new_tabs = """      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'leaves' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('leaves')}>
          الإجازات والمغادرات
        </button>
        <button className={`btn ${activeTab === 'overtime' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('overtime')}>
          العمل الإضافي
        </button>
        <button className={`btn ${activeTab === 'missingpunches' ? 'btn-primary' : 'btn-outline bg-white'}`} onClick={() => setActiveTab('missingpunches')}>
          الختمات الناقصة
        </button>
      </div>

      {(activeTab === 'leaves' || activeTab === 'overtime') && ("""

old_title = """          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> الإجازات والمغادرات
          </h2>
          <p className="text-muted text-sm mt-1">إدارة طلبات إجازات ومغادرات وعمل الموظفين الإضافي</p>"""

new_title = """          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> {activeTab === 'leaves' ? 'الإجازات والمغادرات' : 'العمل الإضافي'}
          </h2>
          <p className="text-muted text-sm mt-1">
            {activeTab === 'leaves' ? 'إدارة طلبات إجازات ومغادرات الموظفين' : 'إدارة طلبات العمل الإضافي'}
          </p>"""


old_tbody_map = """          <tbody className="divide-y divide-gray-50">
            {sortedLeaves.map((leave) => ("""

new_tbody_map = """          <tbody className="divide-y divide-gray-50">
            {sortedLeaves.filter(l => activeTab === 'leaves' ? l.type !== 'بدل عمل إضافي' : l.type === 'بدل عمل إضافي').map((leave) => ("""


old_empty_msg = """            {leaves.length === 0 && (
              <tr><td colSpan="8" className="py-10 text-center text-muted">لا توجد طلبات إجازة حالياً</td></tr>
            )}"""

new_empty_msg = """            {sortedLeaves.filter(l => activeTab === 'leaves' ? l.type !== 'بدل عمل إضافي' : l.type === 'بدل عمل إضافي').length === 0 && (
              <tr><td colSpan="8" className="py-10 text-center text-muted">لا توجد طلبات حالياً</td></tr>
            )}"""


update_file('src/pages/hr/HRLeaves.jsx', [
    (old_tabs, new_tabs),
    (old_title, new_title),
    (old_tbody_map, new_tbody_map),
    (old_empty_msg, new_empty_msg)
])

print("HRLeaves updated successfully.")
