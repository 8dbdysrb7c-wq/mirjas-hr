import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, LogOut, CheckCircle, Save, Bell, Settings, Send, Clock, FileText, Calendar, AlertTriangle, DollarSign, Truck, Target, ShieldAlert, Award, Briefcase, ShoppingCart, Factory, Package, ChevronDown, ChevronRight, Fingerprint, Gavel, Shield, Building2, Leaf, ClipboardList, Trophy, X, Search, User, MapPin } from 'lucide-react';
import Select from '../../components/SearchSelect';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getGlobalSettings, saveGlobalSettings, getEmployees } from '../../store';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const MySwal = withReactContent(Swal);

const WhatsAppSettingsTab = ({ settings: globalSettings, setSettings: setGlobalSettings }) => {
  const [status, setStatus] = useState('LOADING');
  const [qrCode, setQrCode] = useState('');
  
  const [settings, setSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [isDetailedPanelExpanded, setIsDetailedPanelExpanded] = useState(false);
  const [selectedDetailedModule, setSelectedDetailedModule] = useState(null);
  const [matrixDeptFilter, setMatrixDeptFilter] = useState('الكل');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixSortOrder, setMatrixSortOrder] = useState('asc');
  const [selectedMatrixEmp, setSelectedMatrixEmp] = useState(null);
  
  // Broadcast Announcement States
  const [employeesList, setEmployeesList] = useState([]);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all'); // all, department, employee
  const [selectedBroadcastDepts, setSelectedBroadcastDepts] = useState([]);
  const [selectedBroadcastEmps, setSelectedBroadcastEmps] = useState([]);
  const [broadcastExclusions, setBroadcastExclusions] = useState([]);
  const [isExcluding, setIsExcluding] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const debouncedEmpSearchQuery = useDebounce(empSearchQuery);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const [config, setConfig] = useState({
    attendance: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    reminders: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    daily_report: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    rewards: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    report_approval: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    penalties: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    advances: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    overtime: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    leaves: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    tasks: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    violations: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    delivery: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    custody: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    orders: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    production_sewing: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    production_preparation: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    supervisor_reports: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    rep_visits: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    missing_punches: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    petitions: { enabled: true, departments: [], employee: true, supervisor: true, management: true },
    masterEnabled: true
  });

  const modules = [
    { key: 'attendance', label: 'الحضور والانصراف', icon: Fingerprint, glow: 'from-purple-500/20 to-indigo-500/20', iconColor: 'text-purple-600', desc: 'إشعارات تسجيل الحضور اليومي والانصراف الفعلي للموظفين.' },
    { key: 'reminders', label: 'إشعارات الدخول والخروج', icon: Clock, glow: 'from-cyan-500/20 to-teal-500/20', iconColor: 'text-cyan-600', desc: 'تنبيهات وتذكيرات الموظفين بمواعيد الدخول أو الخروج وتعديل فترات العمل.' },
    { key: 'daily_report', label: 'تقرير العمل اليومي', icon: ClipboardList, glow: 'from-blue-500/20 to-sky-500/20', iconColor: 'text-blue-600', desc: 'إشعارات تقديم التقارير اليومية للمشرفين لمتابعة الإنجازات اليومية.' },
    { key: 'rewards', label: 'المكافآت', icon: Trophy, glow: 'from-amber-500/20 to-yellow-500/20', iconColor: 'text-amber-600', desc: 'إشعارات منح الحوافز والمكافآت المالية والتقديرية للموظفين المتميزين.' },
    { key: 'penalties', label: 'المخالفات', icon: Gavel, glow: 'from-violet-500/20 to-fuchsia-500/20', iconColor: 'text-violet-600', desc: 'إشعارات تسجيل العقوبات والغرامات والجزاءات الإدارية المباشرة من الإدارة.' },
    { key: 'advances', label: 'السلف', icon: DollarSign, glow: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-600', desc: 'إشعارات تقديم طلبات السلف المالية والموافقة عليها أو رفضها وصرفها.' },
    { key: 'overtime', label: 'العمل الإضافي', icon: Clock, glow: 'from-blue-500/20 to-indigo-500/20', iconColor: 'text-blue-600', desc: 'إشعارات تقديم واعتماد طلبات ساعات العمل الإضافية للموظفين.' },
    { key: 'leaves', label: 'الإجازات والمغادرات', icon: Leaf, glow: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-600', desc: 'إشعارات طلبات الإجازات والمغادرات وتحديثات الموافقة أو الرفض عليها.' },
    { key: 'petitions', label: 'الاستدعاءات', icon: FileText, glow: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-600', desc: 'إشعارات تقديم الاستدعاءات ومراجعتها والإجراءات الإدارية الخاصة بها.' },
    { key: 'tasks', label: 'إدارة المهام', icon: ClipboardList, glow: 'from-orange-500/20 to-amber-500/20', iconColor: 'text-orange-600', desc: 'إشعارات إسناد المهام الجديدة ومتابعة حالتها ونسب إنجازها.' },
    { key: 'violations', label: 'تنبيهات الحضور والانصراف', icon: AlertTriangle, glow: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-600', desc: 'إشعارات المخالفات والإنذارات التلقائية للنظام مثل الغياب والتأخر عن العمل.' },
    { key: 'delivery', label: 'قسم التوصيل', icon: Truck, glow: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-600', desc: 'إشعارات استلام الطلبيات وتوزيعها وحالة الشحنات والتوصيل الفعلي للعملاء.' },
    { key: 'custody', label: 'العهدة', icon: Briefcase, glow: 'from-orange-500/20 to-red-500/20', iconColor: 'text-orange-600', desc: 'إشعارات تسليم واستلام العهد العينية والأصول الخاصة بالشركة للموظفين.' },
    { key: 'orders', label: 'الطلبيات', icon: ShoppingCart, glow: 'from-cyan-500/20 to-blue-500/20', iconColor: 'text-cyan-600', desc: 'إشعارات طلبات الشراء الداخلية وتأكيدات طلبيات المشتريات للقسم المالي.' },
    { key: 'production_sewing', label: 'إنتاج قيد الخياطة', icon: Factory, glow: 'from-green-500/20 to-teal-500/20', iconColor: 'text-green-600', desc: 'إشعارات أوامر إنتاج الخياطة وتحديثات حالتها اليومية.' },
    { key: 'production_preparation', label: 'إنتاج قيد التحضير', icon: Factory, glow: 'from-teal-500/20 to-emerald-500/20', iconColor: 'text-teal-600', desc: 'إشعارات أوامر إنتاج التحضير وتحديثات حالتها اليومية.' },
    { key: 'supervisor_reports', label: 'تقارير المشرفين', icon: FileText, glow: 'from-teal-500/20 to-emerald-500/20', iconColor: 'text-teal-600', desc: 'إشعارات وتنبيهات تقارير المشرفين والاعتماد الخاص بالإدارة.' },
    { key: 'rep_visits', label: 'زيارات المندوبين', icon: MapPin, glow: 'from-sky-500/20 to-blue-500/20', iconColor: 'text-sky-600', desc: 'إشعارات زيارات مندوبي المبيعات وعروض الأسعار والطلبيات المعتمدة للزبائن.' },
    { key: 'missing_punches', label: 'الختمات الناقصة', icon: Clock, glow: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-600', desc: 'إشعارات الموافقة أو الرفض لطلبات الختمات الناقصة للموظفين.' }
  ];

  useEffect(() => {
    loadSettings();
    loadEmployees();
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

  const loadEmployees = async () => {
    try {
      const emps = await getEmployees();
      setEmployeesList(emps);
    } catch(err) {
      console.error('Failed to load employees for broadcast list', err);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    let targets = [];
    if (broadcastTarget === 'all') {
      targets = employeesList.filter(e => e.phone);
      if (isExcluding && broadcastExclusions.length > 0) {
        targets = targets.filter(e => !broadcastExclusions.includes(e.id));
      }
    } else if (broadcastTarget === 'department') {
      const deptNames = selectedBroadcastDepts.map(d => d.value);
      targets = employeesList.filter(e => e.phone && deptNames.includes(e.department));
    } else if (broadcastTarget === 'employee') {
      targets = employeesList.filter(e => selectedBroadcastEmps.includes(e.id) && e.phone);
    }

    if (targets.length === 0) {
      MySwal.fire('تنبيه', 'لم يتم العثور على موظفين بهواتف صالحة في الاختيار الحالي.', 'warning');
      return;
    }

    const confirmMsg = `أنت على وشك إرسال هذا التعميم لـ ${targets.length} موظف. سيتم جدولة الرسائل لتصلهم تباعاً بشكل آمن وبفارق زمني لمنع الحظر. هل تريد الاستمرار؟`;
    const confirm = await MySwal.fire({
      title: 'هل تريد إرسال التعميم؟',
      text: confirmMsg,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، أرسل الآن',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#1a8d9b',
      cancelButtonColor: '#64748b'
    });

    if (confirm.isConfirmed) {
      setIsSendingBroadcast(true);
      try {
        const promises = targets.map(emp => {
          let phone = String(emp.phone).trim();
          return sendWhatsAppNotification(phone, broadcastMessage, 'general');
        });
        
        await Promise.all(promises);
        
        await MySwal.fire('تمت الجدولة!', `تمت إضافة ${targets.length} رسالة إلى قائمة الإرسال بنجاح. ستصل للموظفين تباعاً بمعدل رسالة كل 10 ثوانٍ لحماية حسابك من الحظر.`, 'success');
        
        setShowBroadcastModal(false);
        setBroadcastMessage('');
        setBroadcastTarget('all');
        setSelectedBroadcastDepts([]);
        setSelectedBroadcastEmps([]);
        setBroadcastExclusions([]);
        setIsExcluding(false);
        setEmpSearchQuery('');
      } catch (err) {
        console.error(err);
        MySwal.fire('خطأ', 'حدث خطأ أثناء جدولة إرسال الرسائل.', 'error');
      } finally {
        setIsSendingBroadcast(false);
      }
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
           MySwal.fire('تم الإرسال للطابور', 'تمت الإضافة لطابور الإرسال. إذا كان السيرفر متصلاً ستصل الرسالة قريباً (مع مراعاة الانتظار 35 ثانية).', 'success');
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
        case 'missing_punches':
          mockMessage = '*طلب ختمة ناقصة* ⏱️\nمرحباً أحمد، تم الموافقة على طلب الختمة الناقصة الخاصة بك بتاريخ 30-07-2026.\n-- الإدارة';
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

  const handleRoleToggle = (key, roleField) => {
    const moduleConf = config[key] || { enabled: true, departments: [] };
    const currentVal = moduleConf[roleField] !== false; // Default to true if undefined
    const updated = {
      ...config,
      [key]: { 
        ...moduleConf, 
        [roleField]: !currentVal 
      }
    };
    setConfig(updated);
    if (setGlobalSettings) {
      setGlobalSettings(prev => ({
        ...prev,
        whatsappConfig: updated
      }));
    }
  };

  const getModuleConfigField = (moduleKey, field, defaultValue) => {
    if (!config[moduleKey]) return defaultValue;
    if (config[moduleKey][field] === undefined) return defaultValue;
    return config[moduleKey][field];
  };

  const getModuleTrigger = (moduleKey, action) => {
    if (!config[moduleKey]?.triggers) return true; // default to true
    if (config[moduleKey].triggers[action] === undefined) return true;
    return config[moduleKey].triggers[action];
  };

  const getModuleTemplate = (moduleKey, action) => {
    if (config[moduleKey]?.templates?.[action] !== undefined) {
      return config[moduleKey].templates[action];
    }
    const defaultTemplates = {
      orders: {
        create: '*طلب شراء جديد* 🛒\nتم إنشاء طلب شراء جديد رقم {orderNumber} بقيمة {totalPrice} دينار للعميل {customerName}.',
        update: '*تحديث حالة الطلب* 🛒\nتم تعديل حالة طلب الشراء رقم {orderNumber} إلى ({status}) بمجموع {totalPrice} دينار.',
        delete: '*إلغاء طلب شراء* ❌\nتم إلغاء طلب الشراء رقم {orderNumber}.'
      },
      production_sewing: {
        create: '*أمر إنتاج خياطة جديد* 🧵\nتم إصدار كرت إنتاج (خياطة) جديد رقم {orderNumber} للصنف {productName} بكمية {quantity}.',
        update: '*تحديث حالة إنتاج الخياطة* 🧵\nتم تعديل حالة كرت إنتاج الخياطة رقم {orderNumber} إلى ({status}).',
        delete: '*إلغاء أمر إنتاج خياطة* ❌\nتم إلغاء كرت إنتاج الخياطة رقم {orderNumber}.'
      },
      production_preparation: {
        create: '*أمر إنتاج تحضير جديد* ✂️\nتم إصدار كرت إنتاج (تحضير) جديد رقم {orderNumber} للصنف {productName} بكمية {quantity}.',
        update: '*تحديث حالة إنتاج التحضير* ✂️\nتم تعديل حالة كرت إنتاج التحضير رقم {orderNumber} إلى ({status}).',
        delete: '*إلغاء أمر إنتاج تحضير* ❌\nتم إلغاء كرت إنتاج التحضير رقم {orderNumber}.'
      },
      delivery: {
        create: '*طلب توصيل جديد* 🚚\nتم تجهيز الشحنة للطلب رقم {orderNumber} وتعيين المندوب: {driverName}.',
        update: '*حالة التوصيل* 🚚\nتم تحديث حالة الشحنة للطلب رقم {orderNumber} إلى ({status}). المندوب: {driverName}.'
      },
      daily_report: {
        create: '*تقرير عمل جديد* 📝\nقام الموظف {employeeName} بتقديم تقرير العمل اليومي لتاريخ {date}.',
        approve: '*اعتماد تقرير العمل* ✅\nتم اعتماد تقرير العمل للموظف {employeeName} لتاريخ {date}.\nالتقييم: {rating}\nالملاحظات: {notes}'
      },
      overtime: {
        create: '*طلب عمل إضافي جديد* ⏰\nقدم الموظف {employeeName} طلب عمل إضافي لتاريخ {date}.\nالسبب: {reason}',
        approve: '*تحديث طلب العمل الإضافي* ⏰\nالزميل {employeeName}، تم {status} طلب العمل الإضافي الخاص بك لتاريخ {date}.\nالملاحظات: {reason}'
      },
      leaves: {
        create: '*طلب إجازة جديد* 📅\nقدم الموظف {employeeName} طلب إجازة ({leaveType}) لمدة {days} أيام تبدأ من {startDate}.',
        approve: '*تحديث طلب الإجازة* ✅\nالزميل {employeeName}، تم {status} طلب الإجازة ({leaveType}) الخاص بك لمدة {days} أيام تبدأ من {startDate}.'
      },
      reminders: {
        check_in: 'تذكير: لم يتبق سوى 5 دقائق على موعد بدء الدوام. يرجى تسجيل الدخول يا {employeeName}.',
        check_out: 'تذكير: لم يتبق سوى 5 دقائق على موعد انتهاء الدوام. يرجى الاستعداد لتسجيل الخروج يا {employeeName}.'
      },
      supervisor_reports: {
        reminder: '*تذكير المشرفين* 📝\nمرحباً {supervisorName}، يرجى تقديم تقرير العمل اليومي لمشرفي القسم لتاريخ اليوم.',
        approve: '*اعتماد تقرير المشرف* ✅\nتم اعتماد تقرير العمل اليومي للمشرف {supervisorName} لتاريخ اليوم بنجاح.\nملاحظات الإدارة: {adminNotes}'
      },
      rep_visits: {
        submit_visit: '*تقرير زيارة جديد* 📍\nقام المندوب {repName} بزيارة العميل: {customerName}.\nتفاصيل الزيارة: {visitDetails}',
        quotation_request: '*طلب عرض سعر* 📄\nطلب المندوب {repName} عرض سعر للعميل: {customerName}.\nالأصناف المطلوبة: {itemsList}',
        order_approved: '*طلبية جديدة معتمدة* 🎉\nاعتمد العميل {customerName} طلبية جديدة بقيمة {orderValue}.\nالمندوب المتابع: {repName}'
      },
      rewards: {
        create: '*مكافأة تقديرية* 🎉\nمرحباً {employeeName}، يسعدنا إبلاغك بأنه قد تم تسجيل مكافأة مالية بقيمة {amount} دينار تقديراً لجهودك المتميزة في العمل. شكراً لعطائك المستمر! 🌟'
      },
      penalties: {
        create: '*إشعار إداري رسمي* ⚠️\nالزميل {employeeName}، يرجى العلم بأنه قد تم تسجيل تنبيه/مخالفة إدارية ({penaltyType}) لتاريخ {date}. نرجو منكم الالتزام باللوائح والتعليمات الداخلية للعمل. شاكرين تعاونكم.'
      },
      violations: {
        create: '*تنبيه حضور وانصراف* ⏱️\nالزميل {employeeName}، يرجى العلم بأن النظام سجل تنبيه حضور وانصراف ({violationType}) لتاريخ {date}. يرجى التنسيق مع الموارد البشرية لتسوية الأمر. دمتم بخير.'
      },
      custody: {
        create: '*تسليم عهدة جديدة* 📦\nمرحباً {employeeName}، تم تسجيل تسليم عهدة جديدة لك: {custodyName} بتاريخ {date}. يرجى الحفاظ عليها وإعادتها عند اللزوم.'
      },
      advances: {
        create: '*طلب سلفة جديد* 💵\nقدم الموظف {employeeName} طلب سلفة جديدة بقيمة {amount} دينار.\nالسبب: {reason}',
        approve: '*تحديث طلب السلفة* 💵\nالزميل {employeeName}، تم {status} طلب السلفة الخاص بك بقيمة {amount} دينار.\nملاحظة: {reason}'
      },
      tasks: {
        create: '*مهمة جديدة مسندة* 📋\nتم إسناد مهمة جديدة بعنوان: {taskTitle}.\nالموظف المسؤول: {employeeName}\nتاريخ التسليم: {dueDate}',
        update: '*تحديث على المهمة* 📋\nحدث تغيير أو رد على المهمة: {taskTitle}.\nالحالة الحالية: {status}\nالمسؤول: {employeeName}\nالتحديث: {updateDetails}'
      },
      missing_punches: {
        approve: '*اعتماد طلب ختمة ناقصة* ⏱️\nمرحباً {employeeName}،\nتمت الموافقة على طلب الختمة الناقصة الخاصة بك لتاريخ {date}.\n{notes}\n-- الإدارة',
        reject: '*رفض طلب ختمة ناقصة* ❌\nمرحباً {employeeName}،\nتم رفض طلب الختمة الناقصة الخاصة بك لتاريخ {date}.\n{notes}\n-- الإدارة'
      }
    };
    return defaultTemplates[moduleKey]?.[action] || '';
  };

  const handleDetailedToggle = (moduleKey, field) => {
    setConfig(prev => {
      const moduleConf = prev[moduleKey] || { enabled: true, departments: [] };
      const currentVal = moduleConf[field] !== false; // Default to true
      const updated = {
        ...prev,
        [moduleKey]: {
          ...moduleConf,
          [field]: !currentVal
        }
      };
      if (setGlobalSettings) {
        setGlobalSettings(prevSettings => ({
          ...prevSettings,
          whatsappConfig: updated
        }));
      }
      return updated;
    });
  };

  const handleDetailedTriggerToggle = (moduleKey, action) => {
    setConfig(prev => {
      const moduleConf = prev[moduleKey] || { enabled: true, departments: [] };
      const triggers = moduleConf.triggers || {};
      const currentVal = triggers[action] !== false; // Default to true
      const updated = {
        ...prev,
        [moduleKey]: {
          ...moduleConf,
          triggers: {
            ...triggers,
            [action]: !currentVal
          }
        }
      };
      if (setGlobalSettings) {
        setGlobalSettings(prevSettings => ({
          ...prevSettings,
          whatsappConfig: updated
        }));
      }
      return updated;
    });
  };

  const handleDetailedTemplateChange = (moduleKey, action, text) => {
    setConfig(prev => {
      const moduleConf = prev[moduleKey] || { enabled: true, departments: [] };
      const templates = moduleConf.templates || {};
      const updated = {
        ...prev,
        [moduleKey]: {
          ...moduleConf,
          templates: {
            ...templates,
            [action]: text
          }
        }
      };
      if (setGlobalSettings) {
        setGlobalSettings(prevSettings => ({
          ...prevSettings,
          whatsappConfig: updated
        }));
      }
      return updated;
    });
  };

  const uniqueDepartments = [
    'الكل', 
    'المشرفين', 
    ...new Set(employeesList.map(e => e.department).filter(d => d !== 'المشرفين' && d !== 'مشرف' && d !== 'المشرف').filter(Boolean))
  ];

  const filteredEmployeesForMatrix = employeesList.filter(emp => {
    if (matrixDeptFilter !== 'الكل') {
      if (matrixDeptFilter === 'المشرفين') {
        const isSupervisor = emp.level === 'supervisor' || emp.level === 'مشرف' || emp.level === 'مشرف قسم' || emp.userType === 'مشرف قسم' || emp.role === 'مشرف قسم' || emp.permissions?.isSupervisor || (emp.name && emp.name.includes('مشرف')) || String(emp.department).includes('مشرف');
        if (!isSupervisor) return false;
      } else {
        if (emp.department !== matrixDeptFilter) return false;
      }
    }
    if (selectedMatrixEmp) {
      if (emp.id !== selectedMatrixEmp.value) return false;
    }
    return true;
  }).sort((a, b) => {
    const getDeptRank = (deptName) => {
      const name = String(deptName || '').trim();
      if (name === 'الإدارة' || name.includes('إدارة') || name.includes('اداره')) return 1;
      if (name === 'المشرفين' || name.includes('مشرف') || name.includes('المشرف')) return 2;
      return 3;
    };

    const rankA = getDeptRank(a.department);
    const rankB = getDeptRank(b.department);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const deptA = String(a.department || '');
    const deptB = String(b.department || '');
    const deptComp = deptA.localeCompare(deptB, 'ar');
    if (deptComp !== 0) return deptComp;

    const nameA = String(a.name || '');
    const nameB = String(b.name || '');
    return nameA.localeCompare(nameB, 'ar');
  });

  const handleEmployeeMatrixToggle = (moduleKey, employeeId) => {
    setConfig(prev => {
      const moduleConf = prev[moduleKey] || { enabled: true, departments: [] };
      let allowedList = moduleConf.allowedEmployees;
      
      if (!Array.isArray(allowedList)) {
        allowedList = employeesList.map(e => e.id).filter(id => id !== employeeId);
      } else {
        if (allowedList.includes(employeeId)) {
          allowedList = allowedList.filter(id => id !== employeeId);
        } else {
          allowedList = [...allowedList, employeeId];
        }
      }

      const updated = {
        ...prev,
        [moduleKey]: {
          ...moduleConf,
          allowedEmployees: allowedList
        }
      };
      if (setGlobalSettings) {
        setGlobalSettings(prevSettings => ({
          ...prevSettings,
          whatsappConfig: updated
        }));
      }
      return updated;
    });
  };

  const handleSelectAllMatrix = (moduleKey, selectAll) => {
    setConfig(prev => {
      const moduleConf = prev[moduleKey] || { enabled: true, departments: [] };
      let allowedList = [];
      if (selectAll) {
        const targetIds = filteredEmployeesForMatrix.map(e => e.id);
        const existingList = moduleConf.allowedEmployees || employeesList.map(e => e.id);
        allowedList = [...new Set([...existingList, ...targetIds])];
      } else {
        const targetIds = filteredEmployeesForMatrix.map(e => e.id);
        const existingList = moduleConf.allowedEmployees || employeesList.map(e => e.id);
        allowedList = existingList.filter(id => !targetIds.includes(id));
      }

      const updated = {
        ...prev,
        [moduleKey]: {
          ...moduleConf,
          allowedEmployees: allowedList
        }
      };
      if (setGlobalSettings) {
        setGlobalSettings(prevSettings => ({
          ...prevSettings,
          whatsappConfig: updated
        }));
      }
      return updated;
    });
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

  const filteredEmployeesForSelection = employeesList.filter(emp => 
    emp.phone &&
    matchesSearch([emp.name, emp.id, emp.jobTitle, emp.department, emp.phone], debouncedEmpSearchQuery)
  );

  const employeeNameOptions = employeesList.map(emp => ({
    value: emp.id,
    label: emp.name
  }));

  const employeeIdOptions = employeesList.map(emp => ({
    value: emp.id,
    label: String(emp.id)
  }));

  return (
    <div className="space-y-6">
      {/* 1. Connection Status Card */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-6" style={{ direction: 'rtl' }}>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <MessageSquare className="text-primary" style={{ marginLeft: '8px' }} /> إعدادات الربط بالواتساب (السحابي)
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

      {/* 2. Controls & Actions Card */}
      <div className="glass-card" style={{ padding: '24px', direction: 'rtl', textAlign: 'right' }}>
        <h3 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ display: 'flex', alignItems: 'center' }}>
          <Settings className="text-primary" /> لوحة التحكم بالإرسال الجماعي والإعدادات
        </h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowBroadcastModal(true)}
            style={{
              borderRadius: '16px',
              padding: '12px 24px',
              fontWeight: 'bold',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Send size={18} /> إرسال تعميم / رسالة جماعية للموظفين
          </button>

          <button 
            onClick={handleTestMessage}
            style={{
              borderRadius: '16px',
              padding: '12px 24px',
              fontWeight: 'bold',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <Send size={18} style={{ transform: 'rotate(-45deg)', color: '#94a3b8' }} /> تجربة إرسال رسالة
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#f8fafc',
            padding: '10px 16px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            marginRight: 'auto'
          }}>
            <span style={{
              fontWeight: 'bold',
              fontSize: '13px',
              color: config.masterEnabled !== false ? '#126a75' : '#64748b'
            }}>
              {config.masterEnabled !== false ? 'إرسال الإشعارات مفعل' : 'إرسال الإشعارات معطل بالكامل'}
            </span>
            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
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
                position: 'absolute',
                inset: 0,
                backgroundColor: config.masterEnabled !== false ? '#1a8d9b' : '#cbd5e1',
                borderRadius: '999px',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  right: config.masterEnabled !== false ? '2px' : '20px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }} />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Detailed Configuration Card */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Accordion Header */}
        <div 
          onClick={() => setIsDetailedPanelExpanded(!isDetailedPanelExpanded)}
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            direction: 'rtl',
            backgroundColor: '#ffffff',
            borderBottom: isDetailedPanelExpanded ? '1px solid #f1f5f9' : 'none',
            userSelect: 'none',
            transition: 'background-color 0.2s'
          }}
          className="hover:bg-slate-50"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              backgroundColor: 'rgba(26, 141, 155, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a8d9b'
            }}>
              <Bell size={20} style={{ fill: 'rgba(26, 141, 155, 0.1)' }} />
            </div>
            <div style={{ marginRight: '10px', textAlign: 'right' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: 0 }}>إعدادات إشعارات الواتساب التفصيلية للأقسام</h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0', fontWeight: 'bold' }}>تخصيص الموظفين المستهدفين، وقوالب الرسائل، وحركات الإرسال لكل قسم</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isDetailedPanelExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveConfig();
                }}
                disabled={isSaving}
                className="btn-premium-save"
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#1a8d9b',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(26, 141, 155, 0.15)'
                }}
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                حفظ الإعدادات
              </button>
            )}
            <ChevronDown 
              size={20} 
              style={{ 
                color: '#64748b', 
                transition: 'transform 0.3s ease', 
                transform: isDetailedPanelExpanded ? 'rotate(180deg)' : 'none' 
              }} 
            />
          </div>
        </div>

        {/* Collapsible Panel Content */}
        {isDetailedPanelExpanded && (
          <div style={{ display: 'flex', height: '600px', direction: 'rtl' }}>
            
            {/* Right Panel: Module Tabs Navigation */}
            <div style={{
              width: '280px',
              borderLeft: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {/* Master Toggle Button at the top */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #e6f7f8, #c7ecee)',
                border: '1px solid #a3e2e6',
                borderRadius: '20px',
                marginBottom: '16px',
                direction: 'rtl',
                boxShadow: '0 4px 12px rgba(26, 141, 155, 0.08)'
              }}>
                <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
                  <input 
                    type="checkbox"
                    checked={modules.every(m => config[m.key]?.enabled !== false)}
                    onChange={(e) => {
                      const shouldEnable = e.target.checked;
                      setConfig(prev => {
                        const updated = {};
                        Object.keys(prev).forEach(key => {
                          updated[key] = {
                            ...prev[key],
                            enabled: shouldEnable
                          };
                        });
                        if (setGlobalSettings) {
                          setGlobalSettings(prevSettings => ({
                            ...prevSettings,
                            whatsappConfig: updated
                          }));
                        }
                        return updated;
                      });
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: modules.every(m => config[m.key]?.enabled !== false) ? '#1a8d9b' : '#cbd5e1',
                    transition: '0.3s',
                    borderRadius: '20px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px',
                      width: '14px',
                      left: modules.every(m => config[m.key]?.enabled !== false) ? '20px' : '4px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.3s',
                      borderRadius: '50%'
                    }} />
                  </span>
                </label>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#126a75' }}>تفعيل كافة الأقسام</span>
              </div>

              {modules.map(mod => {
                const isActive = selectedDetailedModule === mod.key;
                const isEnabled = config[mod.key]?.enabled !== false;
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.key}
                    onClick={() => setSelectedDetailedModule(mod.key)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: isActive ? '#1a8d9b' : 'transparent',
                      color: isActive ? '#ffffff' : '#475569',
                      fontWeight: isActive ? 'bold' : '600',
                      boxShadow: isActive ? '0 4px 12px rgba(26, 141, 155, 0.15)' : 'none'
                    }}
                  >
                    <label 
                      onClick={(e) => e.stopPropagation()}
                      style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <input 
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {
                          setConfig(prev => {
                            const moduleConf = prev[mod.key] || { enabled: true, departments: [] };
                            const updated = {
                              ...prev,
                              [mod.key]: {
                                ...moduleConf,
                                enabled: !isEnabled
                              }
                            };
                            if (setGlobalSettings) {
                              setGlobalSettings(prevSettings => ({
                                ...prevSettings,
                                whatsappConfig: updated
                              }));
                            }
                            return updated;
                          });
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: isEnabled ? (isActive ? '#ffffff' : '#1a8d9b') : '#cbd5e1',
                        transition: '0.3s',
                        borderRadius: '20px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '14px',
                          width: '14px',
                          left: isEnabled ? '18px' : '4px',
                          bottom: '3px',
                          backgroundColor: isEnabled ? (isActive ? '#1a8d9b' : '#ffffff') : '#ffffff',
                          transition: '0.3s',
                          borderRadius: '50%'
                        }} />
                      </span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={18} className={isActive ? 'text-white' : mod.iconColor} />
                      <span style={{ fontSize: '13px' }}>{mod.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Left Panel: Configuration Fields */}
            <div style={{
              flex: 1,
              padding: '28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px',
              textAlign: 'right',
              backgroundColor: '#ffffff'
            }}>
              {!selectedDetailedModule ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px',
                  color: '#64748b',
                  gap: '16px',
                  padding: '24px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '24px',
                  border: '2px dashed #cbd5e1',
                  textAlign: 'center'
                }}>
                  <Settings size={48} style={{ color: '#cbd5e1' }} />
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#334155' }}>
                    الرجاء اختيار القسم المطلوب من القائمة الجانبية
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '320px', lineHeight: '1.6' }}>
                    انقر على أي قسم من القائمة المعروضة على اليمين لتخصيص قوالب الرسائل وتحديد الموظفين المستهدفين بالإشعارات الخاصة به.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    borderBottom: '1.5px solid #f1f5f9',
                    paddingBottom: '14px',
                    marginBottom: '-12px'
                  }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: '#1a8d9b', fontWeight: '900' }}>
                      {modules.find(m => m.key === selectedDetailedModule)?.label}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#1e293b', fontWeight: 'extrabold' }}>1. اختيار وتحديد الموظفين المستهدفين بالإرسال</h5>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', direction: 'rtl', marginBottom: '8px' }}>
                  {uniqueDepartments.map(dept => {
                    const isSelected = matrixDeptFilter === dept;
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => setMatrixDeptFilter(dept)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '12px',
                          border: isSelected ? 'none' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#1a8d9b' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          fontWeight: 'bold',
                          fontSize: '11px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 4px 8px rgba(26, 141, 155, 0.15)' : 'none'
                        }}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectAllMatrix(selectedDetailedModule, true)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '12px',
                        backgroundColor: '#f1f5f9',
                        color: '#1a8d9b',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllMatrix(selectedDetailedModule, false)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '12px',
                        backgroundColor: '#f1f5f9',
                        color: '#ef4444',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      إلغاء تحديد الكل
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '430px', direction: 'rtl' }}>
                    {/* ID Dropdown */}
                    <div style={{ flex: 1.2, position: 'relative', minWidth: '130px' }}>
                      <Select
                        options={employeeIdOptions}
                        value={selectedMatrixEmp}
                        onChange={(val) => setSelectedMatrixEmp(val)}
                        placeholder="رقم الموظف..."
                        isClearable={true}
                        isSearchable={true}
                        styles={{
                          ...customSelectStyles,
                          control: (base) => ({
                            ...base,
                            minHeight: '38px',
                            borderRadius: '12px',
                            borderColor: '#cbd5e1',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: '#ffffff',
                            boxShadow: 'none'
                          }),
                          placeholder: (base) => ({
                            ...base,
                            whiteSpace: 'nowrap'
                          })
                        }}
                        noOptionsMessage={() => "لا توجد نتائج"}
                      />
                    </div>

                    {/* Name Dropdown */}
                    <div style={{ flex: 2, position: 'relative' }}>
                      <Select
                        options={employeeNameOptions}
                        value={selectedMatrixEmp}
                        onChange={(val) => setSelectedMatrixEmp(val)}
                        placeholder="اسم الموظف..."
                        isClearable={true}
                        isSearchable={true}
                        styles={{
                          ...customSelectStyles,
                          control: (base) => ({
                            ...base,
                            minHeight: '38px',
                            borderRadius: '12px',
                            borderColor: '#cbd5e1',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: '#ffffff',
                            boxShadow: 'none'
                          }),
                          valueContainer: (base) => ({
                            ...base,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 8px'
                          }),
                          placeholder: (base) => ({
                            ...base,
                            whiteSpace: 'nowrap'
                          })
                        }}
                        components={{
                          Placeholder: (props) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                              <User size={14} style={{ color: '#94a3b8' }} />
                              <span style={{ color: '#94a3b8' }}>{props.children}</span>
                            </div>
                          ),
                          SingleValue: (props) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                              <User size={14} style={{ color: '#1a8d9b' }} />
                              <span style={{ fontWeight: 'bold' }}>{props.children}</span>
                            </div>
                          )
                        }}
                        noOptionsMessage={() => "لا توجد نتائج"}
                      />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '8px 12px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '20px',
                  backgroundColor: '#f8fafc',
                  direction: 'rtl'
                }}>
                  {filteredEmployeesForMatrix.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>
                      لا يوجد موظفين يطابقون خيارات البحث أو التصفية الحالية.
                    </div>
                  ) : (
                    filteredEmployeesForMatrix.map(emp => {
                      const allowedList = config[selectedDetailedModule]?.allowedEmployees;
                      const isChecked = !Array.isArray(allowedList) ? true : allowedList.includes(emp.id);

                      return (
                        <label
                          key={emp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                            fontSize: '12.5px',
                            color: '#334155',
                            fontWeight: 'bold',
                            borderRadius: '8px',
                            backgroundColor: isChecked ? 'rgba(26, 141, 155, 0.04)' : 'transparent',
                            border: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleEmployeeMatrixToggle(selectedDetailedModule, emp.id)}
                            style={{ width: '15px', height: '15px', accentColor: '#1a8d9b', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={`${emp.name} | #${emp.employeeId || emp.id}${emp.department ? ` (${emp.department})` : ''}`}>
                            {emp.name}
                            <span style={{ fontSize: '10px', color: '#1a8d9b', marginRight: '6px', fontWeight: 'extrabold', backgroundColor: 'rgba(26, 141, 155, 0.08)', padding: '2px 6px', borderRadius: '6px' }}>
                              #{emp.employeeId || emp.id}
                            </span>
                            {emp.department && (
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginRight: '6px', fontWeight: 'normal' }}>
                                ({emp.department})
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h5 style={{ margin: '0', fontSize: '13px', color: '#1e293b', fontWeight: 'extrabold' }}>2. الحركات المفعلة وقوالب إرسال الرسائل</h5>
                
                {(
                  selectedDetailedModule === 'reminders' ? ['check_in', 'check_out'] :
                  selectedDetailedModule === 'supervisor_reports' ? ['reminder', 'approve'] :
                  selectedDetailedModule === 'rep_visits' ? ['submit_visit', 'quotation_request', 'order_approved'] :
                  selectedDetailedModule === 'tasks' ? ['create', 'update'] :
                  selectedDetailedModule === 'missing_punches' ? ['approve', 'reject'] :
                  ['daily_report', 'overtime', 'leaves', 'advances'].includes(selectedDetailedModule) ? ['create', 'approve'] :
                  ['rewards', 'penalties', 'violations', 'custody'].includes(selectedDetailedModule) ? ['create'] :
                  selectedDetailedModule === 'delivery' ? ['create', 'update'] :
                  ['create', 'update', 'delete']
                ).map(action => {
                  const isActionActive = getModuleTrigger(selectedDetailedModule, action);
                  
                  let actionLabel = '';
                  if (action === 'check_in') actionLabel = 'تذكير تسجيل الحضور (قبل الدوام بـ 5 دقائق)';
                  else if (action === 'check_out') actionLabel = 'تذكير تسجيل الانصراف (قبل نهاية الدوام بـ 5 دقائق)';
                  else if (action === 'reminder') actionLabel = 'قالب تذكير بتقديم تقرير المشرف (تلقائي)';
                  else if (action === 'approve' && selectedDetailedModule === 'supervisor_reports') actionLabel = 'اعتماد تقرير المشرف (عند موافقة الإدارة)';
                  else if (action === 'submit_visit') actionLabel = 'عند تقديم المندوب لتقرير زيارة عن أي زيارة زبون';
                  else if (action === 'quotation_request') actionLabel = 'عند طلب عرض سعر لزبون من المندوب';
                  else if (action === 'order_approved') actionLabel = 'عند اعتماد زبون لطلبية جديدة للمتابعة مع المندوب';
                  else if (action === 'create' && selectedDetailedModule === 'rewards') actionLabel = 'عند تسجيل مكافأة تقديرية للموظف';
                  else if (action === 'create' && selectedDetailedModule === 'penalties') actionLabel = 'عند تسجيل مخالفة/تنبيه إداري على الموظف';
                  else if (action === 'create' && selectedDetailedModule === 'violations') actionLabel = 'عند تسجيل تنبيه حضور وانصراف تلقائي من النظام';
                  else if (action === 'create' && selectedDetailedModule === 'custody') actionLabel = 'عند تسليم عهدة جديدة للموظف';
                  else if (action === 'create' && selectedDetailedModule === 'advances') actionLabel = 'عند تقديم الموظف لطلب سلفة جديدة';
                  else if (action === 'approve' && selectedDetailedModule === 'advances') actionLabel = 'عند قبول/موافقة أو رفض طلب السلفة';
                  else if (action === 'create' && selectedDetailedModule === 'tasks') actionLabel = 'عند إسناد مهمة جديدة للمسؤول';
                  else if (action === 'update' && selectedDetailedModule === 'tasks') actionLabel = 'عند تحديث المهمة أو إضافة رد/تعليق عليها';
                  else if (action === 'approve' && selectedDetailedModule === 'missing_punches') actionLabel = 'عند الموافقة على طلب الختمة الناقصة';
                  else if (action === 'reject' && selectedDetailedModule === 'missing_punches') actionLabel = 'عند رفض طلب الختمة الناقصة';
                  else if (action === 'create') actionLabel = 'عند الإضافة (إدخل جديد للقسم)';
                  else if (action === 'update') actionLabel = 'عند التحديث (تعديل الحالة / التقييم)';
                  else if (action === 'approve') actionLabel = 'عند موافقة أو اعتماد المشرف';
                  else actionLabel = 'عند الإلغاء أو الحذف';

                  const templateText = getModuleTemplate(selectedDetailedModule, action);

                  let variablesGuide = '{orderNumber}';
                  if (selectedDetailedModule === 'production_sewing') variablesGuide = '{orderNumber}, {productName}, {quantity}, {status}';
                  else if (selectedDetailedModule === 'production_preparation') variablesGuide = '{orderNumber}, {productName}, {quantity}, {status}';
                  else if (selectedDetailedModule === 'orders') variablesGuide = '{orderNumber}, {totalPrice}, {customerName}, {status}';
                  else if (selectedDetailedModule === 'delivery') variablesGuide = '{orderNumber}, {driverName}, {status}';
                  else if (selectedDetailedModule === 'daily_report') variablesGuide = '{employeeName}, {date}, {rating}, {notes}';
                  else if (selectedDetailedModule === 'leaves') variablesGuide = '{employeeName}, {leaveType}, {days}, {startDate}, {status}';
                  else if (selectedDetailedModule === 'overtime') variablesGuide = '{employeeName}, {date}, {status}, {reason}';
                  else if (selectedDetailedModule === 'reminders') variablesGuide = '{employeeName}';
                  else if (selectedDetailedModule === 'supervisor_reports' && action === 'reminder') variablesGuide = '{supervisorName}, {date}';
                  else if (selectedDetailedModule === 'supervisor_reports' && action === 'approve') variablesGuide = '{supervisorName}, {date}, {adminNotes}';
                  else if (selectedDetailedModule === 'rep_visits' && action === 'submit_visit') variablesGuide = '{repName}, {customerName}, {visitDetails}';
                  else if (selectedDetailedModule === 'rep_visits' && action === 'quotation_request') variablesGuide = '{repName}, {customerName}, {itemsList}';
                  else if (selectedDetailedModule === 'rep_visits' && action === 'order_approved') variablesGuide = '{repName}, {customerName}, {orderValue}';
                  else if (selectedDetailedModule === 'rewards') variablesGuide = '{employeeName}, {amount}';
                  else if (selectedDetailedModule === 'penalties') variablesGuide = '{employeeName}, {penaltyType}, {date}';
                  else if (selectedDetailedModule === 'violations') variablesGuide = '{employeeName}, {violationType}, {date}';
                  else if (selectedDetailedModule === 'custody') variablesGuide = '{employeeName}, {custodyName}, {date}';
                  else if (selectedDetailedModule === 'advances' && action === 'create') variablesGuide = '{employeeName}, {amount}, {reason}';
                  else if (selectedDetailedModule === 'advances' && action === 'approve') variablesGuide = '{employeeName}, {amount}, {status}, {reason}';
                  else if (selectedDetailedModule === 'tasks' && action === 'create') variablesGuide = '{taskTitle}, {employeeName}, {dueDate}';
                  else if (selectedDetailedModule === 'tasks' && action === 'update') variablesGuide = '{taskTitle}, {status}, {employeeName}, {updateDetails}';
                  else if (selectedDetailedModule === 'missing_punches') variablesGuide = '{employeeName}, {date}, {notes}';

                  return (
                    <div 
                      key={action}
                      style={{
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '24px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: isActionActive ? '#ffffff' : '#f8fafc',
                        opacity: isActionActive ? 1 : 0.75,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContents: 'space-between' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                          <input 
                            type="checkbox"
                            checked={isActionActive}
                            onChange={() => handleDetailedTriggerToggle(selectedDetailedModule, action)}
                            style={{ accentColor: '#1a8d9b', cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          {actionLabel}
                        </label>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
                          {action}
                        </span>
                      </div>

                      {isActionActive && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <textarea
                            value={templateText}
                            onChange={(e) => handleDetailedTemplateChange(selectedDetailedModule, action, e.target.value)}
                            placeholder="اكتب قالب رسالة الواتساب هنا..."
                            style={{
                              width: '100%',
                              minHeight: '80px',
                              padding: '12px',
                              borderRadius: '16px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              direction: 'rtl',
                              outline: 'none'
                            }}
                          />
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                            💡 المتغيرات المتاحة: <code style={{ direction: 'ltr', display: 'inline-block', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>{variablesGuide}</code>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
          </div>
        )}
      </div>
      {showBroadcastModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          direction: 'rtl'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '32px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}>
            {/* Close button */}
            <button 
              onClick={() => {
                setShowBroadcastModal(false);
                setBroadcastMessage('');
                setBroadcastTarget('all');
                setSelectedBroadcastDepts([]);
                setSelectedBroadcastEmps([]);
                setBroadcastExclusions([]);
                setIsExcluding(false);
                setEmpSearchQuery('');
              }}
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '850', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={22} style={{ color: '#1a8d9b' }} />
              إرسال تعميم جديد للموظفين
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              سيتم إرسال الرسالة إلى قائمة الموظفين المحددة عبر الواتساب مع تطبيق فترات الانتظار الآمنة.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Target selection */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>الفئة المستهدفة</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1.5px solid', borderColor: broadcastTarget === 'all' ? '#1a8d9b' : '#e2e8f0', backgroundColor: broadcastTarget === 'all' ? '#f0fdfa' : '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: broadcastTarget === 'all' ? '#126a75' : '#475569' }}>
                    <input type="radio" name="broadcastTarget" value="all" checked={broadcastTarget === 'all'} onChange={() => { setBroadcastTarget('all'); setEmpSearchQuery(''); }} style={{ accentColor: '#1a8d9b' }} />
                    الكل
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1.5px solid', borderColor: broadcastTarget === 'department' ? '#1a8d9b' : '#e2e8f0', backgroundColor: broadcastTarget === 'department' ? '#f0fdfa' : '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: broadcastTarget === 'department' ? '#126a75' : '#475569' }}>
                    <input type="radio" name="broadcastTarget" value="department" checked={broadcastTarget === 'department'} onChange={() => { setBroadcastTarget('department'); setEmpSearchQuery(''); }} style={{ accentColor: '#1a8d9b' }} />
                    حسب القسم
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1.5px solid', borderColor: broadcastTarget === 'employee' ? '#1a8d9b' : '#e2e8f0', backgroundColor: broadcastTarget === 'employee' ? '#f0fdfa' : '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: broadcastTarget === 'employee' ? '#126a75' : '#475569' }}>
                    <input type="radio" name="broadcastTarget" value="employee" checked={broadcastTarget === 'employee'} onChange={() => { setBroadcastTarget('employee'); setEmpSearchQuery(''); }} style={{ accentColor: '#1a8d9b' }} />
                    موظفين محددين
                  </label>
                </div>
              </div>

              {/* All target settings (including Exclusions checkbox list) */}
              {broadcastTarget === 'all' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px', userSelect: 'none' }}>
                    <input 
                      type="checkbox"
                      checked={isExcluding}
                      onChange={(e) => {
                        setIsExcluding(e.target.checked);
                        if (!e.target.checked) setBroadcastExclusions([]);
                        setEmpSearchQuery('');
                      }}
                      style={{ width: '16px', height: '16px', accentColor: '#1a8d9b', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                      عمل استثناء لموظفين معينين (استبعادهم من الإرسال)
                    </span>
                  </label>

                  {isExcluding && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>اختر الموظفين المستبعدين ({broadcastExclusions.length})</label>
                        <button 
                          type="button" 
                          onClick={() => setBroadcastExclusions([])}
                          style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                      
                      {/* Search box for exclusions */}
                      <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', height: '38px', marginBottom: '8px' }}>
                        <Search size={14} style={{ color: '#94a3b8', marginLeft: '6px' }} />
                        <input 
                          type="text" 
                          placeholder="ابحث باسم الموظف المستبعد..."
                          value={empSearchQuery}
                          onChange={(e) => setEmpSearchQuery(e.target.value)}
                          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'transparent', color: '#334155' }}
                        />
                      </div>

                      {/* Scrollable list for exclusions */}
                      <div style={{
                        maxHeight: '140px',
                        overflowY: 'auto',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff'
                      }}>
                        {filteredEmployeesForSelection.map(emp => {
                          const isChecked = broadcastExclusions.includes(emp.id);
                          return (
                            <label 
                              key={emp.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                backgroundColor: isChecked ? '#fff5f5' : 'transparent',
                                transition: 'background-color 0.2s',
                                userSelect: 'none'
                              }}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setBroadcastExclusions(prev => 
                                    prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                  );
                                }}
                                style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: isChecked ? '#b91c1c' : '#334155' }}>{emp.name}</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>رقم وظيفي: {emp.id} | هاتف: {emp.phone}</span>
                              </div>
                            </label>
                          );
                        })}
                        {filteredEmployeesForSelection.length === 0 && (
                          <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                            لا توجد نتائج مطابقة للبحث
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Department selector */}
              {broadcastTarget === 'department' && (
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>اختر الأقسام</label>
                  <Select
                    isMulti
                    options={departmentOptions}
                    value={selectedBroadcastDepts}
                    onChange={setSelectedBroadcastDepts}
                    placeholder="اختر قسماً أو أكثر..."
                    styles={customSelectStyles}
                  />
                </div>
              )}

              {/* Employee checkbox list for include selection */}
              {broadcastTarget === 'employee' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>اختر الموظفين المستهدفين ({selectedBroadcastEmps.length})</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setSelectedBroadcastEmps(filteredEmployeesForSelection.map(e => e.id))}
                        style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a8d9b', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        تحديد الكل
                      </button>
                      <span style={{ color: '#cbd5e1', fontSize: '11px' }}>|</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedBroadcastEmps([])}
                        style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>
                  
                  {/* Search box for inclusions */}
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', height: '38px', marginBottom: '8px' }}>
                    <Search size={14} style={{ color: '#94a3b8', marginLeft: '6px' }} />
                    <input 
                      type="text" 
                      placeholder="ابحث باسم الموظف أو الرقم الوظيفي..."
                      value={empSearchQuery}
                      onChange={(e) => setEmpSearchQuery(e.target.value)}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '12px', fontWeight: 'bold', backgroundColor: 'transparent', color: '#334155' }}
                    />
                  </div>

                  {/* Scrollable list for inclusions */}
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff'
                  }}>
                    {filteredEmployeesForSelection.map(emp => {
                      const isChecked = selectedBroadcastEmps.includes(emp.id);
                      return (
                        <label 
                          key={emp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            backgroundColor: isChecked ? '#f0fdfa' : 'transparent',
                            transition: 'background-color 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedBroadcastEmps(prev => 
                                prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                              );
                            }}
                            style={{ width: '16px', height: '16px', accentColor: '#1a8d9b', cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: isChecked ? '#126a75' : '#334155' }}>{emp.name}</span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>رقم وظيفي: {emp.id} | هاتف: {emp.phone}</span>
                          </div>
                        </label>
                      );
                    })}
                    {filteredEmployeesForSelection.length === 0 && (
                      <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
                        لا توجد نتائج مطابقة للبحث
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message text area */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>نص الرسالة</label>
                <textarea
                  rows={5}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="اكتب نص التعميم هنا... يمكنك استخدام الرموز التعبيرية والخطوط العريضة مثل *نص عريض*"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    padding: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'Tajawal, sans-serif'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleSendBroadcast}
                  disabled={isSendingBroadcast || !broadcastMessage.trim()}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#1a8d9b',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (isSendingBroadcast || !broadcastMessage.trim()) ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(26, 141, 155, 0.2)'
                  }}
                >
                  {isSendingBroadcast ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> جاري الجدولة...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> جدولة إرسال التعميم
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastMessage('');
                    setBroadcastTarget('all');
                    setSelectedBroadcastDepts([]);
                    setSelectedBroadcastEmps([]);
                    setBroadcastExclusions([]);
                    setIsExcluding(false);
                    setEmpSearchQuery('');
                  }}
                  style={{
                    padding: '0 20px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WhatsAppSettingsTab;
