import re

with open('src/pages/admin/AdminLive.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import ArrowRight
if 'ArrowRight' not in content:
    content = content.replace('ArrowUpDown} from \'lucide-react\'', 'ArrowUpDown, ArrowRight} from \'lucide-react\'')

# Add onBack prop
content = content.replace('const AdminLive = ({ user }) => {', 'const AdminLive = ({ user, onBack }) => {')

# Fix Header
header_old = '''      {/* Header */}
      <div className="flex items-center justify-start gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <h2 className="text-xl font-bold text-slate-800 m-0">التحكم المباشر</h2>
      </div>'''

header_new = '''      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div className="flex items-center justify-start gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <h2 className="text-xl font-bold text-slate-800 m-0">التحكم المباشر</h2>
        </div>
        {onBack && (
          <button 
            onClick={onBack} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
          >
            <ArrowRight size={18} />
            <span className="hidden md:inline">رجوع للرئيسية</span>
          </button>
        )}
      </div>'''

content = content.replace(header_old, header_new)

# Fix Smoking Cards
content = content.replace("width: '250px', height: '84px'", "flex: '1 1 200px', height: '84px'")
content = content.replace("<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>", "<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', width: '100%', flex: 1, minWidth: '250px' }}>")

# Fix Counters
content = content.replace("minWidth: '120px'", "flex: '1 1 80px'")
content = content.replace("<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginBottom: '1.5rem' }}>", "<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>")

# Fix Table Overflow
content = content.replace("overflow: 'hidden'", "overflowX: 'auto'")
content = content.replace("width: '100%', textAlign: 'right'", "width: '100%', minWidth: '600px', textAlign: 'right'")

with open('src/pages/admin/AdminLive.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done AdminLive.jsx')

# Update Dashboards
def add_onback(filepath, target_line, new_line):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace(target_line, new_line)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

add_onback('src/pages/AdminDashboard.jsx', '<AdminLive user={user} />', '<AdminLive user={user} onBack={() => setActiveTab(\\'overview\\')} />')
add_onback('src/pages/EmployeeDashboard.jsx', '<AdminLive user={user} />', '<AdminLive user={user} onBack={() => setActiveTab(\\'home\\')} />')
print('Done Dashboards')
