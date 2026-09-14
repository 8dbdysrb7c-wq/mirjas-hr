import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Check, Send, UserRound, Users, X } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  canSendSpecialNotification,
  createNotification,
  getEmployees,
  getGlobalSettings,
  getNotificationRoleOptions,
  getNotificationsForUser,
  watchNotificationsForUser,
  markNotificationAsRead
} from '../store';

const formatNotificationDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

let audioContextInstance = null;

const getAudioContext = () => {
  if (audioContextInstance) return audioContextInstance;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContextInstance = new AudioContextClass();
  return audioContextInstance;
};

// Function to unlock audio on first interaction
const unlockAudio = () => {
  const context = getAudioContext();
  if (context && context.state === 'suspended') {
    context.resume().then(() => {
      console.log('AudioContext resumed successfully');
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    });
  }
};
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

const playNotificationSound = () => {
  const context = getAudioContext();
  if (!context) return;

  // Make sure it's resumed
  if (context.state === 'suspended') {
    context.resume();
  }

  const playBeep = (freq, startTime, duration) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, startTime);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    gainNode.gain.setValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // Double beep for better attention
  const now = context.currentTime;
  playBeep(880, now, 0.1);
  playBeep(1046.5, now + 0.15, 0.2);
};

const showBrowserNotification = (title, message) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body: message,
        icon: '/logo-mrsleep.png',
        tag: 'mrsleep-notification',
        renotify: true
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (e) {
      // Fallback for some mobile browsers that require service worker for notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: message,
            icon: '/logo-mrsleep.png',
            tag: 'mrsleep-notification',
            renotify: true
          });
        });
      }
    }
  }
};

const NOTIFICATION_TAB_MAP = {
  reports: 'reports',
  sales: 'sales',
  production: 'production-orders',
  delivery: 'delivery',
  stock: 'stock',
  customers: 'customers',
  employees: 'employees',
  announcements: 'overview',
  general: 'overview'
};

const parseOrderNumberFromText = (text) => String(text || '').match(/رقم[:#\s]*([0-9]+)/)?.[1] || '';
const parseReportDateFromText = (text) => String(text || '').match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
const parseReportUserNameFromText = (text) => String(text || '').match(/للموظف\s+(.+?)\s+بتاريخ/)?.[1]?.trim() || '';

const resolveNotificationTarget = (notification) => {
  const baseTarget = notification.target || {};
  const moduleKey = baseTarget.moduleKey || notification.moduleKey || 'general';
  const sourceText = `${notification.title || ''} ${notification.message || ''}`.trim();
  const target = {
    ...baseTarget,
    moduleKey,
    tab: baseTarget.tab || NOTIFICATION_TAB_MAP[moduleKey] || 'overview'
  };

  if ((moduleKey === 'sales' || moduleKey === 'production') && !target.orderNumber) {
    target.orderNumber = parseOrderNumberFromText(sourceText);
  }

  if (moduleKey === 'reports') {
    if (!target.reportDate) target.reportDate = parseReportDateFromText(sourceText);
    if (!target.reportUserName) target.reportUserName = parseReportUserNameFromText(sourceText);
  }

  return target;
};

const NotificationCenter = ({ user, onNavigate }) => {
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState('');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const unreadCountRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all',
    roleKeys: ['production'],
    userIds: []
  });

  const roleOptions = useMemo(() => getNotificationRoleOptions(), []);
  const canComposeAnnouncements = useMemo(
    () => canSendSpecialNotification(user, settings),
    [settings, user]
  );
  const hideReadNotifications = settings?.notificationSettings?.hideReadNotifications ?? true;

  const requestPermission = () => {
    if (!("Notification" in window)) {
      Swal.fire('غير مدعوم', 'هذا المتصفح لا يدعم إشعارات النظام.', 'info');
      return;
    }
    Notification.requestPermission().then(permission => {
      setPermissionStatus(permission);
      if (permission === 'granted') {
        Swal.fire('تم التفعيل', 'تم السماح بإشعارات النظام بنجاح! يمكنك الآن تجربة الإشعار الخارجي.', 'success');
      }
    });
  };

  const triggerTestNotification = async () => {
    if (!("Notification" in window)) {
      return Swal.fire('غير مدعوم', 'هذا المتصفح لا يدعم إشعارات النظام المباشرة.', 'info');
    }

    let currentPerm = Notification.permission;
    if (currentPerm !== 'granted') {
      currentPerm = await Notification.requestPermission();
      setPermissionStatus(currentPerm);
    }

    if (currentPerm !== 'granted') {
      return Swal.fire('الإذن غير مفعّل', 'يرجى السماح بالإشعارات من إعدادات المتصفح على هاتفك لتلقي الإشعارات.', 'warning');
    }

    const result = await Swal.fire({
      title: 'تجربة إشعار الهاتف الخارجي 🔔',
      html: `
        <div style="direction: rtl; text-align: right; line-height: 1.8; font-size: 14px;">
          <p>سيتم إرسال إشعار تجريبي بعد <strong>5 ثوانٍ</strong>.</p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px; margin-top: 10px; color: #1e40af; font-weight: bold;">
            📱 الخطوة الآن: بعد الضغط على زر البدء، قم فوراً بـ <u>تصغير المتصفح</u> أو <u>الخروج للشاشة الرئيسية</u> أو <u>قفل شاشة هاتفك</u> لتشاهد الإشعار يظهر كنافذة خارجية في شريط الإشعارات!
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'ابدأ العد (5 ثوانٍ)',
      cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      title: 'بدأ العد التنازلي...',
      html: '<p style="font-size: 15px; color: #e11d48; font-weight: bold;">اخرج من المتصفح أو أقفل شاشة الهاتف الآن!</p>',
      timer: 5000,
      timerProgressBar: true,
      showConfirmButton: false,
      allowOutsideClick: true
    });

    setTimeout(async () => {
      try {
        playNotificationSound();
      } catch (e) {}

      const title = 'نظام ميرجاس للموارد البشرية 🔔';
      const options = {
        body: 'تجربة ناجحة! هذا إشعار خارجي يظهر على شاشة هاتفك دون الحاجة لفتح التطبيق.',
        icon: '/icon-mrsleep.png',
        badge: '/icon-mrsleep.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'mirjas-test-alert',
        renotify: true,
        data: '/'
      };

      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, options);
            return;
          }
        }
        new Notification(title, options);
      } catch (e) {
        console.warn('Notification trigger fallback', e);
        try {
          new Notification(title, options);
        } catch (err) {}
      }
    }, 5000);
  };

  const loadNotifications = async () => {
    const globalSettings = await getGlobalSettings();
    const data = await getNotificationsForUser(user, globalSettings);

    setSettings(globalSettings);
    setNotifications(data);

    if (canSendSpecialNotification(user, globalSettings)) {
      const employeeList = await getEmployees();
      setEmployees(employeeList);
    } else {
      setEmployees([]);
    }

    return data;
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe;
    const connect = async () => {
      const globalSettings = await getGlobalSettings();
      if (cancelled) return;
      setSettings(globalSettings);
      unsubscribe = watchNotificationsForUser(user, globalSettings, setNotifications, console.error);
      const employeeList = canSendSpecialNotification(user, globalSettings) ? await getEmployees() : [];
      if (!cancelled) setEmployees(employeeList);
    };
    connect().catch(console.error);
    return () => { cancelled = true; unsubscribe?.(); };
  }, [user.id]);

  const unreadNotifications = notifications.filter(
    (notification) => !notification.readBy?.[user.id]
  );

  useEffect(() => {
    const unreadCount = unreadNotifications.length;
    const previousUnreadCount = unreadCountRef.current;

    if (
      previousUnreadCount !== null &&
      unreadCount > previousUnreadCount
    ) {
      // Internal Sound
      if (settings?.notificationSettings?.soundEnabled) {
        playNotificationSound();
      }
      
      // Browser Notification
      const latest = unreadNotifications[0];
      if (latest) {
        showBrowserNotification(latest.title, latest.message);
      }
    }

    unreadCountRef.current = unreadCount;
  }, [unreadNotifications.length, settings?.notificationSettings?.soundEnabled]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsComposerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || window.innerWidth > 768) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleToggle = async () => {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);

    if (!nextOpenState) {
      setIsComposerOpen(false);
      return;
    }

    await loadNotifications();
  };

  const updateFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleRoleSelection = (roleKey) => {
    setFormData((current) => ({
      ...current,
      roleKeys: current.roleKeys.includes(roleKey)
        ? current.roleKeys.filter((role) => role !== roleKey)
        : [...current.roleKeys, roleKey]
    }));
  };

  const toggleUserSelection = (userId) => {
    setFormData((current) => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter((id) => id !== userId)
        : [...current.userIds, userId]
    }));
  };

  const resetComposer = () => {
    setFormData({
      title: '',
      message: '',
      targetType: 'all',
      roleKeys: ['production'],
      userIds: []
    });
  };

  const handleSubmitAnnouncement = async (event) => {
    event.preventDefault();

    const trimmedTitle = formData.title.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedTitle || !trimmedMessage) {
      Swal.fire('خطأ', 'يرجى كتابة عنوان ومحتوى الإشعار', 'error');
      return;
    }

    if (formData.targetType === 'roles' && !formData.roleKeys.length) {
      Swal.fire('خطأ', 'يرجى اختيار دور واحد على الأقل', 'error');
      return;
    }

    if (formData.targetType === 'users' && !formData.userIds.length) {
      Swal.fire('خطأ', 'يرجى اختيار مستخدم واحد على الأقل', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await createNotification({
        category: 'announcement',
        moduleKey: 'announcements',
        moduleLabel: 'الإشعارات الخاصة',
        title: trimmedTitle,
        message: trimmedMessage,
        visibleToAll: formData.targetType === 'all',
        visibleRoles: formData.targetType === 'roles' ? formData.roleKeys : [],
        visibleUserIds: formData.targetType === 'users' ? formData.userIds : [],
        createdById: user.id,
        createdByName: user.name,
        createdByRole: user.level || user.role || ''
      });

      resetComposer();
      setIsComposerOpen(false);
      await loadNotifications();

      Swal.fire({
        title: 'تم الإرسال',
        text: 'تم حفظ الإشعار الخاص بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    setMarkingNotificationId(notificationId);

    try {
      await markNotificationAsRead(notificationId, user.id);

      setNotifications((current) => {
        if (hideReadNotifications) {
          return current.filter((notification) => notification.id !== notificationId);
        }

        return current.map((notification) => (
          notification.id === notificationId
            ? {
                ...notification,
                readBy: {
                  ...(notification.readBy || {}),
                  [user.id]: new Date().toISOString()
                }
              }
            : notification
        ));
      });
    } finally {
      setMarkingNotificationId('');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!unreadNotifications.length || isMarkingAllRead) return;

    setIsMarkingAllRead(true);

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          markNotificationAsRead(notification.id, user.id)
        )
      );

      setNotifications((current) => {
        if (hideReadNotifications) {
          const unreadIds = new Set(unreadNotifications.map((notification) => notification.id));
          return current.filter((notification) => !unreadIds.has(notification.id));
        }

        const readAt = new Date().toISOString();
        const unreadIds = new Set(unreadNotifications.map((notification) => notification.id));

        return current.map((notification) => (
          unreadIds.has(notification.id)
            ? {
                ...notification,
                readBy: {
                  ...(notification.readBy || {}),
                  [user.id]: readAt
                }
              }
            : notification
        ));
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleNotificationOpen = (notification) => {
    if (!onNavigate) return;
    onNavigate(resolveNotificationTarget(notification), notification);
    setIsOpen(false);
    setIsComposerOpen(false);
  };

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        type="button"
        className={`header-icon-button ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label="الإشعارات"
      >
        {unreadNotifications.length > 0 ? <BellRing size={19} /> : <Bell size={19} />}
        {unreadNotifications.length > 0 && (
          <span className="header-icon-badge">{unreadNotifications.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel animate-fade-in">
          <div className="notification-panel-header">
            <div>
              <h3>الإشعارات</h3>
              <p>تابع آخر الإضافات والرسائل التي وصلتك حسب الصلاحية.</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {permissionStatus !== 'granted' ? (
                  <button 
                    type="button"
                    onClick={requestPermission}
                    className="text-xs font-bold text-primary flex items-center gap-1 bg-primary-light px-2.5 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/10 transition"
                  >
                     <BellRing size={14} /> تفعيل إشعارات الهاتف
                  </button>
                ) : null}

                <button 
                  type="button"
                  onClick={triggerTestNotification}
                  style={{
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  title="تجربة إشعار خارجي يظهر على شاشة هاتفك بعد 5 ثوانٍ"
                >
                  <BellRing size={14} style={{ color: '#16a34a' }} />
                  تجربة إشعار الهاتف الخارجي (بعد 5 ثوانٍ)
                </button>
              </div>
            </div>
            <button
              type="button"
              className="profile-modal-close"
              onClick={() => {
                setIsOpen(false);
                setIsComposerOpen(false);
              }}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {(canComposeAnnouncements || unreadNotifications.length > 0) && (
            <div className="notification-toolbar">
              {canComposeAnnouncements && (
                <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsComposerOpen((current) => !current)}
              >
                <Send size={16} />
                {isComposerOpen ? 'إخفاء الإرسال' : 'إشعار خاص'}
                </button>
              )}
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <Check size={16} />
                  {isMarkingAllRead ? 'جاري القراءة...' : 'قراءة الكل'}
                </button>
              )}
            </div>
          )}

          {isComposerOpen && canComposeAnnouncements && (
            <form className="notification-composer" onSubmit={handleSubmitAnnouncement}>
              <div className="input-group">
                <label>عنوان الإشعار</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.title}
                  onChange={(event) => updateFormField('title', event.target.value)}
                  placeholder="مثال: تحديث مهم على الطلبات"
                />
              </div>

              <div className="input-group">
                <label>محتوى الإشعار</label>
                <textarea
                  className="input-field notification-textarea"
                  value={formData.message}
                  onChange={(event) => updateFormField('message', event.target.value)}
                  placeholder="اكتب الإشعار الذي تريد إرساله"
                />
              </div>

              <div className="input-group">
                <label>يوصل إلى</label>
                <div className="notification-target-tabs">
                  <button
                    type="button"
                    className={`notification-target-chip ${formData.targetType === 'all' ? 'active' : ''}`}
                    onClick={() => updateFormField('targetType', 'all')}
                  >
                    <Users size={14} />
                    الجميع
                  </button>
                  <button
                    type="button"
                    className={`notification-target-chip ${formData.targetType === 'roles' ? 'active' : ''}`}
                    onClick={() => updateFormField('targetType', 'roles')}
                  >
                    <Users size={14} />
                    حسب الدور
                  </button>
                  <button
                    type="button"
                    className={`notification-target-chip ${formData.targetType === 'users' ? 'active' : ''}`}
                    onClick={() => updateFormField('targetType', 'users')}
                  >
                    <UserRound size={14} />
                    مستخدمون محددون
                  </button>
                </div>
              </div>

              {formData.targetType === 'roles' && (
                <div className="notification-selection-grid">
                  {roleOptions.map((role) => (
                    <label key={role.key} className="premium-checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.roleKeys.includes(role.key)}
                        onChange={() => toggleRoleSelection(role.key)}
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {formData.targetType === 'users' && (
                <div className="notification-selection-grid notification-users-grid">
                  {employees.map((employee) => (
                    <label key={employee.id} className="premium-checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.userIds.includes(employee.id)}
                        onChange={() => toggleUserSelection(employee.id)}
                      />
                      <span>{employee.name}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="profile-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Send size={16} />
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setIsComposerOpen(false);
                    resetComposer();
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <Bell size={28} />
                <p>لا توجد إشعارات حالياً.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isRead = Boolean(notification.readBy?.[user.id]);

                return (
                  <div
                    key={notification.id}
                    className={`notification-card ${isRead ? '' : 'unread'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationOpen(notification)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleNotificationOpen(notification);
                      }
                    }}
                  >
                    <div className="notification-card-top">
                      <div>
                        <h4>{notification.title}</h4>
                        <span className="notification-category-badge">
                          {notification.category === 'announcement' ? 'إشعار خاص' : 'إشعار جديد'}
                        </span>
                      </div>
                      <span className="notification-date">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </div>

                    <p className="notification-message">{notification.message}</p>

                    <div className="notification-meta">
                      <span>{notification.moduleLabel || 'النظام'}</span>
                      <span>من: {notification.createdByName || 'النظام'}</span>
                    </div>

                    <div className="notification-actions">
                      {!isRead ? (
                        <button
                          type="button"
                          className="btn btn-outline notification-read-button"
                          disabled={markingNotificationId === notification.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <Check size={14} />
                          {markingNotificationId === notification.id ? 'جاري الحفظ...' : 'تمت القراءة'}
                        </button>
                      ) : !hideReadNotifications ? (
                        <span className="notification-read-status">تمت القراءة</span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
