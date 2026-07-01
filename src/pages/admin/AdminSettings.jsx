import React, { useState, useEffect } from 'react';
import { canPerformAction, getGlobalSettings, saveGlobalSettings, getEmployees, saveEmployee, getNotificationRoleOptions, normalizeNotificationSettings } from '../../store';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

import { Settings, Globe, MessageSquare, Image as ImageIcon, CheckCircle, ListTodo, Users, Plus, Trash2, Save, Upload, Edit2, Package, Home, Palette, Ruler, Truck, CheckCircle2, Bell, ChevronDown, ChevronUp, Volume2, VolumeX, Briefcase, Building, Clock, Fingerprint, ArrowUpDown, Calendar, PlusCircle, MinusCircle, Shield, RotateCcw, DollarSign, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import WhatsAppSettingsTab from './WhatsAppSettingsTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import DataManagementTab from './DataManagementTab';
import HRHolidays from '../hr/HRHolidays';

function MapUpdater({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

function LocationPicker({ lat, lng, radius, onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat && lng ? (
    <>
      <Marker position={[lat, lng]} />
      {radius > 0 && <Circle center={[lat, lng]} radius={radius} pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2, weight: 2 }} />}
      <MapUpdater lat={lat} lng={lng} />
    </>
  ) : null;
}


const SHOW_OLD_NOTIFICATIONS = false;

const ALL_LEAVE_TYPES = [
  'إجازة سنوية',
  'إجازة مرضية',
  'مغادرة خاصة',
  'مغادرة عمل',
  'إذن تأخير',
  'خروج مبكر',
  'إجازة غير مدفوعة',
  'بدل عمل إضافي'
];

const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const DEFAULT_CALENDAR_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];


const AdminSettings = ({ user }) => {
  const [activeTab, setActiveTab] = useState('site');

  const [newLocation, setNewLocation] = useState({ name: '', lat: 31.9539, lng: 35.9106, radius: 20 });
  const [editingLocIndex, setEditingLocIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  
  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const bestMatch = data[0];
        setNewLocation({
          ...newLocation,
          lat: parseFloat(bestMatch.lat),
          lng: parseFloat(bestMatch.lon),
          name: newLocation.name || bestMatch.display_name.split(',')[0]
        });
        Swal.fire({ title: 'تم العثور على الموقع', text: bestMatch.display_name, icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire('عذراً', 'لم يتم العثور على نتائج مطابقة للبحث', 'warning');
      }
    } catch (error) {
      Swal.fire('خطأ', 'حدث خطأ أثناء البحث عن الموقع', 'error');
    }
    setIsSearching(false);
  };

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      Swal.fire('خطأ', 'يرجى إدخال اسم الموقع وإحداثياته', 'error');
      return;
    }
    const currentLocs = settings.workLocations || [];
    if (editingLocIndex >= 0) {
      const updated = [...currentLocs];
      updated[editingLocIndex] = newLocation;
      setSettings({ ...settings, workLocations: updated });
      setEditingLocIndex(-1);
    } else {
      setSettings({ ...settings, workLocations: [...currentLocs, { ...newLocation, id: Date.now().toString() }] });
    }
    setNewLocation({ name: '', lat: 31.9539, lng: 35.9106, radius: 20 });
  };

  const handleEditLocation = (index) => {
    setNewLocation(settings.workLocations[index]);
    setEditingLocIndex(index);
  };

  const handleDeleteLocation = (index) => {
    const updated = [...(settings.workLocations || [])];
    updated.splice(index, 1);
    setSettings({ ...settings, workLocations: updated });
  };

  const [mpSortConfig, setMpSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [lpSortConfig, setLpSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [settings, setSettings] = useState({
    siteName: '',
    logoUrl: '',
    itemStatuses: [],
    salesStatuses: [],
    productionStatuses: [],
    userTypes: [],
    jobTitles: [],
    departmentsList: [],
    workShifts: [],
    primaryColor: '#1a8d9b',
    hrSettings: {
      standardWorkHours: 8,
      gracePeriodMinutes: 15,
      workDaysPerMonth: 30,
      overtimeMultiplier: 1.5,
      fullDayAbsenceDeduction: true
    },
    notificationSettings: normalizeNotificationSettings({})
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModuleKey, setExpandedModuleKey] = useState('announcements');
  const roleOptions = getNotificationRoleOptions();

  useEffect(() => {
    const fetchSettings = async () => {
      const [data, employeeList] = await Promise.all([
        getGlobalSettings(),
        getEmployees()
      ]);
      setSettings({
        ...data,
        hrSettings: data.hrSettings || {
          standardWorkHours: 8,
          gracePeriodMinutes: 15,
          workDaysPerMonth: 30,
          overtimeMultiplier: 1.5,
          fullDayAbsenceDeduction: true
        }
      });
      setEmployees(employeeList);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const notificationSettings = settings.notificationSettings || normalizeNotificationSettings(settings);

  const updateNotificationSettings = (updater) => {
    setSettings((current) => ({
      ...current,
      notificationSettings: typeof updater === 'function'
        ? updater(current.notificationSettings || normalizeNotificationSettings(current))
        : updater
    }));
  };

  const toggleNotificationSenderRole = (roleKey) => {
    updateNotificationSettings((current) => ({
      ...current,
      specialSenders: current.specialSenders.includes(roleKey)
        ? current.specialSenders.filter((item) => item !== roleKey)
        : [...current.specialSenders, roleKey]
    }));
  };

  const toggleNotificationSenderUser = (userId) => {
    updateNotificationSettings((current) => ({
      ...current,
      specialSenderUserIds: current.specialSenderUserIds.includes(userId)
        ? current.specialSenderUserIds.filter((item) => item !== userId)
        : [...current.specialSenderUserIds, userId]
    }));
  };

  const updateNotificationModuleRule = (moduleKey, updater) => {
    updateNotificationSettings((current) => ({
      ...current,
      moduleRules: current.moduleRules.map((rule) => (
        rule.moduleKey === moduleKey
          ? (typeof updater === 'function' ? updater(rule) : { ...rule, ...updater })
          : rule
      ))
    }));
  };

  const toggleNotificationModuleRole = (moduleKey, roleKey) => {
    updateNotificationModuleRule(moduleKey, (rule) => ({
      ...rule,
      visibleRoles: rule.visibleRoles.includes(roleKey)
        ? rule.visibleRoles.filter((item) => item !== roleKey)
        : [...rule.visibleRoles, roleKey]
    }));
  };

  const toggleNotificationModuleUser = (moduleKey, userId) => {
    updateNotificationModuleRule(moduleKey, (rule) => ({
      ...rule,
      visibleUserIds: rule.visibleUserIds.includes(userId)
        ? rule.visibleUserIds.filter((item) => item !== userId)
        : [...rule.visibleUserIds, userId]
    }));
  };

  const enabledModulesCount = notificationSettings.moduleRules.filter((rule) => rule.enabled).length;
  const selectedSenderRoles = roleOptions.filter((role) => notificationSettings.specialSenders.includes(role.key));
  const selectedSenderUsers = employees.filter((employee) => notificationSettings.specialSenderUserIds.includes(employee.id));

  const summarizeLabels = (labels, emptyLabel) => {
    if (!labels.length) return emptyLabel;
    if (labels.length <= 2) return labels.join('، ');
    return `${labels.slice(0, 2).join('، ')} +${labels.length - 2}`;
  };

  const getModuleAudienceSummary = (rule) => {
    const roleLabels = roleOptions
      .filter((role) => rule.visibleRoles.includes(role.key))
      .map((role) => role.label);
    const userLabels = employees
      .filter((employee) => rule.visibleUserIds.includes(employee.id))
      .map((employee) => employee.name);

    return {
      rolesText: summarizeLabels(roleLabels, 'لا توجد أدوار محددة'),
      usersText: summarizeLabels(userLabels, 'لا يوجد مستخدمون محددون')
    };
  };

  const handleSave = async () => {
    await saveGlobalSettings(settings);
    
    // Apply theme immediately
    if (settings.primaryColor) {
      const root = document.documentElement;
      root.style.setProperty('--primary', settings.primaryColor);
      
      const lightColor = `${settings.primaryColor}26`;
      root.style.setProperty('--primary-light', lightColor);
      
      const darkenColor = (hex, percent) => {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.floor(r * (1 - percent));
        g = Math.floor(g * (1 - percent));
        b = Math.floor(b * (1 - percent));
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      };
      root.style.setProperty('--primary-dark', darkenColor(settings.primaryColor, 0.2));
    }

    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      title: 'تم الحفظ',
      text: 'تم تحديث الإعدادات بنجاح.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
        Swal.fire('تنبيه', 'حجم الملف كبير جداً. يرجى استخدام صورة أقل من 500 كيلوبايت.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLpSort = (key) => {
    let direction = 'ascending';
    if (lpSortConfig.key === key && lpSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setLpSortConfig({ key, direction });
  };

  const getLpSortIcon = (key) => {
    if (lpSortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-50" />;
    return <ArrowUpDown size={14} className={`text-primary transform transition-transform ${lpSortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />;
  };

  const getLpSortedEmployees = () => {
    const sorted = [...employees];
    if (!lpSortConfig || !lpSortConfig.key) return sorted;
    
    sorted.sort((a, b) => {
      let aVal = a[lpSortConfig.key];
      let bVal = b[lpSortConfig.key];

      if (lpSortConfig.key === 'id') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
        if (aVal < bVal) return lpSortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return lpSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
      
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return lpSortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return lpSortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const handleMpSort = (key) => {
    let direction = 'ascending';
    if (mpSortConfig.key === key && mpSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setMpSortConfig({ key, direction });
  };

  const getMpSortIcon = (key) => {
    if (mpSortConfig.key !== key) return <ArrowUpDown size={14} className="text-muted opacity-50" />;
    return mpSortConfig.direction === 'ascending' 
      ? <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>↑</span>
      : <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>↓</span>;
  };

  const getSortedEmployees = () => {
    const sorted = [...employees].sort((a, b) => {
      let aVal = a[mpSortConfig.key] || '';
      let bVal = b[mpSortConfig.key] || '';

      if (mpSortConfig.key === 'id') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
        return mpSortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        if (aVal < bVal) return mpSortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return mpSortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
    });
    return sorted;
  };

  const toggleLeavePermission = async (empId, type) => {
    const newEmps = [...employees];
    const index = newEmps.findIndex(x => x.id === empId);
    if (index > -1) {
      const emp = newEmps[index];
      const _curr = emp.allowedLeaveTypes;
      const currentAllowed = Array.isArray(_curr) ? _curr : (typeof _curr === 'string' ? [_curr] : ALL_LEAVE_TYPES);
      let newAllowed;
      if (currentAllowed.includes(type)) {
        newAllowed = currentAllowed.filter(t => t !== type);
      } else {
        newAllowed = [...currentAllowed, type];
      }
      newEmps[index] = { ...emp, allowedLeaveTypes: newAllowed };
      setEmployees(newEmps);
      
      try {
        await saveEmployee(newEmps[index]);
      } catch(err) {
        console.error("Failed to save leave permission", err);
      }
    }
  };

  const addItem = (field) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title',
        input: 'premium-input'
      },
      buttonsStyling: false,
      title: 'إضافة جديد',
      input: 'text',
      inputPlaceholder: 'أدخل القيمة هنا...',
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        setSettings({
          ...settings,
          [field]: [...(settings[field] || []), result.value]
        });
      }
    });
  };

  const editItem = (field, index) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title',
        input: 'premium-input'
      },
      buttonsStyling: false,
      title: 'تعديل',
      input: 'text',
      inputValue: settings[field][index],
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newList = [...settings[field]];
        newList[index] = result.value;
        setSettings({ ...settings, [field]: newList });
      }
    });
  };

  const addUserType = () => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'إضافة نوع مستخدم جديد',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم النوع</label>
            <input id="swal-type-name" class="premium-input" placeholder="مثال: مشرف مبيعات">
          </div>
          <div class="input-group">
            <label>لون التمييز</label>
            <input id="swal-type-color" type="color" class="premium-input" style="height: 50px; padding: 5px; cursor: pointer;" value="${settings.primaryColor || '#1a8d9b'}">
          </div>
          
          <div class="input-group" style="margin-top: 5px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <label style="font-weight: bold; margin-bottom: 10px; display: block; color: var(--primary);">صلاحيات هذا الدور</label>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-add"> إضافة بيانات جديدة
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-edit"> تعديل البيانات
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-delete"> حذف البيانات
              </label>
              <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
              <label style="font-size: 0.9rem; font-weight: bold; color: var(--primary);">صلاحيات المخزون</label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-in"> إضافة سند إدخال
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-out"> إضافة سند إخراج
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-dmg"> إضافة سند إتلاف
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-audit"> تدقيق وتثبيت خصومات الطلبيات
              </label>
              <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #b91c1c;">
                <input type="checkbox" id="swal-perm-admin"> <b>مدير نظام (صلاحيات كاملة)</b>
              </label>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-type-name').value;
        const color = document.getElementById('swal-type-color').value;
        const permissions = {
          canAdd: document.getElementById('swal-perm-add').checked,
          canEdit: document.getElementById('swal-perm-edit').checked,
          canDelete: document.getElementById('swal-perm-delete').checked,
          canStockInward: document.getElementById('swal-perm-stock-in')?.checked || false,
          canStockOutward: document.getElementById('swal-perm-stock-out')?.checked || false,
          canStockDamaged: document.getElementById('swal-perm-stock-dmg')?.checked || false,
          canAuditDeductions: document.getElementById('swal-perm-stock-audit')?.checked || false,
          isFullAdmin: document.getElementById('swal-perm-admin').checked
        };
        if (!name) return Swal.showValidationMessage('يرجى إدخال الاسم');
        return { name, color, permissions };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setSettings({
          ...settings,
          userTypes: [...(settings.userTypes || []), result.value]
        });
      }
    });
  };

  const editUserType = (index) => {
    const item = settings.userTypes[index];
    const itemName = typeof item === 'string' ? item : (item.name || '');
    const itemColor = typeof item === 'string' ? (settings.primaryColor || '#1a8d9b') : (item.color || (settings.primaryColor || '#1a8d9b'));
    const perms = item.permissions || { canAdd: false, canEdit: false, canDelete: false, isFullAdmin: false };

    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'تعديل الصلاحيات',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم النوع</label>
            <input id="swal-type-name" class="premium-input" value="${itemName}">
          </div>
          <div class="input-group">
            <label>لون التمييز</label>
            <input id="swal-type-color" type="color" class="premium-input" style="height: 50px; padding: 5px; cursor: pointer;" value="${itemColor}">
          </div>

          <div class="input-group" style="margin-top: 5px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <label style="font-weight: bold; margin-bottom: 10px; display: block; color: var(--primary);">تعديل الصلاحيات</label>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-add" ${perms.canAdd ? 'checked' : ''}> إضافة بيانات جديدة
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-edit" ${perms.canEdit ? 'checked' : ''}> تعديل البيانات
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-delete" ${perms.canDelete ? 'checked' : ''}> حذف البيانات
              </label>
              <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
              <label style="font-size: 0.9rem; font-weight: bold; color: var(--primary);">صلاحيات المخزون</label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-in" ${perms.canStockInward ? 'checked' : ''}> إضافة سند إدخال
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-out" ${perms.canStockOutward ? 'checked' : ''}> إضافة سند إخراج
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-dmg" ${perms.canStockDamaged ? 'checked' : ''}> إضافة سند إتلاف
              </label>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="swal-perm-stock-audit" ${perms.canAuditDeductions ? 'checked' : ''}> تدقيق وتثبيت خصومات الطلبيات
              </label>
              <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #b91c1c;">
                <input type="checkbox" id="swal-perm-admin" ${perms.isFullAdmin ? 'checked' : ''}> <b>مدير نظام (صلاحيات كاملة)</b>
              </label>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-type-name').value;
        const color = document.getElementById('swal-type-color').value;
        const permissions = {
          canAdd: document.getElementById('swal-perm-add').checked,
          canEdit: document.getElementById('swal-perm-edit').checked,
          canDelete: document.getElementById('swal-perm-delete').checked,
          canStockInward: document.getElementById('swal-perm-stock-in')?.checked || false,
          canStockOutward: document.getElementById('swal-perm-stock-out')?.checked || false,
          canStockDamaged: document.getElementById('swal-perm-stock-dmg')?.checked || false,
          canAuditDeductions: document.getElementById('swal-perm-stock-audit')?.checked || false,
          isFullAdmin: document.getElementById('swal-perm-admin').checked
        };
        if (!name) return Swal.showValidationMessage('يرجى إدخال الاسم');
        return { name, color, permissions };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...settings.userTypes];
        newList[index] = result.value;
        setSettings({ ...settings, userTypes: newList });
      }
    });
  };
  const addWorkShift = () => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'إضافة فترة دوام جديدة',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم الفترة</label>
            <input id="swal-shift-name" class="premium-input" placeholder="مثال: الدوام الصباحي">
          </div>
          <div class="input-group">
            <label>وقت البدء (الدخول)</label>
            <input id="swal-shift-start" type="time" class="premium-input" value="08:00">
          </div>
          <div class="input-group">
            <label>وقت الانتهاء (الخروج)</label>
            <input id="swal-shift-end" type="time" class="premium-input" value="16:00">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-shift-name').value;
        const startTime = document.getElementById('swal-shift-start').value;
        const endTime = document.getElementById('swal-shift-end').value;
        if (!name) return Swal.showValidationMessage('يرجى إدخال اسم الفترة');
        return { name, startTime, endTime };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setSettings({
          ...settings,
          workShifts: [...(settings.workShifts || []), result.value]
        });
      }
    });
  };

  const editWorkShift = (index) => {
    const shift = settings.workShifts[index];
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'تعديل فترة الدوام',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم الفترة</label>
            <input id="swal-shift-name" class="premium-input" value="${shift.name}">
          </div>
          <div class="input-group">
            <label>وقت البدء (الدخول)</label>
            <input id="swal-shift-start" type="time" class="premium-input" value="${shift.startTime || '08:00'}">
          </div>
          <div class="input-group">
            <label>وقت الانتهاء (الخروج)</label>
            <input id="swal-shift-end" type="time" class="premium-input" value="${shift.endTime || '16:00'}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-shift-name').value;
        const startTime = document.getElementById('swal-shift-start').value;
        const endTime = document.getElementById('swal-shift-end').value;
        if (!name) return Swal.showValidationMessage('يرجى إدخال اسم الفترة');
        return { name, startTime, endTime };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...settings.workShifts];
        newList[index] = result.value;
        setSettings({ ...settings, workShifts: newList });
      }
    });
  };

  const addMissionStatus = () => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'إضافة حالة حركة',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم الحالة</label>
            <input id="swal-status-name" class="premium-input" placeholder="مثال: قيد المراجعة">
          </div>
          <div class="input-group">
            <label>لون الحالة</label>
            <input id="swal-status-color" type="color" class="premium-input" style="height: 50px; padding: 5px;" value="#94a3b8">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-status-name').value;
        const color = document.getElementById('swal-status-color').value;
        if (!name) return Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setSettings({
          ...settings,
          missionStatuses: [...(settings.missionStatuses || []), result.value]
        });
      }
    });
  };

  const editMissionStatus = (index) => {
    const status = settings.missionStatuses[index];
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'تعديل الحالة',
      html: `
        <div style="text-align: right; display: flex; flex-direction: column; gap: 15px;">
          <div class="input-group">
            <label>اسم الحالة</label>
            <input id="swal-status-name" class="premium-input" value="${status.name}">
          </div>
          <div class="input-group">
            <label>لون الحالة</label>
            <input id="swal-status-color" type="color" class="premium-input" style="height: 50px; padding: 5px;" value="${status.color}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-status-name').value;
        const color = document.getElementById('swal-status-color').value;
        if (!name) return Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...settings.missionStatuses];
        newList[index] = result.value;
        setSettings({ ...settings, missionStatuses: newList });
      }
    });
  };

  const removeItem = (field, index) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-confirm-delete',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'هل أنت متأكد؟',
      text: "لا يمكن التراجع عن هذا الإجراء!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...settings[field]];
        newList.splice(index, 1);
        setSettings({ ...settings, [field]: newList });
      }
    });
  };

  const moveItem = (field, index, direction) => {
    const newList = [...(settings[field] || [])];
    if (direction === -1 && index > 0) {
      const temp = newList[index - 1];
      newList[index - 1] = newList[index];
      newList[index] = temp;
    } else if (direction === 1 && index < newList.length - 1) {
      const temp = newList[index + 1];
      newList[index + 1] = newList[index];
      newList[index] = temp;
    } else {
      return;
    }
    setSettings({ ...settings, [field]: newList });
  };


  
  const addExecutionStatus = () => {
    Swal.fire({
      title: 'إضافة حالة تنفيذ جديدة',
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="اسم الحالة">
        <div class="mt-4 flex items-center justify-center gap-4">
          <label class="text-sm font-medium text-slate-700">لون الحالة:</label>
          <input type="color" id="swal-input2" class="w-12 h-10 cursor-pointer rounded border border-slate-300" value="#3b82f6">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'إضافة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-input1').value;
        const color = document.getElementById('swal-input2').value;
        if (!name) Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const currentList = settings.executionStatuses || [];
        saveGlobalSettings({ ...settings, executionStatuses: [...currentList, result.value] }).then(() => {
          Swal.fire('تمت الإضافة', '', 'success');
        });
      }
    });
  };

  const editExecutionStatus = (idx) => {
    const currentList = settings.executionStatuses || [];
    const item = currentList[idx];
    Swal.fire({
      title: 'تعديل حالة التنفيذ',
      html: `
        <input id="swal-input1" class="swal2-input" value="${item.name || item}">
        <div class="mt-4 flex items-center justify-center gap-4">
          <label class="text-sm font-medium text-slate-700">لون الحالة:</label>
          <input type="color" id="swal-input2" class="w-12 h-10 cursor-pointer rounded border border-slate-300" value="${item.color || '#3b82f6'}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'حفظ التعديلات',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-input1').value;
        const color = document.getElementById('swal-input2').value;
        if (!name) Swal.showValidationMessage('يرجى إدخال اسم الحالة');
        return { name, color };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const newList = [...currentList];
        newList[idx] = result.value;
        saveGlobalSettings({ ...settings, executionStatuses: newList }).then(() => {
          Swal.fire('تم التعديل', '', 'success');
        });
      }
    });
  };

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>;

  
  
return (
    <div className="space-y-6">
      <div className="flex-responsive mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-primary" /> إعدادات النظام العامة
          </h2>
          <p className="text-muted">تحكم في هوية الموقع، الحالات، وأنواع المستخدمين</p>
        </div>
              {canPerformAction(user, 'EDIT', 'SETTINGS', settings) && (
                <button className="btn btn-primary flex items-center gap-2" onClick={handleSave}>
                  <Save size={18} /> حفظ الإعدادات
                </button>
              )}
      </div>

      <div className="premium-tabs-container">
        <div className={`premium-tab ${activeTab === 'site' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('site')}>
          <Globe size={18} /> <span>إعدادات الموقع</span>
        </div>
        <div className={`premium-tab ${activeTab === 'statuses' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('statuses')}>
          <ListTodo size={18} /> <span>إدارة الحالات</span>
        </div>
        <div className={`premium-tab ${activeTab === 'users' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('users')}>
          <Users size={18} /> <span>أنواع المستخدمين</span>
        </div>
        <div className={`premium-tab ${activeTab === 'sectors' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('sectors')}>
          <Briefcase size={18} /> <span>قطاعات العملاء</span>
        </div>
        <div className={`premium-tab ${activeTab === 'stock' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('stock')}>
          <Package size={18} /> <span>إعدادات المخزون</span>
        </div>
                <div className={`premium-tab ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={18} /> <span>إعدادات الإشعارات</span>
        </div>
        
        <div className={`premium-tab ${['hr', 'jobtitles', 'workshifts', 'holidays'].includes(activeTab) ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
          <Users size={18} /> <span>الموارد البشرية والرواتب</span>
        </div>
              <div className={`premium-tab ${activeTab === 'whatsapp' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('whatsapp')}>
          <MessageSquare size={18} /> <span>إعدادات الواتساب</span>
        </div>
        <div className={`premium-tab ${activeTab === 'data' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('data')}>
          <Database size={18} /> <span>إدارة البيانات</span>
        </div>
      </div>

      {['hr', 'jobtitles', 'workshifts', 'holidays'].includes(activeTab) && (
        <div className="flex gap-3 mb-6 animate-fade-in overflow-x-auto pb-2" style={{ padding: '0 5px' }}>
          <button className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
            <Settings size={18} /> <span>الإعدادات العامة</span>
          </button>
          <button className={`premium-tab ${activeTab === 'jobtitles' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('jobtitles')}>
            <Briefcase size={18} /> <span>المسميات والأقسام الوظيفية</span>
          </button>
          <button className={`premium-tab ${activeTab === 'workshifts' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('workshifts')}>
            <Clock size={18} /> <span>أوقات الدوام وبصمة الموقع</span>
          </button>
          <button className={`premium-tab ${activeTab === 'holidays' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('holidays')}>
            <Calendar size={18} /> <span>تهيئة العطل</span>
          </button>
        </div>
      )}

      <div className="glass-card animate-fade-in">
        {activeTab === 'hr' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. قسم الرواتب والحضور الأساسي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-slate-800">
                <Users className="text-primary" /> إعدادات الرواتب والحضور
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> بداية دورة الرواتب (اليوم)</label>
                  <p className="text-xs text-slate-500 mb-2">لتحديد بداية ونهاية الشهر المالي (مثال: 1 يعني من 1 إلى 30).</p>
                  <input 
                    type="number" min="1" max="28" className="input-field" 
                    value={settings.hrSettings.salaryCycleStartDay || 1} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, salaryCycleStartDay: Number(e.target.value)}})} />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> آلية احتساب أيام العمل بالشهر</label>
                  <p className="text-xs text-slate-500 mb-2">يستخدم لحساب قيمة يوم وساعة العمل للموظف عند الخصم.</p>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.workDaysStrategy || 'fixed'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysStrategy: e.target.value}})}>
                    <option value="fixed">عدد ثابت لجميع الأشهر (مثال: 30 يوم)</option>
                    <option value="actual">أيام الشهر الفعلية (28, 30, 31)</option>
                  </select>
                  
                  {(!settings.hrSettings.workDaysStrategy || settings.hrSettings.workDaysStrategy === 'fixed') && (
                    <div className="mt-3">
                      <label className="text-sm font-bold mb-1 block">أيام العمل المعتمدة:</label>
                      <input 
                        type="number" min="1" max="31" className="input-field" 
                        value={settings.hrSettings.workDaysPerMonth || 30} 
                        onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysPerMonth: Number(e.target.value)}})} />
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> ساعات العمل الافتراضية</label>
                  <p className="text-xs text-slate-500 mb-2">تستخدم فقط للعمليات الحسابية إذا لم يتم تحديد شفت للموظف.</p>
                  <input 
                    type="number" step="0.5" min="1" className="input-field" 
                    value={settings.hrSettings.standardWorkHours || 8} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, standardWorkHours: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group flex flex-col justify-center">
                  <label className="font-bold flex items-center gap-2 cursor-pointer mt-4">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.salaryApprovalRequired !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, salaryApprovalRequired: e.target.checked}})}
                     />
                     إعتماد الراتب الشهري يدوي وقفل السجلات آلياً
                  </label>
                  <p className="text-xs text-slate-500 mr-6 mt-1">يتطلب مراجعة واعتماد الإدارة قبل الإغلاق لمنع التعديل بأثر رجعي.</p>
                </div>

                <div className="input-group md:col-span-2">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> أيام العطلة الأسبوعية المعتمدة</label>
                  <p className="text-xs text-slate-500 mb-2">الأيام المحددة تعتبر عطلة ولن يسجل فيها غياب أو ختمة ناقصة للموظف.</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['الجمعة', 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map(day => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary"
                          checked={(settings.hrSettings.weekendDays || ['الجمعة']).includes(day)}
                          onChange={(e) => {
                            let current = settings.hrSettings.weekendDays || ['الجمعة'];
                            if (e.target.checked) {
                              if (!current.includes(day)) current = [...current, day];
                            } else {
                              current = current.filter(d => d !== day);
                            }
                            setSettings({...settings, hrSettings: {...settings.hrSettings, weekendDays: current}});
                          }}
                        />
                        <span className="font-medium text-slate-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* 2. قسم التأخير والمغادرات */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-rose-600">
                <MinusCircle size={20} className="text-rose-500" /> إعدادات التأخير والمغادرات
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                
                <div className="input-group">
                  <label className="font-bold">فترة السماح للتأخير الصباحي (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-1">دقائق مسموحة يومياً لا تحسب كتأخير.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.gracePeriodMinutes || 0} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, gracePeriodMinutes: Number(e.target.value)}})}
                  />
                </div>

                {settings.hrSettings.latenessHandling !== 'financial_deduction' && (
                  <div className="input-group">
                    <label className="font-bold">رصيد المغادرات والتأخير الشهري المسموح (بالدقائق)</label>
                    <p className="text-xs text-slate-500 mb-1">الرصيد المتاح قبل أن يبدأ النظام بخصم المبالغ المالية.</p>
                    <input 
                      type="number" min="0" className="input-field" 
                      value={settings.hrSettings.monthlyMissionBalanceMinutes || 0} 
                      onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, monthlyMissionBalanceMinutes: Number(e.target.value)}})}
                    />
                  </div>
                )}

                <div className="input-group">
                  <label className="font-bold">طريقة احتساب التأخير / المغادرات</label>
                  <p className="text-xs text-slate-500 mb-1">آلية التعامل بعد استنفاذ الرصيد الشهري.</p>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.latenessHandling || 'deduct_from_balance'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, latenessHandling: e.target.value}})}
                  >
                    <option value="deduct_from_balance">خصم من الرصيد الشهري أولاً (ثم مالي)</option>
                    <option value="financial_deduction">خصم مالي مباشر (بدون رصيد)</option>
                    <option value="warning_only">تنبيه فقط (لا يوجد خصم مالي)</option>
                  </select>
                </div>
                
              </div>
            </div>

            {/* 3. قسم العمل الإضافي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-emerald-600">
                <PlusCircle size={20} className="text-emerald-500" /> إعدادات العمل الإضافي
              </h3>
              
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="input-group">
                  <label className="font-bold">هل يتطلب العمل الإضافي موافقة مسبقة؟</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.overtimeRequiresApproval !== false ? 'yes' : 'no'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeRequiresApproval: e.target.value === 'yes'}})}
                  >
                    <option value="yes">نعم، يعتمد الإضافي فقط عبر (طلب عمل إضافي)</option>
                    <option value="no">لا، يتم احتسابه تلقائياً من البصمة (لا ينصح به)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="font-bold">آلية احتساب بدل الإضافي</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.overtimeCalculationMethod || 'hourly_rate'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeCalculationMethod: e.target.value}})}
                  >
                    <option value="hourly_rate">حسب قيمة ساعة الموظف (متغير)</option>
                    <option value="fixed_amount">مبلغ ثابت لكل طلب / يوم</option>
                  </select>
                </div>
              </div>

              {settings.hrSettings.overtimeCalculationMethod !== 'fixed_amount' && (
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div className="input-group">
                    <label className="font-bold">مُضاعف العمل الإضافي (الأيام العادية)</label>
                    <p className="text-xs text-slate-500 mb-2">حسب القانون 1.25 (أي زيادة 25% على أجر الساعة).</p>
                    <input 
                      type="number" step="0.05" min="1" className="input-field" 
                      value={settings.hrSettings.overtimeMultiplier || 1.25} 
                      onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeMultiplier: Number(e.target.value)}})}
                    />
                  </div>
                  <div className="input-group">
                    <label className="font-bold">مُضاعف العمل الإضافي (العطل الرسمية)</label>
                    <p className="text-xs text-slate-500 mb-2">حسب القانون 1.50 (أي زيادة 50% على أجر الساعة).</p>
                    <input 
                      type="number" step="0.05" min="1" className="input-field" 
                      value={settings.hrSettings.overtimeWeekendMultiplier || 1.50} 
                      onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeWeekendMultiplier: Number(e.target.value)}})}
                    />
                  </div>
                </div>
              )}

              {settings.hrSettings.overtimeCalculationMethod === 'fixed_amount' && (
                <div className="input-group w-1/2">
                  <label className="font-bold">قيمة المبلغ الثابت (د.أ)</label>
                  <input 
                    type="number" step="0.5" min="0" className="input-field" 
                    value={settings.hrSettings.overtimeFixedAmount || 10} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, overtimeFixedAmount: Number(e.target.value)}})}
                  />
                </div>
              )}

              <div className="input-group mt-4">
                <label className="font-bold">الحد الأقصى للساعات الإضافية اليومية</label>
                <p className="text-xs text-slate-500 mb-2">لمنع إدخال ساعات إضافية مبالغ فيها بالخطأ.</p>
                <input 
                  type="number" step="0.5" min="0" max="24" className="input-field md:w-1/2" 
                  value={settings.hrSettings.maxDailyOvertimeHours || 6} 
                  onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, maxDailyOvertimeHours: Number(e.target.value)}})}
                />
              </div>
            </div>

            {/* 3.5 قسم الضمان الاجتماعي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-blue-600">
                <Shield size={20} className="text-blue-500" /> إعدادات الضمان الاجتماعي
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="input-group">
                  <label className="font-bold text-slate-800">نسبة اقتطاع الموظف (%)</label>
                  <p className="text-xs text-slate-500 mb-2">تخصم من راتب الموظف الخاضع للضمان.</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityEmployeePercentage ?? 7.5} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityEmployeePercentage: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">نسبة مساهمة الشركة (%)</label>
                  <p className="text-xs text-slate-500 mb-2">تظهر في التقارير ولا تؤثر على صافي راتب الموظف.</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityCompanyPercentage ?? 14.25} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityCompanyPercentage: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">إضافة المهن الخطرة للشركة (%)</label>
                  <p className="text-xs text-slate-500 mb-2">نسبة إضافية تدفعها الشركة للموظفين في مهن خطرة (مثال: 1%).</p>
                  <input 
                    type="number" step="0.01" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.socialSecurityHazardousPercentage ?? 1} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, socialSecurityHazardousPercentage: Number(e.target.value)}})}
                  />
                </div>
              </div>
            </div>

            {/* 3.6 إعدادات السلف */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-orange-600">
                <DollarSign size={20} className="text-orange-500" /> إعدادات السلف (المبالغ المقطوعة)
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.allowAdvances !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, allowAdvances: e.target.checked}})}
                     />
                     تفعيل نظام السلف للموظفين
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">في حال التعطيل، لن يتمكن الموظفون من طلب سلف من النظام.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">الحد الأقصى المسموح للسلفة (كنسبة من الراتب الأساسي %)</label>
                  <p className="text-xs text-slate-500 mb-2">النظام لن يسمح بتقديم سلفة تتجاوز هذه النسبة (مثال: 50%).</p>
                  <input 
                    type="number" min="0" max="100" className="input-field" 
                    value={settings.hrSettings.maxAdvancePercentage ?? 50} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, maxAdvancePercentage: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group md:col-span-2 mt-4 border-t pt-4">
                  <label className="font-bold text-slate-800">أيام السماح بتقديم السلف (خلال الشهر)</label>
                  <p className="text-xs text-slate-500 mb-4">حدد الفترات المسموحة لتقديم السلف (من اليوم الأول إلى اليوم الأخير من الفترة المسموحة كل شهر).</p>
                  
                  <div className="flex flex-col gap-3">
                    {(settings.hrSettings.advancePeriods || [{ fromDay: 15, toDay: 20 }]).map((period, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-sm font-bold text-slate-700">الفترة {idx + 1}:</span>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600">من يوم</label>
                          <input type="number" min="1" max="31" className="input-field w-20 py-1 px-2 text-center" 
                            value={period.fromDay || 15} 
                            onChange={(e) => {
                              const currentPeriods = settings.hrSettings.advancePeriods || [{ fromDay: 15, toDay: 20 }];
                              const newPeriods = [...currentPeriods];
                              newPeriods[idx] = { ...newPeriods[idx], fromDay: Number(e.target.value) };
                              setSettings({...settings, hrSettings: {...settings.hrSettings, advancePeriods: newPeriods}});
                            }} 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-600">إلى يوم</label>
                          <input type="number" min="1" max="31" className="input-field w-20 py-1 px-2 text-center" 
                            value={period.toDay || 20} 
                            onChange={(e) => {
                              const currentPeriods = settings.hrSettings.advancePeriods || [{ fromDay: 15, toDay: 20 }];
                              const newPeriods = [...currentPeriods];
                              newPeriods[idx] = { ...newPeriods[idx], toDay: Number(e.target.value) };
                              setSettings({...settings, hrSettings: {...settings.hrSettings, advancePeriods: newPeriods}});
                            }} 
                          />
                        </div>
                        <div className="flex items-center gap-2 mr-auto">
                          <button type="button" onClick={async () => {
                            let currentPeriods = settings.hrSettings.advancePeriods;
                            if (!currentPeriods) {
                              currentPeriods = [{ fromDay: 15, toDay: 20 }];
                              setSettings({...settings, hrSettings: {...settings.hrSettings, advancePeriods: currentPeriods}});
                            }
                            await handleSave();
                          }} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '0.5rem' }}>
                            <Save size={16} /> حفظ الفترة
                          </button>
                          <button type="button" onClick={() => {
                            const currentPeriods = settings.hrSettings.advancePeriods || [{ fromDay: 15, toDay: 20 }];
                            const newPeriods = [...currentPeriods];
                            newPeriods.splice(idx, 1);
                            setSettings({...settings, hrSettings: {...settings.hrSettings, advancePeriods: newPeriods}});
                          }} className="icon-btn hover:bg-rose-100 p-2 rounded-full transition-colors">
                            <Trash2 size={18} className="text-rose-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button type="button" onClick={() => {
                      const currentPeriods = settings.hrSettings.advancePeriods || [{ fromDay: 15, toDay: 20 }];
                      const newPeriods = [...currentPeriods, { fromDay: 1, toDay: 5 }];
                      setSettings({...settings, hrSettings: {...settings.hrSettings, advancePeriods: newPeriods}});
                    }} className="btn btn-outline border-dashed text-primary hover:bg-sky-50 flex items-center justify-center gap-2 py-2 mt-2 w-max">
                      <PlusCircle size={16} /> إضافة فترة سماح جديدة
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. السياسة الافتراضية للعطل الرسمية */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-purple-600">
                <Calendar size={20} className="text-purple-500" /> السياسة الافتراضية للعطل الرسمية والغياب
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.isPaid !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), isPaid: e.target.checked}}})}
                     />
                     تعتبر العطلة يوم دوام مدفوع الأجر
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">إذا لم يحضر الموظف في العطلة، فلن يتم خصم راتبه.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.exemptFromPunch !== false}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), exemptFromPunch: e.target.checked}}})}
                     />
                     إعفاء الموظف من الختم في العطل
                  </label>
                  <p className="text-xs text-slate-500 mt-1 mr-6">لن يتم تسجيل ختمة ناقصة للموظف أيام العطل.</p>
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4" 
                       checked={settings.hrSettings.holidayDefaults?.affectsMonthlyWorkDays === true}
                       onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), affectsMonthlyWorkDays: e.target.checked}}})}
                     />
                     تؤثر العطلة على عدد أيام العمل الشهرية
                  </label>
                </div>

                <div className="input-group">
                  <label className="font-bold text-slate-800">حضور الموظف في العطلة يستحق:</label>
                  <select 
                    className="input-field mt-1"
                    value={settings.hrSettings.holidayDefaults?.attendanceCompensation || 'overtime_1_5'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, holidayDefaults: {...(settings.hrSettings.holidayDefaults || {}), attendanceCompensation: e.target.value}}})}
                  >
                    <option value="none">لا شيء</option>
                    <option value="alternative_day">يوم بديل (يضاف لرصيد الإجازات)</option>
                    <option value="overtime_1_25">أجر إضافي فقط (الساعة بساعة وربع 1.25)</option>
                    <option value="overtime_1_5">أجر إضافي فقط (الساعة بساعة ونصف 1.5)</option>
                    <option value="alternative_day_and_overtime_1_25">يوم بديل + أجر إضافي (الساعة بساعة وربع 1.25)</option>
                    <option value="alternative_day_and_overtime_1_5">يوم بديل + أجر إضافي (الساعة بساعة ونصف 1.5)</option>
                  </select>
                </div>
                
                <div className="input-group md:col-span-2">
                  <label className="font-bold">طريقة احتساب الغياب الكامل (بدون عذر)</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.absenceHandling || 'full_day'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, absenceHandling: e.target.value}})}
                  >
                    <option value="full_day">خصم يوم كامل</option>
                    <option value="work_hours">خصم حسب ساعات العمل</option>
                    <option value="needs_approval">يحتاج موافقة / إجراء يدوي من الإدارة</option>
                  </select>
                </div>

              </div>
            </div>

          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="input-group">
                  <label>اسم الموقع</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={settings.siteName} 
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    placeholder="مثال: ميرجاس HR"
                  />
                </div>
                {/* Primary color moved to header */}
                <div className="bg-primary-light p-4 rounded-lg">
                  <h4 className="text-primary font-bold mb-2">مواصفات الشعار المفضلة</h4>
                  <ul className="text-sm space-y-1 opacity-80">
                    <li>• الأبعاد المثالية: 512 × 512 بكسل</li>
                    <li>• النوع: PNG (بخلفية شفافة)</li>
                    <li>• الحجم الأقصى: 500 كيلوبايت</li>
                  </ul>
                  <p className="text-xs mt-3 text-primary-dark">هذا الشعار سيظهر في السايد بار وكأيقونة للتطبيق (Favicon).</p>
                </div>
              </div>

              <div className="glass-panel flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
                <div className="w-48 h-48 mb-4 rounded-xl flex items-center justify-center overflow-hidden bg-transparent">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', maxWidth: '512px', maxHeight: '512px', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                  ) : (
                    <ImageIcon size={48} className="text-muted opacity-20" />
                  )}
                </div>
                <label className="btn btn-outline cursor-pointer">
                  <Upload size={18} /> 
                  <span>تغيير الشعار</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>

              </div>

            
          </div>
        )}
        
        
{activeTab === 'workshifts' && (
  <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full">
    <div className="w-full lg:w-1/2">
      <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Clock size={18} className="text-primary" /> أوقات وفترات الدوام</h3>
              <button className="btn-premium-add" onClick={addWorkShift}><span>إضافة فترة جديدة</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف فترات الدوام المختلفة لشركتك لتعيينها للموظفين لتنظيم الحضور والانصراف (مثال: الدوام الصباحي 08:00 - 16:00).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">اسم الفترة</th>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200 text-center">وقت الحضور</th>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200 text-center">وقت الانصراف</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.workShifts || []).length > 0 ? (
                    (settings.workShifts || []).map((shift, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{shift.name}</td>
                        <td className="p-3 font-medium align-middle border border-slate-200 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{shift.startTime}</span>
                        </td>
                        <td className="p-3 font-medium align-middle border border-slate-200 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-sm">{shift.endTime}</span>
                        </td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editWorkShift(idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('workShifts', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد فترات دوام مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
    </div>
    <div className="w-full lg:w-1/2">
      <div className="space-y-6">
            {/* GPS Multi-Locations Settings */}

            <div className="glass-panel p-6 mt-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-blue-600">
                <Globe size={20} className="text-blue-500" /> إعدادات البصمة والمواقع الجغرافية (فروع الشركة)
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Map & Form */}
                <div className="space-y-4">
                  <div className="input-group">
                    <label className="font-bold flex items-center gap-2">اسم الموقع / الفرع</label>
                    <input type="text" className="input-field" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} placeholder="مثال: الفرع الرئيسي" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-group">
                      <label className="font-bold text-xs">خط العرض (Lat)</label>
                      <input type="number" step="any" className="input-field py-1" value={newLocation.lat} onChange={e => setNewLocation({...newLocation, lat: Number(e.target.value)})} />
                    </div>
                    <div className="input-group">
                      <label className="font-bold text-xs">خط الطول (Lng)</label>
                      <input type="number" step="any" className="input-field py-1" value={newLocation.lng} onChange={e => setNewLocation({...newLocation, lng: Number(e.target.value)})} />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label className="font-bold text-xs">النطاق المسموح (بالمتر)</label>
                    <input type="number" min="10" className="input-field py-1" value={newLocation.radius} onChange={e => setNewLocation({...newLocation, radius: Number(e.target.value)})} />
                  </div>

                  <p className="text-xs text-slate-500 mb-2">انقر على الخريطة لتحديد الإحداثيات، أو اسحب لتغيير المكان. الدائرة الزرقاء تمثل النطاق المسموح.</p>
                  
                  <div className="map-container-wrapper" style={{ width: '100%', border: '2px solid #2563eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f8fafc', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
                    
                    <div style={{ height: '350px', width: '100%', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '10px', left: '50px', right: '10px', zIndex: 1000, display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '8px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <input 
                          type="text" 
                          className="input-field flex-1" 
                          style={{ margin: 0, padding: '8px 12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          placeholder="ابحث عن (مدينة، منطقة، شارع) للوصول التقريبي ثم حدد مؤسستك يدوياً..." 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchLocation();
                            }
                          }}
                        />
                        <button 
                          type="button"
                          className="btn btn-primary" 
                          style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                          onClick={handleSearchLocation}
                          disabled={isSearching}
                        >
                          {isSearching ? 'جاري البحث...' : 'بحث'}
                        </button>
                      </div>

                      {typeof window !== 'undefined' ? (
                        <MapContainer 
                          center={[newLocation.lat || 31.9539, newLocation.lng || 35.9106]} 
                          zoom={16} 
                          style={{ height: '100%', width: '100%', zIndex: 1 }}
                          scrollWheelZoom={true}
                        >
                          <TileLayer 
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                          />
                          <LocationPicker 
                            lat={newLocation.lat} 
                            lng={newLocation.lng} 
                            radius={newLocation.radius || 20}
                            onChange={(lat, lng) => setNewLocation({...newLocation, lat, lng})} 
                          />
                        </MapContainer>
                      ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                          حدث خطأ في تحميل مكتبة الخرائط
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button className="btn btn-primary w-full" onClick={handleAddLocation}>
                    {editingLocIndex >= 0 ? 'تحديث الموقع' : 'إضافة موقع عمل'}
                  </button>
                  {editingLocIndex >= 0 && (
                    <button className="btn btn-outline w-full mt-2" onClick={() => { setEditingLocIndex(-1); setNewLocation({ name: '', lat: 31.9539, lng: 35.9106, radius: 20 }); }}>
                      إلغاء التعديل
                    </button>
                  )}
                </div>

                {/* Locations List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">المواقع المضافة:</h4>
                  {(!settings.workLocations || settings.workLocations.length === 0) && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-500">لم يتم إضافة أي مواقع بعد.</p>
                      <p className="text-xs text-slate-400 mt-2">قم بإضافة موقع ليتمكن الموظفون من تسجيل الدخول منه.</p>
                    </div>
                  )}
                  {(settings.workLocations || []).map((loc, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                      <div>
                        <h5 className="font-bold text-slate-800">{loc.name}</h5>
                        <p className="text-xs font-mono text-slate-500 mt-1">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
                        <p className="text-xs text-blue-500 mt-1">النطاق: {loc.radius} متر</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="btn btn-outline text-xs py-1 px-3" onClick={() => handleEditLocation(idx)}>تعديل</button>
                        <button className="btn btn-outline text-xs py-1 px-3 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteLocation(idx)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
    </div>
  </div>
)}

        {activeTab === 'statuses' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-8">

              {/* حالات الصنف - عملاء */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> حالات الصنف (عملاء)</h3>
                <button className="btn-premium-add" onClick={() => addItem('salesItemStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.salesItemStatuses || []).length > 0 ? (
                      (settings.salesItemStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{status}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center items-center">
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === 0} onClick={() => moveItem('salesItemStatuses', idx, -1)}><ChevronUp size={16} /></button>
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === (settings.salesItemStatuses || []).length - 1} onClick={() => moveItem('salesItemStatuses', idx, 1)}><ChevronDown size={16} /></button>
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('salesItemStatuses', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('salesItemStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              {/* حالات الطلبيات - إنتاج */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle size={18} className="text-primary" /> حالات الطلبيات (إنتاج)</h3>
                <button className="btn-premium-add" onClick={() => addItem('productionStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.productionStatuses || []).length > 0 ? (
                      (settings.productionStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{status}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center items-center">
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === 0} onClick={() => moveItem('productionStatuses', idx, -1)}><ChevronUp size={16} /></button>
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === (settings.productionStatuses || []).length - 1} onClick={() => moveItem('productionStatuses', idx, 1)}><ChevronDown size={16} /></button>
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('productionStatuses', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('productionStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              {/* حالات الطلبيات - عملاء */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-primary-dark"><CheckCircle size={18} /> حالات الطلبيات (العملاء)</h3>
                <button className="btn-premium-add" onClick={() => addItem('salesStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.salesStatuses || []).length > 0 ? (
                      (settings.salesStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{status}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center items-center">
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === 0} onClick={() => moveItem('salesStatuses', idx, -1)}><ChevronUp size={16} /></button>
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === (settings.salesStatuses || []).length - 1} onClick={() => moveItem('salesStatuses', idx, 1)}><ChevronDown size={16} /></button>
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('salesStatuses', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('salesStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            
            </div>
              {/* حالات حركة التوصيل */}
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-primary" /> حالات حركة التوصيل</h3>
                <button className="btn-premium-add" onClick={addMissionStatus}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الحالة</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.missionStatuses || []).length > 0 ? (
                      (settings.missionStatuses || []).map((status, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">
                            <div className="flex items-center gap-2">
                               <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color || '#ccc' }}></div>
                               <span>{status.name || status}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center items-center">
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === 0} onClick={() => moveItem('missionStatuses', idx, -1)}><ChevronUp size={16} /></button>
                              <button className="icon-btn text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed" disabled={idx === (settings.missionStatuses || []).length - 1} onClick={() => moveItem('missionStatuses', idx, 1)}><ChevronDown size={16} /></button>
                              <button className="icon-btn icon-btn-edit" onClick={() => editMissionStatus(idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionStatuses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد حالات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary" /> إدارة أنواع المستخدمين</h3>
              <button className="btn-premium-add" onClick={addUserType}><span>إضافة نوع جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-xs text-muted">هنا يمكنك تحديد المسميات الوظيفية والألوان التمييزية لكل نوع من الموظفين.</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">النوع</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.userTypes || []).length > 0 ? (
                    (settings.userTypes || []).map((type, idx) => {
                      const name = typeof type === 'string' ? type : (type.name || '');
                      const color = typeof type === 'string' ? settings.primaryColor : (type.color || settings.primaryColor);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                              <span>{name}</span>
                            </div>
                          </td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editUserType(idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('userTypes', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أنواع مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobtitles' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> المسميات والأقسام الوظيفية</h3>
              <button className="btn-premium-add" onClick={() => addItem('jobTitles')}><span>إضافة مسمى جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف المسميات الوظيفية المتاحة في شركتك لتسهيل تصنيف الموظفين (مثال: مدير مبيعات، محاسب، إلخ).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">المسمى الوظيفي</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.jobTitles || []).length > 0 ? (
                    (settings.jobTitles || []).map((title, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{title}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('jobTitles', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('jobTitles', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد مسميات مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobtitles' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Building size={18} className="text-primary" /> الأقسام الوظيفية</h3>
              <button className="btn-premium-add" onClick={() => addItem('departmentsList')}><span>إضافة قسم جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف الأقسام الرئيسية والإدارات في شركتك لتعيين الموظفين فيها (مثال: قسم المبيعات، التسويق، الموارد البشرية).</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">القسم</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.departmentsList || []).length > 0 ? (
                    (settings.departmentsList || []).map((dept, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{dept}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('departmentsList', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('departmentsList', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد أقسام مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="glass-panel p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex items-center gap-2"><Briefcase size={18} className="text-primary" /> قطاعات العملاء</h3>
              <button className="btn-premium-add" onClick={() => addItem('customerSectors')}><span>إضافة قطاع جديد</span> <Plus size={16} /></button>
            </div>
            <p className="text-sm text-slate-500">أضف قطاعات العملاء لعملائك لاستخدامها عند إضافة أو تعديل بيانات العميل.</p>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-700 border border-slate-200">القطاع</th>
                    <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.customerSectors || []).length > 0 ? (
                    (settings.customerSectors || []).map((sector, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium align-middle border border-slate-200">{sector}</td>
                        <td className="p-3 align-middle text-center border border-slate-200">
                          <div className="flex gap-2 justify-center">
                            <button className="icon-btn icon-btn-edit" onClick={() => editItem('customerSectors', idx)}><Edit2 size={16} /></button>
                            <button className="icon-btn icon-btn-delete" onClick={() => removeItem('customerSectors', idx)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد قطاعات مضافة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="grid grid-cols-2 gap-6 items-start animate-fade-in">
            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Home size={18} className="text-primary" /> المستودعات</h3>
                <button className="btn-premium-add" onClick={() => addItem('warehouses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.warehouses || []).length > 0 ? (
                      (settings.warehouses || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('warehouses', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('warehouses', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد مستودعات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> تصنيفات المخزون</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockCategories')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockCategories || []).length > 0 ? (
                      (settings.stockCategories || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockCategories', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockCategories', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد تصنيفات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Palette size={18} className="text-primary" /> الألوان / المواصفات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockColors')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockColors || []).length > 0 ? (
                      (settings.stockColors || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockColors', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockColors', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد ألوان مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Ruler size={18} className="text-primary" /> الوحدات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockUnits')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 border border-slate-200">الاسم</th>
                      <th className="p-3 font-bold text-slate-700 w-32 text-center border border-slate-200">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.stockUnits || []).length > 0 ? (
                      (settings.stockUnits || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium align-middle border border-slate-200">{item}</td>
                          <td className="p-3 align-middle text-center border border-slate-200">
                            <div className="flex gap-2 justify-center">
                              <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockUnits', idx)}><Edit2 size={16} /></button>
                              <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockUnits', idx)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-4 text-center text-slate-500 border border-slate-200">لا توجد وحدات مضافة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

                {activeTab === 'whatsapp' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <WhatsAppSettingsTab />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <NotificationSettingsTab settings={settings} setSettings={setSettings} employees={employees} />
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <HRHolidays user={user} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <DataManagementTab />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;



