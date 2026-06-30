import re

with open('src/index.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

new_css = """

/* --- MOBILE PREVIEW WRAPPER --- */
.preview-mode-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #1e293b;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 20px;
}

.preview-controls-bar {
  background: white;
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  align-items: center;
  color: #333;
}

.preview-controls-bar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-controls-bar button:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.preview-controls-bar button.active {
  background: var(--primary);
  color: white;
}

.preview-device-frame {
  background: #fff;
  border-radius: 40px;
  padding: 15px;
  box-shadow: inset 0 0 0 2px #333, 0 20px 40px rgba(0,0,0,0.6);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

/* Add a notch for phone */
.preview-device-frame.phone.portrait::before {
  content: "";
  position: absolute;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 25px;
  background: #000;
  border-bottom-left-radius: 15px;
  border-bottom-right-radius: 15px;
  z-index: 1000;
}

.preview-device-screen {
  background: var(--bg);
  border: 1px solid #e2e8f0;
  border-radius: 25px;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  width: 100%;
  height: 100%;
}

.preview-device-frame.phone.portrait { width: 405px; height: 842px; }
.preview-device-frame.phone.landscape { width: 842px; height: 405px; border-radius: 30px; } 

.preview-device-frame.tablet.portrait { width: 798px; height: 1054px; border-radius: 20px;}
.preview-device-frame.tablet.landscape { width: 1054px; height: 798px; border-radius: 20px;}

.preview-floating-btn {
  position: fixed;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid white;
}
.preview-floating-btn:hover {
  transform: translateX(-50%) scale(1.05);
}

.app-content-wrapper {
  height: 100vh;
  width: 100%;
}
.app-content-wrapper.preview-active {
  height: 100%;
}
"""

if '.preview-mode-overlay' not in css_content:
    with open('src/index.css', 'a', encoding='utf-8') as f:
        f.write(new_css)


with open('src/App.jsx', 'r', encoding='utf-8') as f:
    app_jsx = f.read()

# Add icons import
if 'import { Smartphone' not in app_jsx:
    app_jsx = app_jsx.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { Smartphone, Tablet, RotateCcw, X, Monitor } from 'lucide-react';")

# Replace App definition to add states
state_addition = """
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState({ primaryColor: '#1a8d9b' });
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState(() => localStorage.getItem('previewDevice') || 'phone');
  const [previewOrientation, setPreviewOrientation] = useState(() => localStorage.getItem('previewOrientation') || 'portrait');

  useEffect(() => {
    localStorage.setItem('previewDevice', previewDevice);
    localStorage.setItem('previewOrientation', previewOrientation);
  }, [previewDevice, previewOrientation]);
"""

app_jsx = re.sub(r'const \[currentUser, setCurrentUser\].*?const \[theme, setTheme\] = useState\(\{ primaryColor: \'#1a8d9b\' \}\);', state_addition, app_jsx, flags=re.DOTALL)


# Replace return statement
old_return = """  return (
    <Router>
      <Routes>
        <Route path="/" element={
          !currentUser ? <Login onLogin={handleLogin} /> :
            <Navigate to={isAdmin(currentUser) ? '/admin' : '/employee'} />
        } />

        <Route path="/employee" element={
          currentUser && !isAdmin(currentUser) ?
            <EmployeeDashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> :
            <Navigate to="/" />
        } />

        <Route path="/admin" element={
          currentUser && isAdmin(currentUser) ?
            <AdminDashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> :
            <Navigate to="/" />
        } />
      </Routes>
    </Router>
  );"""

new_return = """  const togglePreviewMode = () => setIsPreviewMode(!isPreviewMode);

  const renderAppContent = () => (
    <div className={`app-content-wrapper ${isPreviewMode ? 'preview-active' : ''}`}>
      <Router>
        <Routes>
          <Route path="/" element={
            !currentUser ? <Login onLogin={handleLogin} /> :
              <Navigate to={isAdmin(currentUser) ? '/admin' : '/employee'} />
          } />

          <Route path="/employee" element={
            currentUser && !isAdmin(currentUser) ?
              <EmployeeDashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> :
              <Navigate to="/" />
          } />

          <Route path="/admin" element={
            currentUser && isAdmin(currentUser) ?
              <AdminDashboard user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> :
              <Navigate to="/" />
          } />
        </Routes>
      </Router>
    </div>
  );

  return (
    <>
      {currentUser && isAdmin(currentUser) && !isPreviewMode && (
        <button className="preview-floating-btn" onClick={togglePreviewMode} title="معاينة الهاتف (Mobile Preview)">
          <Smartphone size={20} />
          <span>معاينة الهاتف</span>
        </button>
      )}

      {isPreviewMode ? (
        <div className="preview-mode-overlay">
          <div className="preview-controls-bar">
            <button className={previewDevice === 'phone' ? 'active' : ''} onClick={() => setPreviewDevice('phone')} title="هاتف (iPhone/Android)">
              <Smartphone size={20} />
            </button>
            <button className={previewDevice === 'tablet' ? 'active' : ''} onClick={() => setPreviewDevice('tablet')} title="تابلت (iPad)">
              <Tablet size={20} />
            </button>
            <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 5px' }}></div>
            <button onClick={() => setPreviewOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')} title="تدوير الشاشة">
              <RotateCcw size={20} />
            </button>
            <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 5px' }}></div>
            <button style={{ background: '#fef2f2', color: '#ef4444' }} onClick={togglePreviewMode} title="إغلاق المعاينة">
              <X size={20} />
            </button>
          </div>
          
          <div className={`preview-device-frame ${previewDevice} ${previewOrientation}`}>
            <div className="preview-device-screen">
              {renderAppContent()}
            </div>
          </div>
        </div>
      ) : (
        renderAppContent()
      )}
    </>
  );"""

app_jsx = app_jsx.replace(old_return, new_return)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_jsx)

print("Mobile preview wrapper added to App.jsx successfully.")
