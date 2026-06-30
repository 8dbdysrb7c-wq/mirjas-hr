import React, { useState, useEffect } from 'react';
import { LogIn, User, Lock, Download } from 'lucide-react';
import { getEmployees } from '../store';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const Login = ({ onLogin }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      const list = await getEmployees();
      setEmployeesList(list);
    };
    fetchEmployees();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      MySwal.fire({
        title: 'تثبيت التطبيق',
        html: `
          <div style="text-align: right; direction: rtl;">
            <p><strong>لأجهزة الآيفون (iOS):</strong><br/>اضغط على زر المشاركة (Share) <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/IOS_Share_Icon.svg/320px-IOS_Share_Icon.svg.png" style="width:20px;display:inline-block;margin:0 5px"/> في المتصفح ثم اختر <strong>Add to Home Screen</strong>.</p>
            <p style="margin-top: 15px;"><strong>لأجهزة الأندرويد:</strong><br/>تأكد من فتح الرابط عبر متصفح Google Chrome، أو ابحث عن خيار "Install app" من قائمة المتصفح.</p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'حسناً فهمت',
        confirmButtonColor: '#0ea5e9'
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const user = employeesList.find(u => 
      u.id.toLowerCase().trim() === employeeId.toLowerCase().trim() && 
      u.password === password
    );
    
    if (user) {
      import('../store').then(m => {
        m.addLog({
          userName: user.name,
          userId: user.id,
          module: 'النظام',
          action: 'تسجيل دخول',
          details: `دخل المستخدم: ${user.name}`
        });
      });
      onLogin(user); 
    } else {
      setError('رقم الموظف أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100%', padding: '1rem' }}>
      <motion.div 
        className="glass-panel p-8" 
        style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-4 mb-4" style={{ margin: '0 auto', width: 'fit-content' }}>
            <img src="/logo-parent.png" alt="Mirjas" style={{ height: '60px', objectFit: 'contain' }} />
            <img src="/logo-mrsleep.png" alt="Mr Sleep" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
        </div>

        {error && (
          <div className="badge badge-poor text-center mb-4" style={{ display: 'block', padding: '0.75rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label><User size={16} className="inline-block ml-2" /> رقم الموظف</label>
            <input 
              type="text" 
              className="input-field" 
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="أدخل رقمك الوظيفي"
              required
            />
          </div>

          <div className="input-group">
            <label><Lock size={16} className="inline-block ml-2" /> كلمة المرور</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '12px', fontSize: '16px' }}>
            <LogIn size={18} /> دخول
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <button 
            onClick={handleInstallClick}
            style={{ 
              backgroundColor: '#f8fafc', 
              color: '#334155', 
              border: '1px dashed #cbd5e1', 
              borderRadius: '12px', 
              padding: '10px 20px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              transition: 'all 0.2s',
              width: '100%',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
          >
            <Download size={18} className="text-primary" />
            تثبيت التطبيق على الهاتف
          </button>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', lineHeight: '1.6' }}>
            للوصول السريع وتجربة أفضل على الموبايل
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
