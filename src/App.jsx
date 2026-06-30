import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, RotateCcw, X, Monitor } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Swal from 'sweetalert2';
import { getGlobalSettings, isAdmin, getEmployees } from './store';

function App() {
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

  const applyTheme = (primaryColor) => {
    if (!primaryColor) return;
    setTheme({ primaryColor });

    const root = document.documentElement;
    root.style.setProperty('--primary', primaryColor);

    // Generate light version (using 15% opacity of the color)
    const lightColor = `${primaryColor}26`; // 26 is hex for ~15% opacity
    root.style.setProperty('--primary-light', lightColor);

    // Generate dark version (simple darken - this is a bit crude but works for most hex)
    // For a more robust approach, we'd convert to HSL and back
    // But since we want to be "Antigravity", let's do it properly
    const darkenColor = (hex, percent) => {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);

      r = Math.floor(r * (1 - percent));
      g = Math.floor(g * (1 - percent));
      b = Math.floor(b * (1 - percent));

      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    root.style.setProperty('--primary-dark', darkenColor(primaryColor, 0.2));
  };

  useEffect(() => {
    if (currentUser) {
      getEmployees().then(emps => {
        let updatedUser = emps.find(e => e.id === currentUser.id);
        
        // Fallback: If ID changed but name is the same, self-heal the session!
        if (!updatedUser) {
          updatedUser = emps.find(e => e.name && currentUser.name && e.name.trim() === currentUser.name.trim());
        }

        if (updatedUser) {
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        } else {
          // If the user was completely deleted from the system, log them out
          handleLogout();
        }
      });
    }
  }, []);

  useEffect(() => {
    const initTheme = async () => {
      const settings = await getGlobalSettings();
      if (settings && settings.primaryColor) {
        applyTheme(settings.primaryColor);
      }
    };
    initTheme();
  }, []);

  useEffect(() => {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt = e;

      // Show custom install UI
      if (!localStorage.getItem('pwaPromptShown')) {
        Swal.fire({
          title: 'تثبيت التطبيق',
          text: 'هل تود تثبيت تطبيق Mr Sleep على جهازك للوصول السريع؟',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'تثبيت الآن',
          cancelButtonText: 'لاحقاً',
          confirmButtonColor: theme.primaryColor
        }).then((result) => {
          if (result.isConfirmed) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
              }
              deferredPrompt = null;
            });
          }
          localStorage.setItem('pwaPromptShown', 'true');
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleSweetAlertCloseClick = (event) => {
      if (event.target instanceof Element && event.target.closest('.premium-modal-close')) {
        Swal.close();
      }
    };

    document.addEventListener('click', handleSweetAlertCloseClick);
    return () => document.removeEventListener('click', handleSweetAlertCloseClick);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const togglePreviewMode = () => setIsPreviewMode(!isPreviewMode);

  const renderAppContent = () => (
    <div className={`app-content-wrapper ${isPreviewMode ? 'preview-active preview-' + previewDevice + ' preview-' + previewOrientation : ''}`}>
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
      {currentUser && (isAdmin(currentUser) || currentUser.role === 'مشرف') && !isPreviewMode && (
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
            <button onClick={() => setPreviewOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')} title="تدوير الجهاز">
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
  );
}

export default App;