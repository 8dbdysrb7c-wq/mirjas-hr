import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, LogOut, CheckCircle, Save, Bell, Settings, Send, Clock, FileText, Calendar, AlertTriangle, DollarSign, Truck, Target, ShieldAlert, Award, Briefcase, ShoppingCart, Factory, Package, ChevronDown, Fingerprint, Gavel, Shield, Building2, Leaf, ClipboardList, Trophy } from 'lucide-react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getGlobalSettings, saveGlobalSettings } from '../../store';
import { sendWhatsAppNotification } from '../../utils/whatsappService';

const MySwal = withReactContent(Swal);

const WhatsAppSettingsTab = ({ settings: globalSettings, setSettings: setGlobalSettings }) => {
  const [status, setStatus] = useState('LOADING');
  const [qrCode, setQrCode] = useState('');
  
  const [settings, setSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [config, setConfig] = useState({
    attendance: { enabled: true, departments: [] },
    reminders: { enabled: true, departments: [] },
    daily_report: { enabled: true, departments: [] },
    rewards: { enabled: true, departments: [] },
    report_approval: { enabled: true, departments: [] },
    penalties: { enabled: true, departments: [] },
    advances: { enabled: true, departments: [] },
    overtime: { enabled: true, departments: [] },
    tasks: { enabled: true, departments: [] },
    violations: { enabled: true, departments: [] },
    delivery: { enabled: true, departments: [] },
    custody: { enabled: true, departments: [] },
    orders: { enabled: true, departments: [] },
    production: { enabled: true, departments: [] },
    masterEnabled: true
  });

  const modules = [
    { key: 'attendance', label: 'الحضور والانصراف', icon: Fingerprint, glow: 'from-purple-500/20 to-indigo-500/20', iconColor: 'text-purple-600', desc: 'إشعارات تسجيل الحضور اليومي والانصراف الفعلي للموظفين.' },
    { key: 'reminders', label: 'إشعارات الدخول والخروج', icon: Clock, glow: 'from-cyan-500/20 to-teal-500/20', iconColor: 'text-cyan-600', desc: 'تنبيهات وتذكيرات الموظفين بمواعيد الدخول أو الخروج وتعديل فترات العمل.' },
    { key: 'daily_report', label: 'تقرير العمل اليومي', icon: ClipboardList, glow: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-600', desc: 'إشعارات تقديم التقارير اليومية للمشرفين لمتابعة الإنجازات اليومية.' },
    { key: 'rewards', label: 'المكافآت', icon: Trophy, glow: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-600', desc: 'إشعارات منح الحوافز والمكافآت المالية والتقديرية للموظفين المتميزين.' },
    { key: 'report_approval', label: 'إعتماد التقارير', icon: CheckCircle, glow: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-600', desc: 'إشعارات اعتماد وتقييم المشرفين لتقارير العمل اليومية الخاصة بالموظفين.' },
    { key: 'penalties', label: 'المخالفات', icon: Gavel, glow: 'from-violet-500/20 to-fuchsia-500/20', iconColor: 'text-violet-600', desc: 'إشعارات تسجيل العقوبات والغرامات والجزاءات الإدارية المباشرة من الإدارة.' },
    { key: 'advances', label: 'السلف', icon: DollarSign, glow: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-600', desc: 'إشعارات تقديم طلبات السلف المالية والموافقة عليها أو رفضها وصرفها.' },
    { key: 'overtime', label: 'العمل الإضافي', icon: Clock, glow: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-600', desc: 'إشعارات تقديم واعتماد طلبات ساعات العمل الإضافية للموظفين.' },
    { key: 'tasks', label: 'إدارة المهام', icon: ClipboardList, glow: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-600', desc: 'إشعارات إسناد المهام الجديدة ومتابعة حالتها ونسب إنجازها.' },
    { key: 'violations', label: 'تنبيهات الحضور والانصراف', icon: AlertTriangle, glow: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-600', desc: 'إشعارات المخالفات والإنذارات التلقائية للنظام مثل الغياب والتأخر عن العمل.' },
    { key: 'delivery', label: 'قسم التوصيل', icon: Truck, glow: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-600', desc: 'إشعارات استلام الطلبيات وتوزيعها وحالة الشحنات والتوصيل الفعلي للعملاء.' },
    { key: 'custody', label: 'العهدة', icon: Briefcase, glow: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-600', desc: 'إشعارات تسليم واستلام العهد العينية والأصول الخاصة بالشركة للموظفين.' },
    { key: 'orders', label: 'الطلبيات', icon: ShoppingCart, glow: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-600', desc: 'إشعارات طلبات الشراء الداخلية وتأكيدات طلبيات المشتريات للقسم المالي.' },
    { key: 'production', label: 'الإنتاج', icon: Factory, glow: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-600', desc: 'إشعارات عمليات التصنيع وأوامر الإنتاج اليومية ومتابعة خطوط الإنتاج.' }
  ];

  useEffect(() => {
    loadSettings();
    // Listen to Firebase instead of localhost
    const unsub = onSnapshot(doc(db, 'whatsapp_config', 'status'), (docSnap) => {
      console.log('WhatsApp status from Firestore updated:', docSnap.exists() ? docSnap.data() : 'No document found');
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

  useEffect(() => {
    if (globalSettings && globalSettings.whatsappConfig) {
      setConfig(prev => ({ ...prev, ...globalSettings.whatsappConfig }));
    }
  }, [globalSettings]);

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

  const loadSettings = async () => {
    const s = globalSettings || await getGlobalSettings();
    setSettings(s);
    if (s.whatsappConfig) {
      setConfig(prev => ({ ...prev, ...s.whatsappConfig }));
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const s = await getGlobalSettings();
      const updatedSettings = {
        ...s,
        whatsappConfig: config
      };
      await saveGlobalSettings(updatedSettings);
      if (setGlobalSettings) {
        setGlobalSettings(updatedSettings);
      }
      MySwal.fire('تم الحفظ', 'تم حفظ إعدادات إشعارات الواتساب بنجاح', 'success');
    } catch (error) {
      console.error(error);
      MySwal.fire('خطأ', 'حدث خطأ أثناء حفظ الإعدادات', 'error');
    }
    setIsSaving(false);
  };

  const handleTestMessage = async () => {
    const { value: phone } = await MySwal.fire({
      title: 'إرسال رسالة تجريبية',
      input: 'text',
      inputLabel: 'أدخل رقم الهاتف',
      inputPlaceholder: 'مثال: 0791234567',
      showCancelButton: true,
      confirmButtonText: 'إرسال الرسالة',
      cancelButtonText: 'إلغاء',
      customClass: {
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        popup: 'premium-modal-popup'
      },
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى إدخال رقم هاتف صحيح!';
        }
      }
    });

    if (phone) {
      MySwal.fire({ title: 'جاري الإرسال...', allowOutsideClick: false });
      MySwal.showLoading();
      
      try {
        const res = await sendWhatsAppNotification(phone, 'مرحباً! 👋\nهذه رسالة تجريبية من النظام للتأكد من عمل خدمة الواتساب بنجاح. ✅', null);
        if (res !== false) {
           MySwal.fire('تم الإرسال للطابور', 'تمت الإضافة لطابور الإرسال. إذا كان السيرفر متصلاً ستصل الرسالة قريباً (مع مراعاة الانتظار 6 ثوانٍ).', 'success');
        } else {
           MySwal.fire('خطأ', 'لم نتمكن من الإرسال، يرجى المحاولة لاحقاً.', 'error');
        }
      } catch (e) {
        MySwal.fire('خطأ', 'حدث خطأ غير متوقع', 'error');
      }
    }
  };

  const handleTestModuleMessage = async (key) => {
    const { value: phone } = await MySwal.fire({
      title: 'إرسال رسالة تجريبية لهذا القسم',
      input: 'text',
      inputLabel: 'أدخل رقم الهاتف للمستلم',
      inputPlaceholder: 'مثال: 0791234567',
      showCancelButton: true,
      confirmButtonText: 'إرسال الرسالة',
      cancelButtonText: 'إلغاء',
      customClass: {
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        popup: 'premium-modal-popup'
      },
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى إدخال رقم هاتف صحيح!';
        }
      }
    });

    if (phone) {
      MySwal.fire({ 
        title: 'جاري الإرسال...', 
        allowOutsideClick: false,
        didOpen: () => {
          MySwal.showLoading();
        }
      });
      
      let mockMessage = '';
      switch (key) {
        case 'attendance':
          mockMessage = '*تسجيل حركة دخول* 📍\nمرحباً أحمد، تم تسجيل حركة دخولك للعمل بنجاح في تمام الساعة 08:30 ص. طاب يومك! ☀️';
          break;
        case 'reminders':
          mockMessage = 'تذكير: لم يتبق سوى 5 دقائق على موعد بدء الدوام. يرجى تسجيل الدخول.';
          break;
        case 'daily_report':
          mockMessage = '*تقرير العمل اليومي* 📝\nمرحباً محمد، يرجى تقديم تقرير العمل اليومي لمشرفك قبل انتهاء الوردية اليوم. شكراً لالتزامك.';
          break;
        case 'rewards':
          mockMessage = '*مكافأة جديدة* 🎉\nمرحباً سامر، تم منحك مكافأة تقديرية بقيمة 50 دينار لمجهوداتك المتميزة في هذا الشهر. استمر بالأداء الرائع!';
          break;
        case 'report_approval':
          mockMessage = '*اعتماد تقرير العمل اليومي* ✅\nمرحباً يوسف، قام المشرف (عمر) باعتماد تقريرك لتاريخ اليوم.\nالتقييم: ممتاز (95%)\nالملاحظات: عمل رائع ومنظم!';
          break;
        case 'penalties':
          mockMessage = '*تنبيه إداري* ⚠️\nمرحباً، تم تسجيل تنبيه رسمي لعدم الالتزام بمواعيد تسليم المهام المطلوبة. يرجى المراجعة للتوضيح.';
          break;
        case 'advances':
          mockMessage = '*طلب سلفة* 💵\nمرحباً هاني، تمت الموافقة على طلب السلفة المقدم من قبلك بقيمة 100 دينار وسيتم تحويلها قريباً.';
          break;
        case 'overtime':
          mockMessage = '*ساعات عمل إضافية* ⏰\nمرحباً علاء، تم اعتماد 3 ساعات عمل إضافية لك اليوم من قبل الإدارة المباشرة.';
          break;
        case 'tasks':
          mockMessage = '*مهمة جديدة* 📋\nمرحباً، تم إسناد مهمة جديدة لك بعنوان: "تجهيز عرض سعر للعميل الجديد". يرجى بدء العمل ومتابعة التفاصيل.';
          break;
        case 'violations':
          mockMessage = '*تنبيه تأخر عن الدوام* ⚠️\nمرحباً، يرجى العلم أنه تم تسجيل تأخرك اليوم عن موعد الدوام الرسمي بـ 25 دقيقة.';
          break;
        case 'delivery':
          mockMessage = '*حالة التوصيل* 🚚\nمرحباً، تم شحن طلبيتك رقم #12093 وهي الآن مع المندوب وفي طريقها للتسليم.';
          break;
        case 'custody':
          mockMessage = '*استلام عهدة* 💼\nتم تسليم العهدة العينية (جهاز لابتوب Lenovo) لك بنجاح. يرجى التوقيع على كشف العهدة.';
          break;
        case 'orders':
          mockMessage = '*طلب شراء جديد* 🛒\nتم إنشاء طلب شراء جديد رقم #ORD-502 وجاري اعتماده من القسم المالي للتوريد.';
          break;
        case 'production':
          mockMessage = '*أمر إنتاج* ⚙️\nتم إصدار كرت إنتاج جديد للقسم الفني رقم #PRD-803 لبدء تشغيل خط الإنتاج.';
          break;
        default:
          mockMessage = `رسالة تجريبية لقسم الواتساب: ${key}`;
      }

      try {
        const res = await sendWhatsAppNotification(phone, mockMessage, key);
        if (res !== false) {
           MySwal.fire({
             title: 'تم الإرسال للطابور',
             text: 'تمت إضافة الرسالة التجريبية لقائمة الواتساب بنجاح وسوف تختفي النافذة الآن.',
             icon: 'success',
             timer: 2500,
             showConfirmButton: false
           });
        } else {
           MySwal.fire('خطأ', 'لم نتمكن من إرسال الرسالة، يرجى التحقق من الإعدادات وسيرفر الواتساب.', 'error');
        }
      } catch (e) {
        MySwal.fire('خطأ', 'حدث خطأ غير متوقع', 'error');
      }
    }
  };

  const handleEventToggle = (key) => {
    const updated = {
      ...config,
      [key]: { ...config[key], enabled: !config[key]?.enabled }
    };
    setConfig(updated);
    if (setGlobalSettings) {
      setGlobalSettings(prev => ({
        ...prev,
        whatsappConfig: updated
      }));
    }
  };

  const handleDepartmentChange = (key, selectedOptions) => {
    const options = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    const updated = {
      ...config,
      [key]: { ...config[key], departments: options }
    };
    setConfig(updated);
    if (setGlobalSettings) {
      setGlobalSettings(prev => ({
        ...prev,
        whatsappConfig: updated
      }));
    }
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: state.isDisabled ? '#f8fafc' : 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      minHeight: '42px',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#f1f5f9',
      borderRadius: '6px',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#334155',
      fontWeight: 'bold',
      fontSize: '0.85rem',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#64748b',
      ':hover': {
        backgroundColor: '#e2e8f0',
        color: '#ef4444',
      },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '0.85rem',
    }),
  };

  const departmentOptions = (settings?.departmentsList || []).map(dept => ({ value: dept, label: dept }));

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
            <div className="py-6 text-slate-500 font-medium">جاري قراءة حالة السيرفر...</div>
          )}

          {(status === 'DISCONNECTED' || !status) && (
            <div className="py-6">
              <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={24} />
              </div>
              <h4 className="text-md font-bold text-slate-800 mb-1">سيرفر الواتساب غير متصل</h4>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                يرجى التأكد من تشغيل السيرفر محلياً من التيرمنال باستخدام الأمر: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-red-600 font-mono">node whatsapp-server/server.js</code>
              </p>
            </div>
          )}

          {status === 'QR_READY' && (
            <div className="py-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Clock size={24} />
              </div>
              <h4 className="text-md font-bold text-slate-800 mb-1">بانتظار المسح والربط</h4>
              <p className="text-slate-500 text-xs max-w-md mx-auto mb-4">
                يرجى مسح الباركود أدناه باستخدام تطبيق الواتساب لإتمام عملية الربط:
              </p>
              {qrCode && (
                <div className="bg-white p-4 inline-block rounded-xl shadow-sm border border-slate-200 mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                    alt="WhatsApp QR Code" 
                    className="w-[250px] h-[250px] mx-auto"
                  />
                </div>
              )}
            </div>
          )}

          {(status === 'AUTHENTICATED' || status === 'READY') && (
            <div className="py-6">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">الواتساب متصل ويعمل بنجاح!</h4>
              <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
                الخدمة نشطة الآن. يتم معالجة وإرسال كافة الإشعارات تلقائياً للموظفين.
              </p>
              <button 
                className="btn btn-danger btn-sm flex items-center gap-1.5 mx-auto shadow-sm" 
                onClick={handleLogout}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <LogOut size={14} /> تسجيل الخروج وإنهاء الجلسة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rules Section */}
      <div className="glass-card" style={{ padding: '32px' }}>
        
        {/* Header container */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          gap: '24px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '24px',
          direction: 'rtl'
        }}>
          
          {/* Title Right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            direction: 'rtl'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
              border: '1px solid #dbeafe',
              borderRadius: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
            }}>
              <Bell style={{ color: '#4f46e5', width: '28px', height: '28px' }} />
            </div>
            <div style={{ textAlign: 'right', flex: 1 }}>
              <h3 style={{
                fontSize: '22px',
                fontWeight: '850',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'flex-start',
                margin: 0
              }}>
                <Settings style={{ color: '#1a8d9b', width: '24px', height: '24px' }} /> اقسام اشعارات الواتساب
              </h3>

            </div>
          </div>

          {/* Actions Left */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button 
              className="btn btn-primary"
              onClick={handleSaveConfig}
              disabled={isSaving}
              style={{
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 'bold',
                boxShadow: '0 4px 10px rgba(26, 141, 155, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              حفظ التغييرات
            </button>
            
            <button 
              className="btn"
              onClick={handleTestMessage}
              style={{
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 'bold',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Send size={18} style={{ color: '#94a3b8', transform: 'rotate(-45deg)' }} /> تجربة إرسال رسالة
            </button>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f8fafc',
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{
                fontWeight: 'bold',
                fontSize: '14px',
                color: config.masterEnabled !== false ? '#126a75' : '#64748b'
              }}>
                {config.masterEnabled !== false ? 'إرسال الواتساب مفعل' : 'إرسال الواتساب معطل'}
              </span>
              <label style={{ relative: 'true', inlineFlex: 'true', itemsCenter: 'true', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="checkbox" 
                  style={{ display: 'none' }}
                  checked={config.masterEnabled !== false}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const updated = { ...config, masterEnabled: isChecked };
                    setConfig(updated);
                    if (setGlobalSettings) {
                      setGlobalSettings(prev => ({
                        ...prev,
                        whatsappConfig: updated
                      }));
                    }
                  }}
                />
                <div style={{
                  position: 'relative',
                  width: '44px',
                  height: '24px',
                  backgroundColor: config.masterEnabled !== false ? '#1a8d9b' : '#cbd5e1',
                  borderRadius: '999px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: config.masterEnabled !== false ? '2px' : '22px',
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </label>
            </div>
          </div>
          
        </div>

        {/* 3-Column Grid Modules list */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
          direction: 'rtl'
        }}>
          {modules.map(mod => {
            const isEnabled = config[mod.key]?.enabled || false;
            const Icon = mod.icon;
            
            // Map glow color keys to custom inline styling colors
            let glowFrom = 'rgba(168, 85, 247, 0.2)';
            let glowTo = 'rgba(99, 102, 241, 0.2)';
            if (mod.key === 'reminders') { glowFrom = 'rgba(6, 182, 212, 0.2)'; glowTo = 'rgba(20, 184, 166, 0.2)'; }
            else if (mod.key === 'daily_report') { glowFrom = 'rgba(59, 130, 246, 0.2)'; glowTo = 'rgba(14, 165, 233, 0.2)'; }
            else if (mod.key === 'rewards') { glowFrom = 'rgba(245, 158, 11, 0.2)'; glowTo = 'rgba(234, 179, 8, 0.2)'; }
            else if (mod.key === 'report_approval') { glowFrom = 'rgba(16, 185, 129, 0.2)'; glowTo = 'rgba(34, 197, 94, 0.2)'; }
            else if (mod.key === 'penalties') { glowFrom = 'rgba(139, 92, 246, 0.2)'; glowTo = 'rgba(217, 70, 239, 0.2)'; }
            else if (mod.key === 'advances') { glowFrom = 'rgba(34, 197, 94, 0.2)'; glowTo = 'rgba(16, 185, 129, 0.2)'; }
            else if (mod.key === 'overtime') { glowFrom = 'rgba(59, 130, 246, 0.2)'; glowTo = 'rgba(99, 102, 241, 0.2)'; }
            else if (mod.key === 'tasks') { glowFrom = 'rgba(249, 115, 22, 0.2)'; glowTo = 'rgba(245, 158, 11, 0.2)'; }
            else if (mod.key === 'permissions') { glowFrom = 'rgba(59, 130, 246, 0.2)'; glowTo = 'rgba(99, 102, 241, 0.2)'; }
            else if (mod.key === 'violations') { glowFrom = 'rgba(239, 68, 68, 0.2)'; glowTo = 'rgba(249, 115, 22, 0.2)'; }
            else if (mod.key === 'delivery') { glowFrom = 'rgba(99, 102, 241, 0.2)'; glowTo = 'rgba(168, 85, 247, 0.2)'; }
            else if (mod.key === 'custody') { glowFrom = 'rgba(249, 115, 22, 0.2)'; glowTo = 'rgba(239, 68, 68, 0.2)'; }
            else if (mod.key === 'orders') { glowFrom = 'rgba(6, 182, 212, 0.2)'; glowTo = 'rgba(59, 130, 246, 0.2)'; }
            else if (mod.key === 'inventory') { glowFrom = 'rgba(59, 130, 246, 0.2)'; glowTo = 'rgba(99, 102, 241, 0.2)'; }
            else if (mod.key === 'production') { glowFrom = 'rgba(16, 185, 129, 0.2)'; glowTo = 'rgba(20, 184, 166, 0.2)'; }
            else if (mod.key === 'contracts') { glowFrom = 'rgba(20, 184, 166, 0.2)'; glowTo = 'rgba(6, 182, 212, 0.2)'; }
            else if (mod.key === 'shifts') { glowFrom = 'rgba(168, 85, 247, 0.2)'; glowTo = 'rgba(244, 63, 94, 0.2)'; }

            return (
              <div 
                key={mod.key} 
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '24px',
                  border: '1px solid #f1f5f9',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  boxShadow: isEnabled ? '0 4px 15px rgba(0,0,0,0.02)' : 'none',
                  opacity: isEnabled ? 1 : 0.6,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', width: '100%', direction: 'rtl' }}>
                  
                  {/* Left Side: Customize Button */}
                  <button 
                    onClick={() => setExpandedCard(expandedCard === mod.key ? null : mod.key)}
                    style={{
                      padding: '10px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: expandedCard === mod.key ? '#1a8d9b' : '#f8fafc',
                      color: expandedCard === mod.key ? '#ffffff' : '#94a3b8'
                    }}
                  >
                    <ChevronDown size={16} style={{ transition: 'transform 0.2s ease', transform: expandedCard === mod.key ? 'rotate(180deg)' : 'none' }} />
                  </button>

                  {/* Center: Title & Checkbox */}
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <h4 style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px', margin: '0 0 6px 0' }}>{mod.label}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox" 
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: '#1a8d9b'
                          }}
                          checked={isEnabled}
                          onChange={() => handleEventToggle(mod.key)}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isEnabled ? '#1a8d9b' : '#94a3b8' }}>
                          مفعل
                        </span>
                      </label>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                      {mod.desc}
                    </p>
                  </div>

                  {/* Right Side: Icon with Gradient Blur Glow */}
                  <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, ${glowFrom}, ${glowTo})`,
                      filter: 'blur(8px)',
                      opacity: isEnabled ? 0.8 : 0.2
                    }}></div>
                    <div style={{
                      position: 'relative',
                      zIndex: 10,
                      width: '40px',
                      height: '40px',
                      borderRadius: '16px',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid #f8fafc'
                    }}>
                      <Icon size={18} className={mod.iconColor} />
                    </div>
                  </div>
                </div>

                {/* Customize for specific departments */}
                {expandedCard === mod.key && (
                  <div style={{
                    marginTop: '16px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '16px',
                    width: '100%',
                    direction: 'rtl'
                  }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', display: 'block', textAlign: 'right' }}>
                      تخصيص لأقسام معينة
                    </label>
                    <Select
                      isMulti
                      options={departmentOptions}
                      value={departmentOptions.filter(opt => config[mod.key]?.departments?.includes(opt.value))}
                      onChange={(selectedOptions) => handleDepartmentChange(mod.key, selectedOptions)}
                      placeholder="كافة الأقسام"
                      menuPortalTarget={document.body}
                      styles={{
                        ...customSelectStyles,
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: '34px',
                          fontSize: '0.75rem',
                          borderRadius: '12px',
                          borderColor: '#f1f5f9',
                          backgroundColor: '#f8fafc'
                        })
                      }}
                      noOptionsMessage={() => "لا توجد أقسام"}
                      isClearable={true}
                    />
                    <button
                      onClick={() => handleTestModuleMessage(mod.key)}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1px solid #1a8d9b',
                        backgroundColor: '#f0f9fa',
                        color: '#1a8d9b',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Send size={14} />
                      <span>إرسال رسالة تجريبية لمرة واحدة</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Footer Banner */}
        <div style={{
          marginTop: '32px',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.1)',
          borderRadius: '24px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          direction: 'rtl'
        }}>
          <div style={{ textAlign: 'right', flex: 1 }}>
            <h4 style={{ fontWeight: 'bold', color: '#065f46', fontSize: '14px', margin: '0 0 4px 0' }}>جميع الإشعارات مفعلة وقواعد متوافقة لضمان وصولها</h4>
            <p style={{ fontSize: '12px', color: '#047857', fontWeight: '600', margin: 0 }}>تم تفعيل كافة القواعد مع إعدادات متقدمة لتجنب الحظر وضمان التسليم الفعال</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.1)',
            flexShrink: 0
          }}>
            <Shield size={20} style={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsAppSettingsTab;
