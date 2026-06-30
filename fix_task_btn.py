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

old_stats = """        <div className="flex flex-wrap gap-4 mt-4">
          <div className="premium-card flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <span className="text-sm text-gray-500">نسبة الإنجاز</span>
            <span className="text-2xl font-bold text-green-600">{completionRate}%</span>
          </div>
          <div className="premium-card flex flex-col items-center p-4 bg-white rounded-xl shadow-sm">
            <span className="text-sm text-gray-500">مهام متأخرة</span>
            <span className="text-2xl font-bold text-red-600">{lateTasks}</span>
          </div>
          {isSuperAdmin && (
            <button onClick={() => openTaskModal()} className="premium-btn flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
              <Plus size={18} /> إضافة مهمة
            </button>
          )}
        </div>"""

new_stats = """        <div className="flex flex-wrap items-center gap-6 mt-4">
          {isSuperAdmin && (
            <button 
              onClick={() => openTaskModal()} 
              className="flex items-center gap-2 transition-all shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                backdropFilter: 'blur(4px)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            >
              <Plus size={18} /> إضافة مهمة
            </button>
          )}
          <div className="flex items-center gap-8 bg-black/10 px-6 py-2 rounded-xl border border-white/10">
            <div className="flex flex-col items-center">
              <span className="text-xs text-white/80 font-medium">نسبة الإنجاز</span>
              <span className="text-xl font-extrabold text-white">{completionRate}%</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-white/80 font-medium">مهام متأخرة</span>
              <span className="text-xl font-extrabold text-white">{lateTasks}</span>
            </div>
          </div>
        </div>"""

update_file('src/pages/admin/AdminSupervisorTasks.jsx', [(old_stats, new_stats)])
