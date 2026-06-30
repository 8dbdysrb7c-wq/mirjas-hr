import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MySwal = withReactContent(Swal);

const WhatsAppSettingsTab = () => {
  const [status, setStatus] = useState('LOADING');
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    // Listen to Firebase instead of localhost
    const unsub = onSnapshot(doc(db, 'whatsapp_config', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status || 'DISCONNECTED');
        setQrCode(data.qr || '');
      } else {
        setStatus('DISCONNECTED');
      }
    }, (error) => {
      console.error('Failed to listen to WhatsApp status from Firebase:', error);
      setStatus('DISCONNECTED');
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await updateDoc(doc(db, 'whatsapp_config', 'status'), { command: 'LOGOUT' });
      MySwal.fire({
        title: 'جاري تسجيل الخروج',
        text: 'تم إرسال أمر تسجيل الخروج للسيرفر، يرجى الانتظار لثوانٍ حتى يظهر الباركود الجديد.',
        icon: 'info',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      MySwal.fire('خطأ', 'لم نتمكن من إرسال أمر تسجيل الخروج', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="text-primary" /> إعدادات الربط بالواتساب (السحابي)
          </h3>
        </div>

        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
          {status === 'LOADING' && (
            <div className="py-8 text-slate-500">جاري قراءة حالة السيرفر...</div>
          )}

          {(status === 'DISCONNECTED' || !status) && (
            <div className="py-8">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">السيرفر غير متصل</h4>
              <p className="text-slate-500 max-w-md mx-auto">
                يرجى التأكد من تشغيل سيرفر الواتساب على جهازك ليقوم بالاتصال بقاعدة البيانات.
              </p>
            </div>
          )}

          {status === 'QR_READY' && qrCode && (
            <div className="py-4">
              <h4 className="text-lg font-bold text-slate-800 mb-4">قم بمسح الباركود باستخدام تطبيق الواتساب</h4>
              <div className="bg-white p-4 inline-block rounded-xl shadow-sm border border-slate-200 mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                  alt="WhatsApp QR Code" 
                  className="w-[250px] h-[250px]"
                />
              </div>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                افتح تطبيق الواتساب في هاتفك &gt; الأجهزة المرتبطة &gt; ربط جهاز وقم بتوجيه الكاميرا إلى هذا الباركود.
              </p>
            </div>
          )}

          {(status === 'AUTHENTICATED' || status === 'READY') && (
            <div className="py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} />
              </div>
              <h4 className="text-2xl font-bold text-slate-800 mb-2">تم الربط بنجاح!</h4>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                الواتساب متصل الآن وجاهز. الإشعارات للموافقات ستصل للموظفين فوراً حتى لو استخدمت الموقع المرفوع.
              </p>
              <button className="btn btn-danger flex items-center gap-2 mx-auto" onClick={handleLogout}>
                <LogOut size={16} /> تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettingsTab;
