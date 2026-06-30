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
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(permission => {
      setPermissionStatus(permission);
    });
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
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
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
              {permissionStatus === 'default' && (
                <button 
                  onClick={requestPermission}
                  className="text-xs font-bold text-primary mt-2 flex items-center gap-1 bg-primary-light px-2 py-1 rounded"
                >
                   تفعيل إشعارات النظام على الهاتف
                </button>
              )}
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
