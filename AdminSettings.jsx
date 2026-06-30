import React, { useState, useEffect } from 'react';
import { canPerformAction, getGlobalSettings, saveGlobalSettings, getEmployees, saveEmployee, getNotificationRoleOptions, normalizeNotificationSettings, } from '../../store';
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

import { Settings, Globe, Image as ImageIcon, CheckCircle, ListTodo, Users, Plus, Trash2, Save, Upload, Edit2, Package, Home, Palette, Ruler, Truck, CheckCircle2, Bell, ChevronDown, ChevronUp, Volume2, VolumeX, Briefcase, Building, Clock, Fingerprint, ArrowUpDown, Calendar, PlusCircle, MinusCircle, Shield, RotateCcw, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

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
        <div className={`premium-tab ${activeTab === 'jobtitles' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('jobtitles')}>
          <Briefcase size={18} /> <span>المسميات الوظيفية</span>
        </div>
        <div className={`premium-tab ${activeTab === 'departments' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('departments')}>
          <Building size={18} /> <span>الأقسام الوظيفية</span>
        </div>
        <div className={`premium-tab ${activeTab === 'workshifts' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('workshifts')}>
          <Clock size={18} /> <span>أوقات الدوام</span>
        </div>
        <div className={`premium-tab ${activeTab === 'stock' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('stock')}>
          <Package size={18} /> <span>إعدادات المخزون</span>
        </div>
        <div className={`premium-tab ${activeTab === 'missions' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('missions')}>
          <Truck size={18} /> <span>إعدادات التوصيل</span>
        </div>
        <div className={`premium-tab ${activeTab === 'notifications' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('notifications')}>
          <Bell size={18} /> <span>إعدادات الإشعارات</span>
        </div>
        <div className={`premium-tab ${activeTab === 'missingpunches' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('missingpunches')}>
          <Fingerprint size={18} /> <span>الختمات الناقصة</span>
        </div>
        <div className={`premium-tab ${activeTab === 'leavepermissions' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('leavepermissions')}>
          <Calendar size={18} /> <span>صلاحيات الإجازات</span>
        </div>
        <div className={`premium-tab ${activeTab === 'gps' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('gps')}>
          <Globe size={18} /> <span>البصمة والمواقع</span>
        </div>
        <div className={`premium-tab ${activeTab === 'hr' ? 'premium-tab-active' : 'premium-tab-inactive'}`} onClick={() => setActiveTab('hr')}>
          <Users size={18} /> <span>الموارد البشرية والرواتب</span>
        </div>
      </div>

      <div className="glass-card animate-fade-in">
        {activeTab === 'hr' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* 1. قسم الرواتب والحضور الأساسي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-slate-800">
                <Users className="text-primary" /> إعدادات الرواتب والحضور
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> ساعات العمل الافتراضية</label>
                  <p className="text-xs text-slate-500 mb-2">تستخدم فقط إذا لم يتم تحديد شفت للموظف. (النظام يحسب الساعات تلقائياً لكل موظف من شفته).</p>
                  <input 
                    type="number" step="0.5" min="1" className="input-field" 
                    value={settings.hrSettings.standardWorkHours} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, standardWorkHours: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group md:col-span-2">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> آلية احتساب أيام العمل بالشهر</label>
                  <p className="text-xs text-slate-500 mb-4">يستخدم لحساب قيمة ساعة العمل للموظف. يمكنك توحيد الرقم أو تخصيصه لكل شهر.</p>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="workDaysStrategy"
                        value="fixed"
                        className="w-4 h-4 text-primary"
                        checked={!settings.hrSettings.workDaysStrategy || settings.hrSettings.workDaysStrategy === 'fixed'}
                        onChange={() => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysStrategy: 'fixed'}})}
                      />
                      <span className="font-medium text-sm">عدد ثابت لجميع الأشهر</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="workDaysStrategy"
                        value="custom"
                        className="w-4 h-4 text-primary"
                        checked={settings.hrSettings.workDaysStrategy === 'custom'}
                        onChange={() => {
                          const newCustomDays = settings.hrSettings.customWorkDays || DEFAULT_CALENDAR_DAYS;
                          setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysStrategy: 'custom', customWorkDays: newCustomDays}});
                        }}
                      />
                      <span className="font-medium text-sm">تخصيص أيام العمل لكل شهر</span>
                    </label>
                  </div>

                  {(!settings.hrSettings.workDaysStrategy || settings.hrSettings.workDaysStrategy === 'fixed') && (
                    <div className="w-full md:w-1/2">
                      <label className="text-sm font-bold mb-2 block">أيام العمل المعتمدة:</label>
                      <input 
                        type="number" min="1" max="31" className="input-field" 
                        value={settings.hrSettings.workDaysPerMonth || 30} 
                        onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, workDaysPerMonth: Number(e.target.value)}})}
                      />
                    </div>
                  )}

                  {settings.hrSettings.workDaysStrategy === 'custom' && (
                    <div className="mt-6">
                      <div className="mb-4">
                        <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-2">
                          <Calendar size={20} className="text-primary" />
                          تخصيص أيام العمل (أشهر السنة)
                        </h4>
                        <p className="text-sm text-slate-500">قم بتحديد عدد أيام العمل المعتمدة لكل شهر لحساب الراتب بشكل دقيق.</p>
                      </div>
                      
                      <button 
                        className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-slate-700 transition-colors mb-6"
                        onClick={() => setSettings({...settings, hrSettings: {...settings.hrSettings, customWorkDays: DEFAULT_CALENDAR_DAYS}})}
                      >
                        <RotateCcw size={16}/> استخدام التقويم القياسي
                      </button>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-8 gap-x-4">
                        {AR_MONTHS.map((monthName, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <span className="text-sm font-bold text-slate-800 mb-3">{monthName}</span>
                            <div className="flex items-center gap-3 w-full justify-center">
                              <input 
                                type="number" 
                                min="1" max="31" 
                                className="w-[100px] text-center py-2 px-3 text-lg font-bold bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary outline-none shadow-sm"
                                value={settings.hrSettings.customWorkDays?.[index] || 30}
                                onChange={(e) => {
                                  const newDays = [...(settings.hrSettings.customWorkDays || DEFAULT_CALENDAR_DAYS)];
                                  newDays[index] = Number(e.target.value);
                                  setSettings({...settings, hrSettings: {...settings.hrSettings, customWorkDays: newDays}});
                                }}
                              />
                              <span className="text-xs font-bold text-slate-800">يوم</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> رصيد المغادرات الشهري (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-2">الرصيد الشهري المسموح به للمغادرات أو التأخير قبل الخصم.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.monthlyMissionBalanceMinutes} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, monthlyMissionBalanceMinutes: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> الحد الأقصى لرصيد المغادرات الشهري</label>
                  <p className="text-xs text-slate-500 mb-2">يمنع التراكم غير المنطقي للرصيد مستقبلاً.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.maxMonthlyMissionBalanceMinutes || 240} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, maxMonthlyMissionBalanceMinutes: Number(e.target.value)}})}
                  />
                </div>
                
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Calendar size={16} /> بداية دورة الرواتب (اليوم)</label>
                  <p className="text-xs text-slate-500 mb-2">لتحديد بداية ونهاية الشهر المالي (مثال: 1 يعني من 1 إلى 30).</p>
                  <input 
                    type="number" min="1" max="28" className="input-field" 
                    value={settings.hrSettings.salaryCycleStartDay || 1} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, salaryCycleStartDay: Number(e.target.value)}})}
                  />
                </div>
                
                <div className="input-group">
                  <label className="font-bold flex items-center gap-2"><Clock size={16} /> طريقة تقريب الوقت</label>
                  <p className="text-xs text-slate-500 mb-2">كيف يتم تقريب الساعات الإضافية أو دقائق التأخير.</p>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.timeRounding || 'minute'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, timeRounding: e.target.value}})}
                  >
                    <option value="minute">لأقرب دقيقة (دقيق جداً)</option>
                    <option value="15_minutes">لأقرب 15 دقيقة</option>
                    <option value="30_minutes">لأقرب 30 دقيقة</option>
                    <option value="hour">لأقرب ساعة</option>
                  </select>
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
              </div>
            </div>

            {/* 2. قسم الخصومات */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-rose-600">
                <MinusCircle size={20} className="text-rose-500" /> إعدادات الخصومات
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="input-group">
                  <label className="font-bold">طريقة احتساب التأخير / المغادرات</label>
                  <select 
                    className="input-field"
                    value={settings.hrSettings.latenessHandling || 'deduct_from_balance'}
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, latenessHandling: e.target.value}})}
                  >
                    <option value="deduct_from_balance">خصم من الرصيد الشهري أولاً</option>
                    <option value="financial_deduction">خصم مالي مباشر (بدون رصيد)</option>
                    <option value="warning_only">تنبيه فقط (لا يوجد خصم مالي)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="font-bold">فترة السماح للتأخير الصباحي (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-1">دقائق مسموحة يومياً لا تخصم من الرصيد.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.gracePeriodMinutes} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, gracePeriodMinutes: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
                  <label className="font-bold">الحد الأدنى لتسجيل مخالفة تأخير (بالدقائق)</label>
                  <p className="text-xs text-slate-500 mb-1">أكثر من هذا الرقم يسجل النظام مخالفة على الموظف.</p>
                  <input 
                    type="number" min="0" className="input-field" 
                    value={settings.hrSettings.latenessViolationThreshold || 15} 
                    onChange={(e) => setSettings({...settings, hrSettings: {...settings.hrSettings, latenessViolationThreshold: Number(e.target.value)}})}
                  />
                </div>

                <div className="input-group">
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

            {/* 3. قسم العمل الإضافي */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-emerald-600">
                <PlusCircle size={20} className="text-emerald-500" /> إعدادات العمل الإضافي
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
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

              <div className="input-group">
                <label className="font-bold">الحد الأقصى للساعات الإضافية اليومية</label>
                <p className="text-xs text-slate-500 mb-2">لمنع إدخال ساعات إضافية مبالغ فيها بالخطأ.</p>
                <input 
                  type="number" step="0.5" min="0" max="24" className="input-field w-1/2" 
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>
            </div>

            {/* 4. السياسة الافتراضية للعطل الرسمية */}
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-purple-600">
                <Calendar size={20} className="text-purple-500" /> السياسة الافتراضية للعطل الرسمية
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    value={settings.hrSettings.holidayDefaults?.attendanceCompensation || 'alternative_day_and_overtime'}
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
              </div>
            </div>

          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
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

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-border rounded-lg bg-surface-hover">
                <div className="w-48 h-48 mb-4 bg-white rounded-xl shadow-sm border flex items-center justify-center overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', maxWidth: '512px', maxHeight: '512px', objectFit: 'contain' }} />
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
        
        {activeTab === 'gps' && (
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
          )}

        {activeTab === 'statuses' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* حالات الصنف - إنتاج */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> حالات الصنف (إنتاج)</h3>
                <button className="btn-premium-add" onClick={() => addItem('itemStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.itemStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{status}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('itemStatuses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('itemStatuses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* حالات الصنف - عملاء */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> حالات الصنف (عملاء)</h3>
                <button className="btn-premium-add" onClick={() => addItem('salesItemStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.salesItemStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{status}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('salesItemStatuses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('salesItemStatuses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* حالات الطلبيات - إنتاج */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle size={18} className="text-primary" /> حالات الطلبيات (إنتاج)</h3>
                <button className="btn-premium-add" onClick={() => addItem('productionStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.productionStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{status}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('productionStatuses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('productionStatuses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* حالات الطلبيات - عملاء */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-primary-dark"><CheckCircle size={18} /> حالات الطلبيات (العملاء)</h3>
                <button className="btn-premium-add" onClick={() => addItem('salesStatuses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.salesStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg border border-surface-border shadow-sm">
                    <span className="font-medium">{status}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('salesStatuses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('salesStatuses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Users size={18} className="text-primary" /> إدارة أنواع المستخدمين</h3>
              <button className="btn-premium-add" onClick={addUserType}>
                <span>إضافة نوع جديد</span> <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-muted">هنا يمكنك تحديد المسميات الوظيفية والألوان التمييزية لكل نوع من الموظفين.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {(settings.userTypes || []).map((type, idx) => {
                const name = typeof type === 'string' ? type : (type.name || '');
                const color = typeof type === 'string' ? settings.primaryColor : (type.color || settings.primaryColor);
                return (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-xl border border-surface-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="font-bold">{name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editUserType(idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('userTypes', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'jobtitles' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Briefcase size={22} className="text-primary" /> المسميات الوظيفية</h3>
                <button className="btn-premium-add" onClick={() => addItem('jobTitles')}>
                  <span>إضافة مسمى جديد</span> <Plus size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-500">أضف المسميات الوظيفية المتاحة في شركتك لتسهيل تصنيف الموظفين (مثال: مدير مبيعات، محاسب، إلخ).</p>
            </div>

            {(!settings.jobTitles || settings.jobTitles.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Briefcase size={48} className="text-slate-300 mb-4" />
                <h4 className="text-lg font-bold text-slate-600 mb-1">لا توجد مسميات وظيفية مضافة</h4>
                <p className="text-sm text-slate-400">انقر على الزر أعلاه لإضافة أول مسمى وظيفي إلى النظام</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(settings.jobTitles || []).map((title, idx) => (
                  <div key={idx} className="group relative flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Briefcase size={20} />
                      </div>
                      <span className="font-bold text-slate-700">{title}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute left-2 top-1/2 -translate-y-1/2">
                      <button className="btn-premium-edit" title="تعديل" onClick={() => editItem('jobTitles', idx)}><Edit2 size={15} /></button>
                      <button className="btn-premium-delete" title="حذف" onClick={() => removeItem('jobTitles', idx)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Building size={22} className="text-primary" /> الأقسام الوظيفية</h3>
                <button className="btn-premium-add" onClick={() => addItem('departmentsList')}>
                  <span>إضافة قسم جديد</span> <Plus size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-500">أضف الأقسام الرئيسية والإدارات في شركتك لتعيين الموظفين فيها (مثال: قسم المبيعات، التسويق، الموارد البشرية).</p>
            </div>

            {(!settings.departmentsList || settings.departmentsList.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Building size={48} className="text-slate-300 mb-4" />
                <h4 className="text-lg font-bold text-slate-600 mb-1">لا توجد أقسام وظيفية مضافة</h4>
                <p className="text-sm text-slate-400">انقر على الزر أعلاه لإضافة أول قسم وظيفي إلى النظام</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(settings.departmentsList || []).map((dept, idx) => (
                  <div key={idx} className="group relative flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Building size={20} />
                      </div>
                      <span className="font-bold text-slate-700">{dept}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 absolute left-2 top-1/2 -translate-y-1/2">
                      <button className="btn-premium-edit" title="تعديل" onClick={() => editItem('departmentsList', idx)}><Edit2 size={15} /></button>
                      <button className="btn-premium-delete" title="حذف" onClick={() => removeItem('departmentsList', idx)}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'workshifts' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Clock size={22} className="text-primary" /> أوقات وفترات الدوام</h3>
                <button className="premium-add-btn flex items-center gap-2 whitespace-nowrap" onClick={addWorkShift}>
                  <Plus size={18} /> إضافة فترة جديدة
                </button>
              </div>
              <p className="text-sm text-slate-500">أضف فترات الدوام المختلفة لشركتك لتعيينها للموظفين لتنظيم الحضور والانصراف (مثال: الدوام الصباحي 08:00 - 16:00).</p>
            </div>

            {(!settings.workShifts || settings.workShifts.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock size={48} className="text-slate-300 mb-4" />
                <h4 className="text-lg font-bold text-slate-600 mb-1">لا توجد فترات دوام مضافة</h4>
                <p className="text-sm text-slate-400">انقر على الزر أعلاه لإضافة أول فترة دوام إلى النظام</p>
              </div>
            ) : (
              <div className="table-responsive bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="table w-full">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-100">
                      <th className="py-4 px-6 font-bold text-right w-1/3">اسم الفترة</th>
                      <th className="py-4 px-6 font-bold text-right">وقت الحضور</th>
                      <th className="py-4 px-6 font-bold text-right">وقت الانصراف</th>
                      <th className="py-4 px-6 font-bold text-left w-24">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(settings.workShifts || []).map((shift, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Clock size={20} />
                            </div>
                            <span className="font-bold text-slate-800 text-base">{shift.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                            {shift.startTime}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold text-sm border border-rose-100">
                            {shift.endTime}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-left">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button 
                              className="btn-premium-edit" 
                              title="تعديل" 
                              onClick={() => editWorkShift(idx)}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              className="btn-premium-delete" 
                              title="حذف" 
                              onClick={() => removeItem('workShifts', idx)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Home size={18} className="text-primary" /> المستودعات</h3>
                <button className="btn-premium-add" onClick={() => addItem('warehouses')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.warehouses || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('warehouses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('warehouses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> تصنيفات المخزون</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockCategories')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.stockCategories || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockCategories', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockCategories', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Palette size={18} className="text-primary" /> الألوان / المواصفات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockColors')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.stockColors || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockColors', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockColors', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Ruler size={18} className="text-primary" /> الوحدات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockUnits')}><span>إضافة</span> <Plus size={16} /></button>
              </div>
              <div className="space-y-2">
                {(settings.stockUnits || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockUnits', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockUnits', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-8">
            <div className="glass-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Truck className="text-primary" /> أنواع مهام التوصيل</h3>
                <button className="btn-premium-add" onClick={() => addItem('missionTypes')}><span>إضافة نوع</span> <Plus size={16} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(settings.missionTypes || []).map((type, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 group">
                    <span className="font-semibold text-slate-700">{type}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('missionTypes', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionTypes', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-primary" /> حالات الحركة (أثناء التنفيذ)</h3>
                <button className="btn-premium-add" onClick={addMissionStatus}><span>إضافة حالة</span> <Plus size={16} /></button>
              </div>
              <p className="text-muted mb-4 text-sm">هذه الحالات تظهر للموظف لتحديث وضع المهمة الحالي.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(settings.missionStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                      <span className="font-semibold text-slate-700">{status.name}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="icon-btn icon-btn-edit" onClick={() => editMissionStatus(idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionStatuses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'missingpunches' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Fingerprint size={22} className="text-primary" /> إعدادات الختمات الناقصة</h3>
                <p className="text-sm text-slate-500 mt-1">حدد الحد الأقصى لعدد الختمات الناقصة المسموح بها شهرياً لكل موظف.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-4 font-bold cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleMpSort('id')}>
                        <div className="flex items-center gap-2">الرقم الوظيفي {getMpSortIcon('id')}</div>
                      </th>
                      <th className="p-4 font-bold cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleMpSort('name')}>
                        <div className="flex items-center gap-2">اسم الموظف {getMpSortIcon('name')}</div>
                      </th>
                      <th className="p-4 font-bold">المسمى الوظيفي</th>
                      <th className="p-4 font-bold w-48 text-center">الحد الأقصى (شهرياً)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedEmployees().map((emp, idx) => (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-500 font-medium">{emp.id}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {emp.name}
                        </td>
                        <td className="p-4 text-slate-500">{emp.jobTitle || '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <input 
                              type="number" 
                              min="0" 
                              className="w-24 p-2 text-center border border-slate-300 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-lg"
                              value={emp.missingPunchQuota ?? ''}
                              placeholder="غير محدد"
                              onChange={async (e) => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value);
                                const newEmps = [...employees];
                                const index = newEmps.findIndex(x => x.id === emp.id);
                                if (index > -1) {
                                  newEmps[index] = { ...newEmps[index], missingPunchQuota: val };
                                  setEmployees(newEmps);
                                  // Auto save employee quota
                                  await saveEmployee(newEmps[index]);
                                }
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    لا يوجد موظفين حالياً
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'leavepermissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-xl text-slate-800"><Calendar size={22} className="text-primary" /> صلاحيات طلبات الإجازات والمغادرات</h3>
                <p className="text-sm text-slate-500 mt-1">حدد لكل موظف أنواع الطلبات المسموح له بتقديمها.</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-4 font-bold text-center w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleLpSort('id')}>
                        <div className="flex justify-center items-center gap-2">
                          {getLpSortIcon('id')} الرقم الوظيفي
                        </div>
                      </th>
                      <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleLpSort('name')}>
                        <div className="flex justify-end items-center gap-2">
                          {getLpSortIcon('name')} الاسم
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center">الأنواع المسموحة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLpSortedEmployees().map((emp) => {
                      const _allow = emp.allowedLeaveTypes;
                      const allowed = Array.isArray(_allow) ? _allow : (typeof _allow === 'string' ? [_allow] : ALL_LEAVE_TYPES);
                      return (
                        <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-center text-slate-600 font-mono text-sm">{emp.id}</td>
                          <td className="p-4 font-bold text-slate-800">{emp.name}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-3">
                              {ALL_LEAVE_TYPES.map(type => {
                                const isAllowed = allowed.includes(type);
                                return (
                                  <label key={type} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isAllowed ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={isAllowed} 
                                      onChange={() => toggleLeavePermission(emp.id, type)}
                                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium">{type}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div className="p-8 text-center text-slate-500">لا يوجد موظفين حالياً</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notification-settings-shell">
            <div className="notification-settings-hero glass-card">
              <div>
                <h3>إدارة الإشعارات بشكل أبسط</h3>
                <p>من هنا تقدر تحدد سلوك الإشعارات، من يقدر يرسل إشعار خاص، ومن الذي تصله إشعارات كل قسم.</p>
              </div>
              <div className="notification-summary-grid">
                <div className="notification-summary-card">
                  <span className="notification-summary-label">الصوت</span>
                  <strong>{notificationSettings.soundEnabled ? 'مفعل' : 'صامت'}</strong>
                </div>
                <div className="notification-summary-card">
                  <span className="notification-summary-label">المقروءة</span>
                  <strong>{notificationSettings.hideReadNotifications ? 'تختفي بعد القراءة' : 'تبقى ظاهرة'}</strong>
                </div>
                <div className="notification-summary-card">
                  <span className="notification-summary-label">مرسلو الإشعار الخاص</span>
                  <strong>{selectedSenderRoles.length + selectedSenderUsers.length} محدد</strong>
                </div>
                <div className="notification-summary-card">
                  <span className="notification-summary-label">الأقسام المفعلة</span>
                  <strong>{enabledModulesCount} من {notificationSettings.moduleRules.length}</strong>
                </div>
              </div>
            </div>

            <div className="notification-settings-grid">
              <div className="notification-settings-card glass-card">
                <div className="notification-settings-card-head">
                  <div className="notification-settings-icon">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <h4>صوت الإشعارات</h4>
                    <p>تشغيل أو إيقاف صوت التنبيه داخل التطبيق.</p>
                  </div>
                </div>
                <label className="premium-switch">
                  <input
                    type="checkbox"
                    checked={notificationSettings.soundEnabled}
                    onChange={(event) => updateNotificationSettings((current) => ({
                      ...current,
                      soundEnabled: event.target.checked
                    }))}
                  />
                  <span>{notificationSettings.soundEnabled ? 'تشغيل الصوت' : 'تعطيل الصوت'}</span>
                </label>
                <div className="notification-settings-note">
                  {notificationSettings.soundEnabled ? <CheckCircle2 size={16} className="text-success" /> : <VolumeX size={16} className="text-muted" />}
                  <span>{notificationSettings.soundEnabled ? 'سيتم تشغيل نغمة عند وصول إشعار جديد.' : 'لن يتم تشغيل صوت عند وصول الإشعارات.'}</span>
                </div>
              </div>

              <div className="notification-settings-card glass-card">
                <div className="notification-settings-card-head">
                  <div className="notification-settings-icon">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4>الإشعارات المقروءة</h4>
                    <p>تحديد ما إذا كانت تختفي من القائمة بعد الضغط على تمت القراءة.</p>
                  </div>
                </div>
                <label className="premium-switch">
                  <input
                    type="checkbox"
                    checked={notificationSettings.hideReadNotifications}
                    onChange={(event) => updateNotificationSettings((current) => ({
                      ...current,
                      hideReadNotifications: event.target.checked
                    }))}
                  />
                  <span>إخفاء المقروءة</span>
                </label>
                <div className="notification-settings-note">
                  <CheckCircle2 size={16} className="text-primary" />
                  <span>{notificationSettings.hideReadNotifications ? 'الإشعار يختفي فور تعليمه كمقروء.' : 'الإشعار يبقى في القائمة حتى بعد قراءته.'}</span>
                </div>
              </div>
            </div>

            <div className="notification-settings-card glass-card">
              <div className="notification-settings-card-head">
                <div className="notification-settings-icon">
                  <Users size={20} />
                </div>
                <div>
                  <h4>من يقدر يرسل إشعار خاص؟</h4>
                  <p>حدد الأدوار أو الأشخاص الذين يمكنهم إنشاء إشعارات خاصة أو موجهة.</p>
                </div>
              </div>

              <div className="notification-settings-split">
                <div className="notification-settings-block">
                  <span className="notification-block-label">حسب نوع المستخدم</span>
                  <div className="notification-chip-group">
                    {roleOptions.map((role) => (
                      <label
                        key={role.key}
                        className={`notification-choice-chip ${notificationSettings.specialSenders.includes(role.key) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={notificationSettings.specialSenders.includes(role.key)}
                          onChange={() => toggleNotificationSenderRole(role.key)}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="notification-settings-block">
                  <span className="notification-block-label">مستخدمون محددون</span>
                  <div className="notification-chip-group notification-chip-group-scroll">
                    {employees.map((employee) => (
                      <label
                        key={employee.id}
                        className={`notification-choice-chip ${notificationSettings.specialSenderUserIds.includes(employee.id) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={notificationSettings.specialSenderUserIds.includes(employee.id)}
                          onChange={() => toggleNotificationSenderUser(employee.id)}
                        />
                        {employee.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="notification-selection-summary">
                <div>
                  <span className="notification-summary-label">الأدوار المسموح لها</span>
                  <strong>{summarizeLabels(selectedSenderRoles.map((role) => role.label), 'لا يوجد')}</strong>
                </div>
                <div>
                  <span className="notification-summary-label">المستخدمون المسموح لهم</span>
                  <strong>{summarizeLabels(selectedSenderUsers.map((employee) => employee.name), 'لا يوجد')}</strong>
                </div>
              </div>
            </div>

            <div className="notification-modules-section">
              <div className="notification-modules-heading">
                <div>
                  <h3><Bell size={18} className="text-primary" /> إعدادات وصول الإشعارات حسب القسم</h3>
                  <p>افتح القسم الذي تريد تعديله وحدد من تصله إشعاراته بشكل واضح ومباشر.</p>
                </div>
              </div>

              <div className="notification-module-list">
                {notificationSettings.moduleRules.map((rule) => {
                  const isExpanded = expandedModuleKey === rule.moduleKey;
                  const audienceSummary = getModuleAudienceSummary(rule);

                  return (
                    <div
                      key={rule.moduleKey}
                      className={`notification-module-card glass-card ${rule.enabled ? 'enabled' : 'disabled'}`}
                    >
                      <div className="notification-module-top">
                        <button
                          type="button"
                          className="notification-module-trigger"
                          onClick={() => setExpandedModuleKey((current) => current === rule.moduleKey ? null : rule.moduleKey)}
                        >
                          <div className={`notification-module-bar ${rule.enabled ? 'enabled' : 'disabled'}`}></div>
                          <div className="notification-module-copy">
                            <h4>{rule.moduleLabel}</h4>
                            <p>{rule.enabled ? 'القسم مفعل حالياً' : 'القسم متوقف حالياً'}</p>
                          </div>
                          <div className="notification-module-chevron">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        <label className="premium-switch">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(event) => updateNotificationModuleRule(rule.moduleKey, {
                              enabled: event.target.checked
                            })}
                          />
                          <span>{rule.enabled ? 'مفعل' : 'موقوف'}</span>
                        </label>
                      </div>

                      <div className="notification-module-summary">
                        <span>الأدوار: {audienceSummary.rolesText}</span>
                        <span>المستخدمون: {audienceSummary.usersText}</span>
                      </div>

                      {rule.enabled && isExpanded && (
                        <div className="notification-module-body animate-fade-in">
                          <div className="notification-settings-block">
                            <span className="notification-block-label">من تصله الإشعارات حسب النوع</span>
                            <div className="notification-chip-group">
                              {roleOptions.map((role) => (
                                <label
                                  key={`${rule.moduleKey}-${role.key}`}
                                  className={`notification-choice-chip ${rule.visibleRoles.includes(role.key) ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={rule.visibleRoles.includes(role.key)}
                                    onChange={() => toggleNotificationModuleRole(rule.moduleKey, role.key)}
                                  />
                                  {role.label}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="notification-settings-block">
                            <span className="notification-block-label">مستخدمون إضافيون لهذا القسم</span>
                            <div className="notification-chip-group notification-chip-group-scroll">
                              {employees.map((employee) => (
                                <label
                                  key={`${rule.moduleKey}-${employee.id}`}
                                  className={`notification-choice-chip ${rule.visibleUserIds.includes(employee.id) ? 'selected' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={rule.visibleUserIds.includes(employee.id)}
                                    onChange={() => toggleNotificationModuleUser(rule.moduleKey, employee.id)}
                                  />
                                  {employee.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {SHOW_OLD_NOTIFICATIONS && (
              <div className="space-y-8">
            {/* General Notification Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Sound Settings Card */}
              <div className="glass-card p-6 flex flex-col gap-4 border-2 border-primary-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary-light rounded-xl text-primary">
                    <Volume2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">صوت الإشعارات</h3>
                    <p className="text-xs text-muted">التحكم في تنبيهات الصوت</p>
                  </div>
                </div>
                <div className="p-4 bg-surface-hover rounded-xl border border-surface-border flex flex-col gap-4">
                  <label className="premium-switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.soundEnabled}
                      onChange={(event) => updateNotificationSettings((current) => ({
                        ...current,
                        soundEnabled: event.target.checked
                      }))}
                    />
                    <span>{notificationSettings.soundEnabled ? 'تشغيل الصوت' : 'تعطيل الصوت'}</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    {notificationSettings.soundEnabled ? <CheckCircle2 size={16} className="text-success" /> : <VolumeX size={16} className="text-slate-400" />}
                    <span>{notificationSettings.soundEnabled ? 'سيتم تشغيل نغمة عند كل إشعار' : 'وضع الصامت للإشعارات'}</span>
                  </div>
                </div>
              </div>

              {/* Read Behavior Card */}
              <div className="glass-card p-6 flex flex-col gap-4 border-2 border-primary-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary-light rounded-xl text-primary">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">سلوك القراءة</h3>
                    <p className="text-xs text-muted">كيفية التعامل مع الإشعارات</p>
                  </div>
                </div>
                <div className="p-4 bg-surface-hover rounded-xl border border-surface-border flex flex-col gap-4">
                  <label className="premium-switch">
                    <input
                      type="checkbox"
                      checked={notificationSettings.hideReadNotifications}
                      onChange={(event) => updateNotificationSettings((current) => ({
                        ...current,
                        hideReadNotifications: event.target.checked
                      }))}
                    />
                    <span>إخفاء المقروءة</span>
                  </label>
                  <p className="text-xs text-muted leading-relaxed">سيتم إزالة الإشعار من القائمة فور الضغط على "تمت القراءة".</p>
                </div>
              </div>

              {/* Special Senders Card */}
              <div className="glass-card p-6 flex flex-col gap-4 border-2 border-primary-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary-light rounded-xl text-primary">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">مرسلو الإشعارات</h3>
                    <p className="text-xs text-muted">من يمكنه الإرسال للجميع</p>
                  </div>
                </div>
                <div className="space-y-4">
                   <div>
                     <span className="text-xs font-bold text-primary block mb-2">حسب الأدوار:</span>
                     <div className="flex flex-wrap gap-2">
                        {roleOptions.map((role) => (
                          <label key={role.key} className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-bold ${notificationSettings.specialSenders.includes(role.key) ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={notificationSettings.specialSenders.includes(role.key)}
                              onChange={() => toggleNotificationSenderRole(role.key)}
                            />
                            {role.label}
                          </label>
                        ))}
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="pt-4">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                <Bell className="text-primary" /> تفضيلات وصول الإشعارات (الأقسام)
              </h3>
              <p className="text-muted text-sm">حدد من يستلم الإشعارات التلقائية لكل قسم من أقسام النظام</p>
            </div>

            {/* Modules Grid */}
            <div className="grid xl:grid-cols-2 gap-6">
              {notificationSettings.moduleRules.map((rule) => (
                <div key={rule.moduleKey} className="glass-card p-6 flex flex-col gap-6 border border-surface-border hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-10 rounded-full ${rule.enabled ? 'bg-primary' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-lg">{rule.moduleLabel}</h4>
                        <p className="text-xs text-muted">إشعارات قسم {rule.moduleLabel}</p>
                      </div>
                    </div>
                    <label className="premium-switch">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(event) => updateNotificationModuleRule(rule.moduleKey, {
                          enabled: event.target.checked
                        })}
                      />
                      <span>{rule.enabled ? 'مفعل' : 'موقوف'}</span>
                    </label>
                  </div>

                  {rule.enabled && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                          <Users size={14} /> الأدوار التي تستقبل الإشعارات
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {roleOptions.map((role) => (
                            <label key={`${rule.moduleKey}-${role.key}`} className={`px-4 py-2 rounded-xl border cursor-pointer transition-all text-sm font-semibold flex items-center gap-2 ${rule.visibleRoles.includes(role.key) ? 'bg-primary-light text-primary border-primary/20' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={rule.visibleRoles.includes(role.key)}
                                onChange={() => toggleNotificationModuleRole(rule.moduleKey, role.key)}
                              />
                              <div className={`w-2 h-2 rounded-full ${rule.visibleRoles.includes(role.key) ? 'bg-primary' : 'bg-slate-300'}`}></div>
                              {role.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                          <Plus size={14} /> مستخدمون محددون
                        </label>
                        <div className="max-h-40 overflow-y-auto pr-2 flex flex-wrap gap-2">
                          {employees.map((employee) => (
                            <label key={`${rule.moduleKey}-${employee.id}`} className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-medium ${rule.visibleUserIds.includes(employee.id) ? 'bg-primary text-white border-primary' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={rule.visibleUserIds.includes(employee.id)}
                                onChange={() => toggleNotificationModuleUser(rule.moduleKey, employee.id)}
                              />
                              {employee.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* المستودعات */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Home size={18} className="text-primary" /> المستودعات</h3>
                <button className="btn-premium-add" onClick={() => addItem('warehouses')}>
                  <span>إضافة</span> <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {(settings.warehouses || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('warehouses', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('warehouses', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* تصنيفات المخزون */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><ListTodo size={18} className="text-primary" /> تصنيفات المخزون</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockCategories')}>
                  <span>إضافة</span> <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {(settings.stockCategories || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockCategories', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockCategories', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الألوان والمواصفات */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Palette size={18} className="text-primary" /> الألوان / المواصفات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockColors')}>
                  <span>إضافة</span> <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {(settings.stockColors || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockColors', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockColors', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الوحدات */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Ruler size={18} className="text-primary" /> الوحدات</h3>
                <button className="btn-premium-add" onClick={() => addItem('stockUnits')}>
                  <span>إضافة</span> <Plus size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {(settings.stockUnits || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-surface-hover rounded-lg border border-surface-border">
                    <span className="font-medium">{item}</span>
                    <div className="flex gap-2">
                      <button className="icon-btn icon-btn-edit" onClick={() => editItem('stockUnits', idx)}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-delete" onClick={() => removeItem('stockUnits', idx)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="admin-content-layout space-y-8 animate-fade-in">
            <div className="glass-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><Truck className="text-primary" /> أنواع مهام التوصيل</h3>
                {canPerformAction(user, 'ADD', 'SETTINGS', settings) && (
                  <button className="btn-premium-add" onClick={() => addItem('missionTypes')}>
                    <span>إضافة نوع</span> <Plus size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(settings.missionTypes || []).map((type, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 group">
                    <span className="font-semibold text-slate-700">{type}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPerformAction(user, 'EDIT', 'SETTINGS', settings) && (
                        <button className="icon-btn icon-btn-edit" onClick={() => editItem('missionTypes', idx)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canPerformAction(user, 'DELETE', 'SETTINGS', settings) && (
                        <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionTypes', idx)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-primary" /> حالات الحركة (أثناء التنفيذ)</h3>
                <button className="btn-premium-add" onClick={addMissionStatus}>
                  <span>إضافة حالة</span> <Plus size={16} />
                </button>
              </div>
              <p className="text-muted mb-4 text-sm">هذه الحالات تظهر للموظف لتحديث وضع المهمة الحالي.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(settings.missionStatuses || []).map((status, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }}></div>
                      <span className="font-semibold text-slate-700">{status.name}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPerformAction(user, 'EDIT', 'SETTINGS', settings) && (
                        <button className="icon-btn icon-btn-edit" onClick={() => editMissionStatus(idx)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canPerformAction(user, 'DELETE', 'SETTINGS', settings) && (
                        <button className="icon-btn icon-btn-delete" onClick={() => removeItem('missionStatuses', idx)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) }
      </div>
    </div>
  );
};

export default AdminSettings;
