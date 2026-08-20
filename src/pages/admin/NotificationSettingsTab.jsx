import React, { useState, useEffect } from 'react';
import { Bell, Save, ShieldAlert, Clock, Calendar, CheckSquare, Briefcase, Info, Truck, Package, ShoppingCart, Factory, ListTodo, Users, Settings, UserMinus } from 'lucide-react';
import Swal from 'sweetalert2';
import { getGlobalSettings, saveGlobalSettings, getUserNotificationRole } from '../../store';

const CustomUserMinusIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="10" cy="7.5" r="4.5" stroke="#e11d48" strokeWidth="2"/>
    <path d="M3 20v-1.5c0-2.8 2.2-5 5-5h4c1.2 0 2.3.4 3.1 1.1" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 20h9.5" stroke="#e11d48" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 15.5h5" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const NotificationSettingsTab = ({ settings, setSettings, employees = [] }) => {
  const DEFAULT_NOTIFICATIONS = {
    leaves: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'الإجازات' },
    advances: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'السلف' },
    earlyLeave: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'المغادرات' },
    overtime: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'العمل الإضافي' },
    dailyReport: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'تقرير العمل اليومي' },
    missingPunch: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'الختمة الناقصة' },
    delivery: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'التوصيل' },
    inventory: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'سند الادخال والاخراج بالمخزون' },
    orders: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'الطلبيات' },
    production: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'الإنتاج' },
    tasks: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'إدارة المهام' },
    supervisorsReport: { employee: true, supervisor: true, management: true, whatsapp: false, supervisorExceptions: [], title: 'تقرير المشرفين' }
  };

  const notificationsSettings = {};
  Object.keys(DEFAULT_NOTIFICATIONS).forEach(key => {
    notificationsSettings[key] = {
      ...DEFAULT_NOTIFICATIONS[key],
      ...(settings.notifications?.[key] || {})
    };
  });

  const handleToggle = (module, field) => {
    setSettings(prev => {
      const currentNotifications = prev.notifications || {};
      const targetModule = currentNotifications[module] || notificationsSettings[module];
      return {
        ...prev,
        notifications: {
          ...currentNotifications,
          [module]: {
            ...targetModule,
            [field]: !targetModule[field]
          }
        }
      };
    });
  };

  const openExceptionsModal = (moduleKey) => {
    const currentModuleSettings = settings.notifications?.[moduleKey] || notificationsSettings[moduleKey];
    const currentExceptions = currentModuleSettings.supervisorExceptions || [];
    const exceptionCandidates = employees.filter(emp => getUserNotificationRole(emp, settings) === 'supervisor');
    
    let htmlContent = '<div class="text-right space-y-3" style="max-height: 300px; overflow-y: auto; padding: 10px;">';
    if (exceptionCandidates.length === 0) {
      htmlContent += '<p class="text-slate-500">لا يوجد موظفين مسجلين في النظام.</p>';
    } else {
      exceptionCandidates.forEach(emp => {
        const isChecked = currentExceptions.includes(emp.id);
        htmlContent += `
          <label class="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
            <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary emp-checkbox" value="${emp.id}" ${isChecked ? 'checked' : ''} />
            <span class="text-slate-700 font-medium">${emp.name} <span class="text-xs text-slate-400">(${emp.level || emp.role || 'غير محدد'})</span></span>
          </label>
        `;
      });
    }
    htmlContent += '</div>';

    Swal.fire({
      title: `استثناء مشرفين من الإشعارات`,
      html: `
        <p class="text-sm text-slate-500 mb-4 text-right">لن يتم إرسال إشعارات (${currentModuleSettings.title}) للمشرفين المحددين في القائمة التالية:</p>
        ${htmlContent}
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الاستثناءات',
      cancelButtonText: 'إلغاء',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        htmlContainer: 'text-right'
      },
      preConfirm: () => {
        const checkboxes = document.querySelectorAll('.emp-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setSettings(prev => {
          const currentNotifications = prev.notifications || notificationsSettings;
          return {
            ...prev,
            notifications: {
              ...currentNotifications,
              [moduleKey]: {
                ...(currentNotifications[moduleKey] || notificationsSettings[moduleKey]),
                supervisorExceptions: result.value
              }
            }
          };
        });
        Swal.fire({
          title: 'تم الحفظ',
          text: 'تم تحديث الأقسام المستثناة بنجاح.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
             popup: 'premium-modal-popup'
          }
        });
      }
    });
  };

  const modules = [
    { key: 'leaves', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { key: 'advances', icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-50' },
    { key: 'earlyLeave', icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50' },
    { key: 'overtime', icon: ShieldAlert, color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'dailyReport', icon: CheckSquare, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { key: 'missingPunch', icon: Info, color: 'text-rose-600', bg: 'bg-rose-50' },
    { key: 'delivery', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-50' },
    { key: 'inventory', icon: Package, color: 'text-teal-500', bg: 'bg-teal-50' },
    { key: 'orders', icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-50' },
    { key: 'production', icon: Factory, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { key: 'tasks', icon: ListTodo, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
    { key: 'supervisorsReport', icon: Users, color: 'text-sky-500', bg: 'bg-sky-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="text-primary" /> إعدادات الإشعارات والتنبيهات
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            تحكم في من يتلقى الإشعارات لكل نوع من أنواع الطلبات والأحداث في النظام.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto overflow-visible">
          <table className="w-full text-right">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 w-1/4">نوع الطلب / الحدث</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">إشعار الموظف</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">إشعار المشرف</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-700 text-center">إشعار الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map(({ key, icon: Icon, color, bg }) => {
                const modSettings = notificationsSettings[key];
                const hasExceptions = modSettings.supervisorExceptions && modSettings.supervisorExceptions.length > 0;
                
                return (
                  <tr key={key} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-105 transition-transform`}>
                          <Icon size={20} strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-slate-800 text-base">{modSettings.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={modSettings.employee || false} onChange={() => handleToggle(key, 'employee')} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={modSettings.supervisor || false} onChange={() => handleToggle(key, 'supervisor')} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <div 
                          onClick={() => openExceptionsModal(key)}
                          className="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
                          title="إدارة الاستثناءات"
                          style={{ border: 'none', background: 'transparent', margin: 0, padding: 0 }}
                        >
                          <CustomUserMinusIcon size={24} />
                          {hasExceptions && (
                            <span className="text-xs font-bold text-rose-600">
                              {modSettings.supervisorExceptions.length} مستثنى
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={modSettings.management || false} onChange={() => handleToggle(key, 'management')} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsTab;
