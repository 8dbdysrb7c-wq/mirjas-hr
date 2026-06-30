import io

with io.open('src/pages/EmployeeDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """            {canViewSupervisorReports && (
              <div className={`admin-sidebar-item ${activeTab === 'supervisor-reports' ? 'active' : ''}`} onClick={() => handleTabChange('supervisor-reports')}>
                <ClipboardCheck size={22} /> <span>تقرير المشرفين</span>
              </div>
            )}
            <div className="dashboard-header-row">"""

replacement = """            {canViewSupervisorReports && (
              <div className={`admin-sidebar-item ${activeTab === 'supervisor-reports' ? 'active' : ''}`} onClick={() => handleTabChange('supervisor-reports')}>
                <ClipboardCheck size={22} /> <span>تقرير المشرفين</span>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="admin-logout-btn mt-6" style={{ fontFamily: 'Rubik, sans-serif' }}>
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>

        {/* Content Area */}
        <div className="admin-content">
          {/* Beautiful Header Card */}
          <div className="relative mb-8 rounded-[24px] p-6 shadow-sm border border-sky-100 flex flex-col justify-between no-print" style={{ background: 'linear-gradient(to left, #e0f2fe, #f0fdfa)' }}>
            <div className="flex justify-between w-full items-start">
              <div className="flex flex-col text-right">
                <div className="flex items-center gap-2 mb-1 text-slate-800">
                  <span className="text-xl font-bold">{getGreeting()}</span>
                  <span className="text-2xl">👋</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">{user.name || 'أهلاً بك'}</h2>
                <p className="text-slate-600 font-medium text-sm">نتمنى لك {getGreeting() === 'صباح الخير' ? 'صباحاً مشرقاً ومثمراً' : 'مساءً هادئاً ومريحاً'}</p>
              </div>

              <div className="flex items-center gap-2" dir="ltr">
                <NotificationCenter user={user} onNavigate={handleNotificationNavigate} />
                <button type="button" className="header-icon-button bg-white/60 hover:bg-white/80 transition-colors" onClick={toggleDarkMode}>
                  <SunMoon size={19} />
                </button>
                <HeaderUserMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl py-3 px-4 flex items-center justify-between shadow-sm border border-white mt-6 md:w-2/3 self-end divide-x divide-x-reverse divide-slate-100">
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-slate-400 font-bold mb-1">الرقم الوظيفي</span>
                <span className="text-sm font-bold text-slate-700">{user.id}</span>
              </div>
              {user.jobTitle && (
                <div className="flex flex-col items-center flex-1 border-r border-slate-100">
                  <span className="text-xs text-slate-400 font-bold mb-1">المسمى الوظيفي</span>
                  <span className="text-sm font-bold text-slate-700">{user.jobTitle}</span>
                </div>
              )}
              {user.directManager && (
                <div className="flex flex-col items-center flex-1 border-r border-slate-100">
                  <span className="text-xs text-slate-400 font-bold mb-1">المدير المباشر</span>
                  <span className="text-sm font-bold text-emerald-600">{user.directManager}</span>
                </div>
              )}
            </div>
          </div>
          <div className="hidden">"""

content = content.replace(target, replacement)

# Now we need to remove the closing tags of the old header.
target_end = """                <HeaderUserMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
              </div>
            </div>
          </div>"""

replacement_end = """                <HeaderUserMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
              </div>
            </div>
          </div>
          </div>"""

content = content.replace(target_end, replacement_end)

with io.open('src/pages/EmployeeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
