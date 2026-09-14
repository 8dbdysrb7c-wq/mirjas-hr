import React, { useState, useRef } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { exportDatabase, importDatabase, resetCollection } from '../../services/data_management';
import { Trash2, ShoppingCart, Package, Truck, ArrowUpDown, Users, CheckSquare, ClipboardList, Users2, Clock, Wallet, CalendarOff, Award, ShieldAlert, FileKey, Calendar, Activity, MessageCircle } from 'lucide-react';
import './data-management.css';

const DataManagementTab = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      Swal.fire({
        title: 'جاري تجهيز النسخة الاحتياطية...',
        text: 'يرجى الانتظار، قد تستغرق العملية بعض الوقت حسب حجم البيانات.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const backupData = await exportDatabase();
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `mirjas_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Swal.fire('تم بنجاح', 'تم تصدير النسخة الاحتياطية بنجاح.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء تصدير البيانات.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    Swal.fire({
      title: 'تحذير هام جداً!',
      text: 'استرجاع النسخة الاحتياطية سيقوم بمسح كافة البيانات الحالية واستبدالها ببيانات الملف المرفق. لا يمكن التراجع عن هذه الخطوة!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'أوافق، اختر ملف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        fileInputRef.current.click();
      }
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      Swal.fire({
        title: 'تأكيد أخير',
        text: 'هل أنت متأكد تماماً من استرجاع هذا الملف؟ سيتم محو البيانات الحالية!',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، استرجع البيانات',
        cancelButtonText: 'تراجع'
      }).then(async (result) => {
        if (result.isConfirmed) {
          setIsImporting(true);
          Swal.fire({
            title: 'جاري استرجاع البيانات...',
            text: 'يرجى عدم إغلاق النافذة حتى تكتمل العملية.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
          });

          await importDatabase(backupData);

          Swal.fire({
            title: 'تم بنجاح',
            text: 'تم استرجاع النسخة الاحتياطية بنجاح! سيتم تحديث الصفحة لتطبيق التغييرات.',
            icon: 'success',
            allowOutsideClick: false,
            confirmButtonText: 'تحديث الصفحة'
          }).then(() => {
            window.location.reload();
          });
        }
      });
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'الملف غير صالح أو حدث خطأ أثناء قراءته.', 'error');
    } finally {
      event.target.value = null; // reset
      setIsImporting(false);
    }
  };

  const handleSafeReset = async (label, collections, description) => {
    Swal.fire({
      title: `تأكيد تصفير ${label}`,
      text: description || `هل أنت متأكد من مسح جميع بيانات ${label}؟ هذا الإجراء لا يمكن التراجع عنه!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، امسح البيانات',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'جاري مسح البيانات...',
          text: 'يرجى الانتظار...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          for (const col of collections) {
            await resetCollection(col);
          }
          Swal.fire('تم بنجاح', `تم تصفير ${label} بنجاح.`, 'success');
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', `حدث خطأ أثناء تصفير ${label}.`, 'error');
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-6 border-blue-200 border-2 bg-blue-50/30">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-800">
          <Database size={24} /> النسخ الاحتياطي واسترجاع البيانات
        </h3>
        <p className="mb-6 text-slate-600">
          يمكنك أخذ نسخة احتياطية شاملة لجميع بيانات النظام وحفظها في جهازك. كما يمكنك استرجاع هذه النسخة في أي وقت للرجوع إلى نفس الحالة.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Export Panel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Download size={32} />
            </div>
            <h4 className="font-bold text-lg mb-2">تصدير نسخة احتياطية</h4>
            <p className="text-sm text-slate-500 mb-6">يقوم بحفظ جميع الأقسام (الطلبيات، الموارد البشرية، المخزون، الإعدادات) في ملف JSON موحد يحمل تاريخ اليوم.</p>
            <button 
              className="btn btn-primary w-full max-w-xs flex items-center justify-center gap-2"
              onClick={handleExport}
              disabled={isExporting || isImporting}
            >
              {isExporting ? <span className="animate-spin">⌛</span> : <Download size={18} />}
              {isExporting ? 'جاري التصدير...' : 'تصدير الآن'}
            </button>
          </div>

          {/* Import Panel */}
          <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <Upload size={32} />
            </div>
            <h4 className="font-bold text-lg mb-2 text-rose-800">استرجاع نسخة احتياطية</h4>
            <p className="text-sm text-slate-500 mb-6">يقوم بمسح قاعدة البيانات الحالية واستبدالها كلياً ببيانات الملف المرفق. تأكد من أن الملف سليم وموثوق.</p>
            
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            
            <button 
              className="btn flex items-center justify-center gap-2 w-full max-w-xs"
              style={{ backgroundColor: '#e11d48', color: 'white' }}
              onClick={handleImportClick}
              disabled={isExporting || isImporting}
            >
              {isImporting ? <span className="animate-spin">⌛</span> : <Upload size={18} />}
              {isImporting ? 'جاري الاسترجاع...' : 'استرجاع ملف Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Safe Reset Section */}
      <div className="glass-panel p-6 border-rose-200 border-2 bg-rose-50/30 mt-12">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-800">
          <Trash2 size={24} /> التصفير الآمن للبيانات
        </h3>
        <p className="mb-8 text-slate-600">
          يمكنك تصفير ومسح بيانات كل قسم على حدة. سيتم مسح السجلات وإعادة الترقيم من البداية. يرجى أخذ نسخة احتياطية قبل القيام بهذه الخطوة!
        </p>

        <div className="data-reset-grid">
          <button 
            onClick={() => handleSafeReset('الطلبيات', ['sales_orders'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#4f46e5', color: 'white', border: '1px solid #3730a3' }}
          >
            <ShoppingCart size={14} /> تصفير الطلبيات
          </button>

          <button 
            onClick={() => handleSafeReset('الإنتاج', ['orders', 'production_logs', 'productionBatches', 'productionTasks'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#10b981', color: 'white', border: '1px solid #047857' }}
          >
            <Package size={14} /> تصفير الإنتاج
          </button>

          <button
            onClick={() => handleSafeReset('إنتاج قيد التحضير', ['preparation_orders'], 'سيتم حذف جميع أوامر إنتاج قيد التحضير وإعادة ترقيم الأوامر الجديدة من البداية. ستبقى أرصدة المخزون وسنداته وأوامر الخياطة كما هي. خذ نسخة احتياطية قبل المتابعة؛ لا يمكن التراجع عن الحذف.')}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3"
            style={{ backgroundColor: '#0d9488', color: 'white', border: '1px solid #0f766e' }}
          >
            <Package size={14} /> تصفير إنتاج قيد التحضير
          </button>

          <button 
            onClick={() => handleSafeReset('التوصيل', ['deliveryTrips', 'deliveryManifests', 'missions'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#f59e0b', color: 'white', border: '1px solid #b45309' }}
          >
            <Truck size={14} /> تصفير التوصيل
          </button>

          <button 
            onClick={() => handleSafeReset('حركات وسندات المخزون', ['stock_vouchers'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#e11d48', color: 'white', border: '1px solid #be123c' }}
          >
            <ArrowUpDown size={14} /> تصفير حركات المخزون
          </button>

          <button 
            onClick={() => handleSafeReset('تقارير المشرفين', ['supervisor_reports', 'reports', 'operations_log', 'smoking_logs', 'attendance_logs'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#0ea5e9', color: 'white', border: '1px solid #0369a1' }}
          >
            <ClipboardList size={14} /> تقارير المشرفين
          </button>

          <button 
            onClick={() => handleSafeReset('المهام', ['supervisor_tasks'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#d946ef', color: 'white', border: '1px solid #a21caf' }}
          >
            <CheckSquare size={14} /> إدارة المهام
          </button>

          <button 
            onClick={() => handleSafeReset('العملاء والموردين', ['customers'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#14b8a6', color: 'white', border: '1px solid #0f766e' }}
          >
            <Users size={14} /> العملاء والموردين
          </button>

          <button 
            onClick={() => handleSafeReset('سجل النظام (العمليات)', ['operations_log'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#334155', color: 'white', border: '1px solid #1e293b' }}
          >
            <Activity size={14} /> سجل النظام
          </button>

          <button 
            onClick={() => handleSafeReset('سجل إشعارات الواتساب', ['whatsapp_queue', 'whatsapp_queue_v2'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#22c55e', color: 'white', border: '1px solid #16a34a' }}
          >
            <MessageCircle size={14} /> سجل إشعارات الواتساب
          </button>
        </div>
      </div>

      {/* HR Safe Reset Section */}
      <div className="glass-panel p-6 border-violet-200 border-2 bg-violet-50/30 mt-12 mb-12">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-violet-800">
          <Users2 size={24} /> تصفير سجلات الموارد البشرية (آمن)
        </h3>
        <p className="mb-8 text-slate-600">
          يمكنك مسح وتصفير سجلات الحركات الخاصة بالموظفين كل قسم على حدة.
          <strong className="text-violet-700 block mt-2 text-sm bg-violet-100 p-2 rounded-lg border border-violet-200">
            ملاحظة هامة: هذا الإجراء آمن 100% ولن يمسح ملفات الموظفين، رواتبهم الأساسية، إعداداتهم، أو إعدادات النظام أبداً!
          </strong>
        </p>

        <div className="data-reset-grid">
          <button 
            onClick={() => handleSafeReset('الحضور والانصراف', ['hr_attendance', 'missing_punches'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Clock size={14} /> الحضور والانصراف
          </button>

          <button 
            onClick={() => handleSafeReset('تقارير الموظفين', ['employee_daily_reports', 'reports'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Users size={14} /> تقارير الموظفين
          </button>

          <button 
            onClick={() => handleSafeReset('العمل الإضافي', ['hr_overtime'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Clock size={14} /> العمل الإضافي
          </button>

          <button 
            onClick={() => handleSafeReset('السلف', ['hr_advances'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Wallet size={14} /> السلف
          </button>

          <button 
            onClick={() => handleSafeReset('الإجازات', ['hr_leaves'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <CalendarOff size={14} /> الإجازات
          </button>

          <button 
            onClick={() => handleSafeReset('المكافآت والمخالفات', ['hr_bonuses', 'hr_violations'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Award size={14} /> المكافآت والمخالفات
          </button>

          <button 
            onClick={() => handleSafeReset('العهد', ['hr_assets'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <FileKey size={14} /> العهد
          </button>

          <button 
            onClick={() => handleSafeReset('العطل الرسمية', ['hr_holidays'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <Calendar size={14} /> العطل الرسمية
          </button>

          <button 
            onClick={() => handleSafeReset('الرواتب وأرشيفها', ['hr_salary_periods', 'hr_salary_archives'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <ShieldAlert size={14} /> الرواتب وأرشيفها
          </button>

          <button 
            onClick={() => handleSafeReset('سجلات التدقيق', ['hr_audit_logs'])}
            className="btn flex items-center justify-center gap-2 text-xs py-2 px-3 flex-grow md:flex-grow-0"
            style={{ backgroundColor: '#8b5cf6', color: 'white', border: '1px solid #5b21b6' }}
          >
            <ClipboardList size={14} /> سجلات التدقيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagementTab;
