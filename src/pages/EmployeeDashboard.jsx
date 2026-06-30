import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Settings, LogOut, Plus, Globe, Trash2, Edit2, Save, Phone, Clock, Calendar, FileText, X, Camera, Home, ShoppingCart, ShoppingBag, Menu, MoreHorizontal, Eye, Truck, CheckCircle2, Navigation, MapPin, CheckCircle, Info, SunMoon, Mic, MicOff, ClipboardCheck, Layers, Activity, Fingerprint, DollarSign, Folder, PieChart, Users, Filter , ArrowUpDown} from 'lucide-react';
import { getHRAdvances, saveHRAdvance, deleteHRAdvance, deleteReport, addLog, getDepartments, getTasksData, getReports, saveReport, getScoringConfig, getMissions, saveEmployee, updateMissionStatus, getGlobalSettings, getHRLeaves, saveHRLeave, deleteHRLeave, getMissingPunches, saveMissingPunch, deleteMissingPunch, saveHRAttendance, getEmployeeAttendanceByDate, getEmployees, createNotification } from '../store';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { sendWhatsAppNotification } from '../utils/whatsappService';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import AdminProduction from './admin/AdminProduction';
import AdminSales from './admin/AdminSales';
import AdminSupervisorReports from './admin/AdminSupervisorReports';
import AdminSupervisorTasks from './admin/AdminSupervisorTasks';
import AdminLive from './admin/AdminLive';
import { HomeTab } from './employee/tabs/HomeTab';
import { DailyReportTab } from './employee/tabs/DailyReportTab';
import { ReportHistoryTab } from './employee/tabs/ReportHistoryTab';
import { MissionsTab } from './employee/tabs/MissionsTab';
import { MissingPunchesTab } from './employee/tabs/MissingPunchesTab';
import { HRRequestsTab } from './employee/tabs/HRRequestsTab';


import AdminStock from './admin/AdminStock';
import AdminDelivery from './admin/AdminDelivery';
import AdminCustomers from './admin/AdminCustomers';
import AdminReports from './admin/AdminReports';
import AdminTasks from './admin/AdminTasks';
import AdminSettings from './admin/AdminSettings';

import NotificationCenter from '../components/NotificationCenter';
import HeaderUserMenu from '../components/HeaderUserMenu';

const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const notifyHR = async (message) => {
  try {
    const allEmployees = await getEmployees();
    const hrAdmins = allEmployees.filter(emp => emp.role === 'admin' || emp.level === 'admin' || emp.level === 'إدارة');
    for (const admin of hrAdmins) {
      if (admin.phone) {
        await sendWhatsAppNotification(admin.phone, message);
      }
    }
  } catch(e) { console.error('Error notifying HR', e); }
};

const MOBILE_BREAKPOINT = 1024;

const SewingMachineIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 200 200" 
    fill={color} 
    className={className}
  >
    {/* Base plates */}
    <rect x="20" y="160" width="160" height="10" rx="2" />
    <rect x="25" y="150" width="140" height="10" />
    
    {/* Main Body Silhouette */}
    <path d="
      M 140 150 
      V 90 
      C 140 70, 110 60, 80 80 
      C 60 93, 45 85, 45 70 
      V 65 
      H 35 
      V 130 
      C 35 145, 50 145, 50 130 
      V 105 
      C 50 90, 70 85, 90 85 
      C 110 85, 120 90, 120 110 
      V 150 
      Z" 
    />
    
    {/* Left-side thread lever */}
    <path d="M 35 100 C 20 100, 20 90, 35 90 Z" />
    
    {/* Center circle detail */}
    <circle cx="125" cy="95" r="8" fill="transparent" stroke={color} strokeWidth="3" />
    
    {/* Spool pins on top */}
    <rect x="110" y="50" width="6" height="20" rx="3" />
    <path d="M 105 58 H 121 V 61 H 105 Z" />
    <rect x="42" y="55" width="4" height="10" rx="2" />
    
    {/* Thread swoops (using thin paths) */}
    <path d="M 110 55 C 80 60, 60 50, 44 55" fill="none" stroke={color} strokeWidth="1" />
    
    {/* Needle & foot */}
    <rect x="43" y="130" width="3" height="20" />
    <rect x="38" y="147" width="13" height="3" />
    
    {/* Back thread guide */}
    <rect x="33" y="115" width="2" height="15" />
    <circle cx="34" cy="115" r="3" />
    
    {/* Wheel Connector */}
    <rect x="140" y="75" width="10" height="20" />
    
    {/* Hand Wheel (Vertical block) */}
    <rect x="146" y="60" width="10" height="50" rx="5" />
    <rect x="142" y="70" width="4" height="30" />
    
    {/* Crank mechanism */}
    <path d="M 151 85 H 160 V 105 H 180 C 195 105, 195 95, 180 95 H 165 V 80 H 151 Z" />
  </svg>
);

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d * 1000; 
};

const defaultTimePickerOptions = { enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true };
const defaultDatePickerOptions = { dateFormat: 'Y-m-d', locale: Arabic, disableMobile: true };

const LiveClock = () => {
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-left shrink-0">
      <div className="text-xl font-bold tracking-tight text-slate-800 font-mono" dir="ltr">
        {liveTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace('ص','').replace('م','')} 
        <span className="text-xs font-normal ml-1 text-slate-500">{liveTime.getHours() >= 12 ? 'م' : 'ص'}</span>
      </div>
      <div className="text-[11px] text-slate-400 mt-1">
        {liveTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};




const CustomFolder = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="folderShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#126a75" floodOpacity="0.4"/>
      </filter>
      <linearGradient id="folderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#115e59" />
      </linearGradient>
    </defs>
    <g filter="url(#folderShadow)">
      {/* Back flap */}
      <path d="M6 16 C6 13.5 8 11.5 10.5 11.5 L25 11.5 L29 16 L53.5 16 C56 16 58 18 58 20.5 L58 48 C58 50.5 56 52.5 53.5 52.5 L10.5 52.5 C8 52.5 6 50.5 6 48 Z" fill="#0f766e" />
      {/* Paper inside */}
      <path d="M12 18 L52 18 L52 44 L12 44 Z" fill="#ffffff" />
      {/* Front flap (slanted) */}
      <path d="M4 28 C4 25.5 6 23.5 8.5 23.5 L55.5 23.5 C58 23.5 60 25.5 60 28 L56 51 C56 53.5 54 55.5 51.5 55.5 L8.5 55.5 C6 55.5 4 53.5 4 51 Z" fill="url(#folderGrad)" />
    </g>
  </svg>
);

const CustomReport = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="reportShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#reportShadow)">
      {/* Body with fold cut out */}
      <path d="M16 8 C16 5.8 17.8 4 20 4 L38 4 L50 16 L50 56 C50 58.2 48.2 60 46 60 L20 60 C17.8 60 16 58.2 16 56 Z" fill="#f8fafc" stroke="#115e59" strokeWidth="4.5" strokeLinejoin="round" />
      {/* Folded corner */}
      <path d="M38 4 L38 16 L50 16 Z" fill="#14b8a6" stroke="#115e59" strokeWidth="4.5" strokeLinejoin="round" />
      {/* Lines */}
      <line x1="25" y1="32" x2="41" y2="32" stroke="#14b8a6" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="25" y1="44" x2="41" y2="44" stroke="#14b8a6" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  </svg>
);

const CustomCalendar = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <defs>
      <filter id="calShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.3"/>
      </filter>
    </defs>
    <g filter="url(#calShadow)">
      {/* Main body */}
      <rect x="10" y="14" width="44" height="42" rx="6" fill="#f8fafc" />
      {/* Top bar */}
      <path d="M10 20 C10 16.7 12.7 14 16 14 L48 14 C51.3 14 54 16.7 54 20 L54 28 L10 28 Z" fill="#14b8a6" />
      {/* Loops */}
      <rect x="18" y="8" width="6" height="14" rx="3" fill="#0f766e" />
      <rect x="40" y="8" width="6" height="14" rx="3" fill="#0f766e" />
      {/* Grid squares */}
      <rect x="16" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="25" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="34" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="43" y="34" width="6" height="6" rx="1.5" fill="#115e59" />
      
      <rect x="16" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="25" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="34" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
      <rect x="43" y="44" width="6" height="6" rx="1.5" fill="#115e59" />
    </g>
  </svg>
);
const DashboardCard = ({ icon: Icon, title, onClick, disabled, iconType = 'solid', isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // iconType can be: 'solid', 'solid-bg', 'ring'
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: isHovered && !disabled ? '0 12px 30px rgba(26, 141, 155, 0.12)' : '0 4px 15px rgba(0,0,0,0.03)',
        border: '1px solid #f1f5f9',
        padding: isMobile ? '1rem 0.25rem' : '1.75rem 0.5rem 1.25rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: '100%',
        transform: isHovered && !disabled ? 'translateY(-4px)' : 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Dots Background like the mockup */}
      <div style={{ position: 'absolute', top: '15%', right: '15%', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#b2dfdb', opacity: 0.6 }}></div>
      <div style={{ position: 'absolute', top: '25%', right: '28%', width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#80cbc4', opacity: 0.4 }}></div>
      <div style={{ position: 'absolute', bottom: '30%', left: '15%', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#e0f2f1', opacity: 0.8 }}></div>
      <div style={{ position: 'absolute', top: '40%', left: '25%', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#4db6ac', opacity: 0.5 }}></div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: isMobile ? '56px' : '76px',
        height: isMobile ? '56px' : '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.75rem',
      }}>
        
        {/* Background Circle / Ring logic */}
        {iconType === 'custom' && (
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26, 141, 155, 0.08) 0%, rgba(26, 141, 155, 0.02) 60%, transparent 70%)',
          }}></div>
        )}
        {iconType === 'solid' && (
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26, 141, 155, 0.08) 0%, rgba(26, 141, 155, 0.02) 60%, transparent 70%)',
          }}></div>
        )}
        
        {iconType === 'solid-bg' && (
          <div style={{
            position: 'absolute',
            width: '80%',
            height: '80%',
            borderRadius: '50%',
            backgroundColor: '#1a8d9b',
            boxShadow: '0 4px 10px rgba(26, 141, 155, 0.3)'
          }}></div>
        )}

        {iconType === 'ring' && (
          <>
            <div style={{
              position: 'absolute',
              width: '90%',
              height: '90%',
              borderRadius: '50%',
              border: '2px solid rgba(26, 141, 155, 0.15)',
              borderTopColor: 'rgba(26, 141, 155, 0.6)',
              transform: 'rotate(-45deg)'
            }}></div>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(26, 141, 155, 0.05) 0%, transparent 60%)',
            }}></div>
          </>
        )}

        {/* The Icon itself */}
        <div style={{ 
            position: 'relative', 
            zIndex: 10,
            transform: isHovered && !disabled ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.3s ease'
        }}>
          {iconType === 'custom' ? (
             <Icon size={56} style={{ filter: 'none' }} />
          ) : (
             <Icon 
              size={iconType === 'solid-bg' ? 32 : 36} 
              color={iconType === 'solid-bg' ? "#ffffff" : "#126a75"} 
              fill={iconType === 'solid' ? "#1a8d9b" : "none"} 
              strokeWidth={iconType === 'solid-bg' ? 2.5 : 1.5}
              style={{ 
                filter: iconType !== 'solid-bg' ? 'drop-shadow(0 2px 4px rgba(26, 141, 155, 0.2))' : 'none',
                opacity: iconType === 'solid' ? 0.9 : 1
              }} 
            />
          )}
        </div>
      </div>
      
      <span style={{
position: 'relative',
zIndex: 10,
fontWeight: '800',
fontSize: isMobile ? '12px' : '15px',
color: '#126a75',
textAlign: 'center',
whiteSpace: 'normal', 
lineHeight: '1.3',
marginBottom: '0.4rem'
}}>{title}</span>
      
      <div style={{
        width: '20px',
        height: '3px',
        backgroundColor: '#1a8d9b',
        borderRadius: '999px',
        opacity: 0.9,
        transition: 'width 0.3s ease',
        ...(isHovered && !disabled ? { width: '30px' } : {})
      }}></div>
    </button>
  );
};

const EmployeeDashboard = ({ user, onLogout, onUpdateUser }) => {
  const [employees, setEmployees] = useState([]);
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
  const _allowed = user?.allowedLeaveTypes;
  const allowedLeaveTypes = Array.isArray(_allowed) ? _allowed : (typeof _allowed === 'string' ? [_allowed] : ALL_LEAVE_TYPES);

    const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('employeeActiveTab') || 'home';
  });

  useEffect(() => {
    sessionStorage.setItem('employeeActiveTab', activeTab);
  }, [activeTab]);

  const [gpsSettings, setGpsSettings] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isCheckingInOut, setIsCheckingInOut] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('جاري تحديد الموقع...');
  const [isFlash, setIsFlash] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);

  const fetchAddress = () => {
    if (navigator.geolocation) {
      setCurrentAddress('جاري التحديث...');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ar`);
          const data = await res.json();
          if (data && data.address) {
            const parts = [];
            if (data.address.state || data.address.city || data.address.town) parts.push(data.address.state || data.address.city || data.address.town);
            if (data.address.country) parts.push(data.address.country);
            setCurrentAddress(parts.join(' ، ') || 'موقع معروف');
          } else {
            setCurrentAddress('موقع غير معروف');
          }
        } catch (e) {
          setCurrentAddress('الأردن');
        }
      }, () => {
        setCurrentAddress('تعذر تحديد الموقع');
      });
    } else {
      setCurrentAddress('المتصفح لا يدعم تحديد الموقع');
    }
  };

  useEffect(() => {
    fetchAddress();
  }, []);

  useEffect(() => {
    const fetchSettingsAndAttendance = async () => {
      const [settings, emps] = await Promise.all([getGlobalSettings(), getEmployees()]);
      setEmployees(emps);
      setGpsSettings({
        workLocations: settings.workLocations || [],
        // Fallback for old single location if workLocations array is empty
        legacy: { lat: settings.companyLat, lng: settings.companyLng, radius: settings.companyRadius || 500 }
      });

      const todayStr = getLocalDateStr(new Date());
      const att = await getEmployeeAttendanceByDate(user.id, user.employeeId || user.id, todayStr, user.name);
      setTodayAttendance(att);
    };
    fetchSettingsAndAttendance();
  }, [user.id]);

  const handleGPSAction = async (actionType) => {
    if (!navigator.geolocation) {
      Swal.fire('خطأ', 'متصفحك لا يدعم تحديد الموقع.', 'error');
      return;
    }

    setIsCheckingInOut(true);

    const processLocation = async (empLat, empLng) => {
      let isAllowed = false;
      let minDistance = Infinity;
      
      const currentSettings = await getGlobalSettings();
      let locationsToCheck = currentSettings.workLocations || [];
      
      // Fallback to legacy single location if no workLocations defined
      if (locationsToCheck.length === 0 && currentSettings.companyLat) {
        locationsToCheck = [{
          id: 'legacy',
          name: 'المقر الرئيسي',
          lat: currentSettings.companyLat,
          lng: currentSettings.companyLng,
          radius: currentSettings.companyRadius || 500
        }];
      }

      if (locationsToCheck.length === 0) {
        setIsCheckingInOut(false);
        Swal.fire('خطأ', 'الشركة لم تحدد موقع العمل الجغرافي. يرجى من الإدارة الدخول لـ (الإعدادات > إعدادات عامة) وتحديد موقع الشركة على الخريطة.', 'error');
        return;
      }

      // Filter by user's allowed locations
      let allowedLocations = [];
      if (user.workLocationId && user.workLocationId !== '') {
        allowedLocations = locationsToCheck.filter(loc => loc.id === user.workLocationId);
      } else {
        const userAllowedIds = user.allowedWorkLocations || ['all'];
        allowedLocations = userAllowedIds.includes('all') 
          ? locationsToCheck 
          : locationsToCheck.filter(loc => userAllowedIds.includes(loc.id));
      }

      if (allowedLocations.length === 0) {
        setIsCheckingInOut(false);
        Swal.fire('مرفوض', 'الفرع أو الموقع المخصص لك غير موجود، يرجى مراجعة الإدارة.', 'error');
        return;
      }

      let matchedLocationName = 'موقع معتمد';
      for (const loc of allowedLocations) {
        if (!loc.lat || !loc.lng) continue;
        const distance = getDistanceFromLatLonInKm(empLat, empLng, loc.lat, loc.lng);
        if (distance < minDistance) minDistance = distance;
        if (distance <= (loc.radius || 500)) {
          isAllowed = true;
          matchedLocationName = loc.name || 'موقع معتمد';
          break;
        }
      }

      if (!isAllowed) {
        setIsCheckingInOut(false);
        Swal.fire('مرفوض', `أنت بعيد عن مواقع العمل المسموحة لك. أقرب موقع يبعد عنك ${Math.round(minDistance)} متر.`, 'warning');
        return;
      }

      const todayStr = getLocalDateStr(new Date());
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      try {
        // Always fetch the latest record before saving to prevent duplicates from stale state
        const latestAtt = await getEmployeeAttendanceByDate(user.id, user.employeeId || user.id, todayStr, user.name);
        
        if (actionType === 'in') {
          const newRecord = {
            ...(latestAtt || todayAttendance || {}),
            employeeId: user.employeeId || user.id,
            userId: user.id,
            employeeName: user.name,
            date: todayStr,
            timeIn: timeStr,
            status: 'مداوم',
            notes: `دخول جغرافي معتمد (${matchedLocationName})`,
            locationConfirmed: true
          };
          await saveHRAttendance(newRecord);
        } else if (actionType === 'out') {
          const record = {
            ...(latestAtt || todayAttendance || {}),
            employeeId: user.employeeId || user.id,
            userId: user.id,
            employeeName: user.name,
            date: todayStr,
            timeOut: timeStr,
            status: 'مداوم'
          };
          if (!record.timeIn) {
            record.timeIn = timeStr;
            record.notes = `تسجيل خروج بدون دخول مسبق (${matchedLocationName})`;
          } else {
            const existingNotes = record.notes || '';
            const newNote = `خروج جغرافي (${matchedLocationName})`;
            record.notes = existingNotes.includes(newNote) ? existingNotes : (existingNotes ? `${existingNotes} | ${newNote}` : newNote);
          }
          await saveHRAttendance(record);
        }

        const updatedAtt = await getEmployeeAttendanceByDate(user.id, user.employeeId || user.id, todayStr, user.name);
        setTodayAttendance(updatedAtt);
        
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 1000);

        Swal.fire({
          icon: 'success',
          title: 'تم',
          text: actionType === 'in' ? 'تم تسجيل الدخول بنجاح' : 'تم تسجيل الخروج بنجاح',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
      } finally {
        setIsCheckingInOut(false);
      }
    };

    if (currentCoords && (Date.now() - currentCoords.timestamp < 120000)) {
      // Use recently fetched coordinates (instant)
      await processLocation(currentCoords.lat, currentCoords.lng);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCoords({ lat: position.coords.latitude, lng: position.coords.longitude, timestamp: Date.now() });
          processLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          setIsCheckingInOut(false);
          let msg = 'تعذر تحديد موقعك.';
          if (error.code === 1) msg = 'يرجى السماح بصلاحية الموقع من إعدادات المتصفح.';
          else if (error.code === 3) msg = 'انتهى وقت طلب الموقع، يرجى المحاولة مرة أخرى.';
          Swal.fire('خطأ', msg, 'error');
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  const [notificationTarget, setNotificationTarget] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const [departments, setDepartments] = useState({});
  const [tasksData, setTasksData] = useState({});
  const [allReports, setAllReports] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    password: user.password
  });
  const [missions, setMissions] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [myLeaves, setMyLeaves] = useState([]);
  const [myAdvances, setMyAdvances] = useState([]);
  const [missingPunches, setMissingPunches] = useState([]);
  const [showMissingPunchModal, setShowMissingPunchModal] = useState(false);
  const [missingPunchForm, setMissingPunchForm] = useState({ date: '', type: 'دخول', time: '', reason: '' });
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    type: 'سلفة شخصية', date: new Date().toISOString().split('T')[0], amount: '', reason: '', paymentMethod: 'خصم من الراتب القادم', status: 'معلق'
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    type: 'إجازة سنوية', startDate: '', endDate: '', date: '', startTime: '', endTime: '', notes: '', status: 'معلق'
  });

  const { calculatedVacationBalance, calculatedSickBalance } = useMemo(() => {
  let usedVacation = 0;
  let usedSick = 0;
  
  myLeaves.forEach(leave => {
    if (leave.status === 'مرفوض') return; // Do not count rejected leaves
    if (leave.type !== 'إجازة سنوية' && leave.type !== 'إجازة مرضية') return;
    
    let days = 1;
    if (leave.startDate && leave.endDate) {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      if (!isNaN(start) && !isNaN(end)) {
        days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      }
    } else if (leave.date) {
      days = 1;
    }
    
    if (leave.type === 'إجازة سنوية') usedVacation += days;
    if (leave.type === 'إجازة مرضية') usedSick += days;
  });

  const initVacation = parseInt(user.vacationBalance) || 0;
  const initSick = parseInt(user.sickLeaveBalance) || 0;

  return {
    calculatedVacationBalance: initVacation - usedVacation,
    calculatedSickBalance: initSick - usedSick
  };
}, [myLeaves, user.vacationBalance, user.sickLeaveBalance]);

const userRoles = useMemo(() =>
    user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []),
    [user.roles, user.role]
  );
  const isSuperAdmin = user.role === 'admin' || user.level === 'admin' || user.level === 'إدارة' || user.id === 'admin';
  const isSupervisor = user.level === 'supervisor' || user.level === 'مشرف' || user.level === 'مشرف قسم';
  const canViewSupervisorReports = user.hasSupervisorReportsAccess === true || (user.hasSupervisorReportsAccess !== false && isSupervisor);

  const userTitle = useMemo(() => {
    const rawLevel = String(user.level || user.role || '').trim();
    if (!rawLevel) return 'موظف';

    const matchedType = (globalSettings.userTypes || []).find((type) => {
      const typeName = typeof type === 'string' ? type : type.name;
      return typeName === rawLevel;
    });

    if (matchedType) {
      return typeof matchedType === 'string' ? matchedType : matchedType.name;
    }

    if (rawLevel === 'admin' || rawLevel.toLowerCase() === 'management') return 'إدارة';
    if (rawLevel.toLowerCase() === 'supervisor') return 'مشرف';
    if (rawLevel.toLowerCase() === 'employee' || rawLevel.toLowerCase() === 'production') return 'موظف إنتاج';
    return rawLevel;
  }, [globalSettings.userTypes, user.level, user.role]);
  const [selectedDeptKey, setSelectedDeptKey] = useState(userRoles[0] || '');

  const [date, setDate] = useState(getLocalDateStr(new Date()));
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [breakTimeFrom, setBreakTimeFrom] = useState('13:00');
  const [breakTimeTo, setBreakTimeTo] = useState('13:30');
  const [phoneSafe, setPhoneSafe] = useState(false);
  const [phoneUsages, setPhoneUsages] = useState(0);
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState([{ id: 1, name: '', operation: '', count: '', department: userRoles[0] || '', notes: '' }]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showReqFilters, setShowReqFilters] = useState(false);
  const [reqFilterDateFrom, setReqFilterDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return getLocalDateStr(d);
  });
  const [reqFilterDateTo, setReqFilterDateTo] = useState('');
  const [reqFilterStatus, setReqFilterStatus] = useState('');
  const [reqFilterType, setReqFilterType] = useState('');

  const handleEditRequest = (req) => {
    const original = req.originalReq;
    if (req.modelType === 'leave') {
      setLeaveFormData(original);
      setShowLeaveModal(true);
    } else if (req.modelType === 'punch') {
      setMissingPunchForm(original);
      setShowMissingPunchModal(true);
    } else if (req.modelType === 'advance') {
      setAdvanceForm(original);
      setShowAdvanceModal(true);
    } else if (req.modelType === 'report') {
      if (original.supervisorRating || (original.finalRating && original.finalRating !== 'بانتظار المشرف')) {
        MySwal.fire('تنبيه', 'لا يمكن تعديل تقرير العمل لأنه تم تقييمه من قبل المشرف.', 'info');
      } else {
        setDate(original.date);
        setActiveTab('add');
      }
    }
  };

  const handleDeleteRequest = (req) => {
    MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: "هل تريد حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف الطلب',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          if (req.modelType === 'leave') await deleteHRLeave(req.id);
          else if (req.modelType === 'punch') await deleteMissingPunch(req.id);
          else if (req.modelType === 'advance') await deleteHRAdvance(req.id);
          else if (req.modelType === 'report') await deleteReport(req.id);
          
          MySwal.fire('تم الحذف', 'تم حذف الطلب بنجاح.', 'success').then(() => window.location.reload());
        } catch (error) {
          console.error(error);
          MySwal.fire('خطأ', 'حدث خطأ أثناء حذف الطلب', 'error');
        }
      }
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير' : 'مساء الخير';
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleSwitchTab = (e) => {
      const { tab, action, data } = e.detail;
      if (tab) {
        setActiveTab(tab);
        if (action) {
          setNotificationTarget({
            action,
            data,
            nonce: Date.now()
          });
        }
      }
    };
    window.addEventListener('switchAdminTab', handleSwitchTab);
    return () => window.removeEventListener('switchAdminTab', handleSwitchTab);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchData = async () => {
      const [depts, tasks, reports, mData, sData, leavesData, punchesData, advancesData] = await Promise.all([
        getDepartments(),
        getTasksData(),
        getReports(),
        getMissions(),
        getGlobalSettings(),
        getHRLeaves(), 
        getMissingPunches(),
        getHRAdvances()
      ]);
      setDepartments(depts);
      setTasksData(tasks);
      setAllReports(reports);
      setMissions(mData.filter(m => m.assignedEmployeeId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setGlobalSettings(sData);
      setMyLeaves(leavesData.filter(l => String(l.employeeId) === String(user.id) || l.employeeName === user.name));
      setMissingPunches(punchesData.filter(p => String(p.employeeId) === String(user.id) || p.employeeName === user.name));
      setMyAdvances(advancesData.filter(a => String(a.employeeId) === String(user.id) || a.employeeName === user.name));
    };
    fetchData();
  }, [user.id, user.name]);

  const canViewMissions = Boolean(user.hasDeliveryAccess || missions.length > 0);

  useEffect(() => {
    if (activeTab === 'missions' && !canViewMissions) {
      setActiveTab('add');
    }
  }, [activeTab, canViewMissions]);

  useEffect(() => {
    if (activeTab === 'add') {
      const fetchData = async () => {
        const existing = allReports.find(r => String(r.userId || '').trim() === String(user.id || '').trim() && r.date === date);
        const att = await getEmployeeAttendanceByDate(user.id, user.employeeId || user.id, date, user.name);
        
        if (existing) {
          setTimeIn(existing.timeIn || att?.timeIn || '');
          setTimeOut(existing.timeOut || att?.timeOut || '');
          setBreakTimeFrom(existing.breakTimeFrom || '');
          setBreakTimeTo(existing.breakTimeTo || '');
          setPhoneSafe(existing.phoneSafe || false);
          setPhoneUsages(existing.phoneUsages || 0);
          setNotes(existing.notes || '');

          const deptKey = Object.keys(departments).find(k => departments[k] === existing.department) || userRoles[0];
          setSelectedDeptKey(deptKey);

          const loadedTasks = existing.tasks.map((t) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: t.name || '',
            operation: t.operation || '',
            count: t.count || '',
            department: t.department || userRoles[0] || '',
            notes: t.notes || ''
          }));
          setTasks(loadedTasks.length > 0 ? loadedTasks : [{ id: Math.random().toString(36).substr(2, 9), name: '', operation: '', count: '', department: userRoles[0] || '', notes: '' }]);
        } else {
          setTimeIn(att?.timeIn || ''); 
          setTimeOut(att?.timeOut || ''); 
          setBreakTimeFrom('13:00'); setBreakTimeTo('13:30');
          setPhoneSafe(false); setPhoneUsages(0); setNotes('');
          const validRoles = userRoles.filter(r => departments[r]);
          const defaultDept = validRoles[0] || Object.keys(departments)[0] || '';
          setTasks([{ 
            id: Math.random().toString(36).substr(2, 9), 
            name: '', 
            operation: '', 
            count: '', 
            department: defaultDept, 
            notes: '' 
          }]);
        }
      };
      fetchData();
    }
  }, [activeTab, date, allReports, user, departments, userRoles]);

  const deptTasks = tasksData[selectedDeptKey] || [];

  const addTaskRow = () => setTasks([...tasks, { id: Math.random().toString(36).substr(2, 9), name: '', operation: '', count: '', department: selectedDeptKey || userRoles[0] || '', notes: '' }]);
  const removeTaskRow = (id) => { if (tasks.length > 1) setTasks(tasks.filter(t => t.id !== id)); };

  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        let updated = { ...t, ...updates };
        if (updates.department !== undefined && updates.department !== t.department) {
          updated.name = '';
          updated.operation = '';
        }
        if (updates.name !== undefined && updates.name !== t.name) {
          updated.operation = '';
        }
        return updated;
      }
      return t;
    }));
  };

  const handleSaveProfile = async () => {
    if (!profileData.password) {
      MySwal.fire('خطأ', 'كلمة المرور لا يمكن أن تكون فارغة', 'error');
      return;
    }
    const updatedUser = { ...user, ...profileData };
    await saveEmployee(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);
    setShowProfileModal(false);
    MySwal.fire({ title: 'تم التحديث!', text: 'تم تحديث بياناتك بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
  };

  const handleViewReportDetails = (report) => {
    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup-report',
        confirmButton: 'btn-premium-close-teal',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      width: '500px',
      html: `
        <div style="direction: rtl; text-align: right; font-family: 'Rubik', sans-serif; color: #4b5563;">
          <h2 style="text-align: center; color: #374151; font-size: 1.8rem; margin-bottom: 25px; font-weight: 800;">
            تفاصيل التقرير
          </h2>
          
          <div style="margin-bottom: 25px; line-height: 1.8;">
            <div style="display: flex; gap: 8px; justify-content: flex-start; margin-bottom: 4px;">
               <span style="font-weight: 800; color: #1f2937;">التاريخ:</span>
               <span>${report.date}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-start; margin-bottom: 4px;">
               <span style="font-weight: 800; color: #1f2937;">القسم:</span>
               <span>${report.department}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-start; margin-bottom: 4px;">
               <span style="font-weight: 800; color: #1f2937;">وقت الدخول:</span>
               <span>${report.timeIn || '---'}</span>
               <span style="font-weight: 800; color: #1f2937; margin-right: 8px;">| وقت الخروج:</span>
               <span>${report.timeOut || '---'}</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-start;">
               <span style="font-weight: 800; color: #1f2937;">استخدام الهاتف:</span>
               <span>${report.phoneUsages} مرّات (${report.phoneSafe ? 'بالأمانات' : 'بدون أمانات'})</span>
            </div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 20px;">
            <h4 style="font-weight: 800; font-size: 1.2rem; color: #1f2937; margin-bottom: 12px;">الأعمال المنجزة:</h4>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; text-align: center; font-size: 0.95rem;">
              <thead style="background: #f9fafb;">
                <tr>
                  <th style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280; font-weight: 700;">الصنف</th>
                  <th style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280; font-weight: 700;">العملية</th>
                  <th style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280; font-weight: 700;">العدد</th>
                </tr>
              </thead>
              <tbody>
                ${(report.tasks || []).map(t => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${t.name}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${t.operation}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">${t.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <h3 style="font-weight: 800; color: #374151; font-size: 1.4rem;">
              التقييم النهائي الشامل: ${Math.round(report.finalScore)}%
            </h3>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'إغلاق',
    });
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleNotificationNavigate = (target) => {
    if (!target) return;
    const nextTab = target.tab || (
      target.moduleKey === 'reports' ? 'history' :
      target.moduleKey === 'delivery' ? (canViewMissions ? 'missions' : 'add') :
      target.moduleKey === 'sales' ? 'sales' :
      target.moduleKey === 'production' ? 'production' :
      'add'
    );
    setActiveTab(nextTab);
    setIsSidebarOpen(false);
    setNotificationTarget({
      ...target,
      nonce: Date.now()
    });
  };

  const toggleDarkMode = () => setDarkMode((current) => !current);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!tasks.some(t => t.name && t.count)) {
      MySwal.fire('تنبيه', 'يجب إدخال صنف ومهمة واحدة على الأقل قبل الحفظ', 'warning');
      return;
    }

    if (!timeIn || !timeOut) {
      MySwal.fire('تنبيه', 'لا يمكنك تقديم التقرير اليومي، يجب أن يكون هناك تسجيل دخول وخروج مسجل لك في النظام أولاً.', 'warning');
      return;
    }

    // Check if report already exists for today
    const reportExists = allReports.some(
      (report) => String(report.userId || '').trim() === String(user.id || '').trim() && report.date === date
    );

    if (reportExists) {
      const confirm = await MySwal.fire({
        title: 'تنبيه',
        text: 'لقد قمت بتسليم تقرير لهذا اليوم مسبقاً. هل تريد الكتابة فوق التقرير السابق؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، قم بالتحديث',
        cancelButtonText: 'إلغاء'
      });
      if (!confirm.isConfirmed) return;
    }

    setIsSubmitting(true);

    const processSubmission = async () => {
      const scoringConfig = await getScoringConfig();

      const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + (minutes / 60);
      };

      let actualHours = 8; // Default to 8 hours if no time tracking entered
      if (timeIn && timeOut) {
        const tIn = parseTime(timeIn);
        const tOut = parseTime(timeOut);
        let tBreak = 0;
        if (breakTimeFrom && breakTimeTo) {
           tBreak = parseTime(breakTimeTo) - parseTime(breakTimeFrom);
           if (tBreak < 0) tBreak += 24;
        }
        let total = tOut - tIn;
        if (total < 0) total += 24;
        actualHours = Math.max(0.5, total - tBreak);
      }

      const evaluatedTasks = tasks.filter(t => t.name && t.count).map(task => {
        const taskDeptTasks = tasksData[task.department] || [];
        const taskDef = taskDeptTasks.find(d => d.name === task.name);
        
        let min = 0, max = 0, hrMin = 0, hrMax = 0;
        const range = taskDef?.ops[task.operation];
        if (range) {
          [min, max] = range;
          hrMin = range[2] !== undefined ? range[2] : Math.round(range[0] / 9);
          hrMax = range[3] !== undefined ? range[3] : Math.round(range[1] / 9);
        }

        const count = parseInt(task.count) || 0;
        
        const expectedAveragePerHour = (hrMin + hrMax) / 2;
        
        let earnedHours = 0;
        if (expectedAveragePerHour > 0) {
          earnedHours = count / expectedAveragePerHour;
        }

        return { ...task, min, max, hrMin, hrMax, expectedAveragePerHour, earnedHours, departmentName: departments[task.department] };
      });

      let phonePenalty = phoneSafe ? (phoneUsages * scoringConfig.phoneSafePenalty) : scoringConfig.phoneUnsafeBase + (phoneUsages * scoringConfig.phoneUnsafePenalty);
      
      const totalEarnedHours = evaluatedTasks.reduce((acc, curr) => acc + (curr.earnedHours || 0), 0);
      
      let efficiencyScore = 0;
      if (actualHours > 0) {
        efficiencyScore = (totalEarnedHours / actualHours) * 100;
      }

      let finalScore = Math.max(0, efficiencyScore - phonePenalty);
      let finalRating = 'مقبول';
      if (finalScore >= 90) finalRating = 'ممتاز';
      else if (finalScore >= 75) finalRating = 'جيد جداً';
      else if (finalScore >= 60) finalRating = 'جيد';

      const reportDept = departments[selectedDeptKey] || 
                         departments[userRoles.find(r => departments[r])] || 
                         departments[Object.keys(departments)[0]] || 
                         'غير محدد';

      const reportData = {
        userId: user.id,
        userName: user.name,
        date: date,
        timeIn,
        timeOut,
        breakTimeFrom,
        breakTimeTo,
        actualHours,
        department: reportDept,
        phoneSafe,
        phoneUsages,
        notes,
        tasks: evaluatedTasks,
        totalEarnedHours,
        finalScore: 0,
        finalRating: 'بانتظار المشرف',
        status: 'معلق'
      };

      const isNewReport = !allReports.some(
        (report) => String(report.userId || '').trim() === String(user.id || '').trim() && report.date === date
      );

      await saveReport(reportData);
      
      await createNotification({
        settingKey: 'dailyReport',
        targetEmployeeId: user.id,
        moduleKey: 'hr',
        moduleLabel: 'الموارد البشرية',
        title: 'تقرير عمل يومي جديد',
        message: `الموظف: ${user.name}\nالتاريخ: ${date}\nحالة التقرير: معلق (بانتظار تقييم المشرف)`,
        target: { tab: 'history' }
      });

      if (isNewReport) {
        await addLog({
          userName: user.name,
          userId: user.id,
          module: 'تقارير الإنتاج',
          action: 'إضافة',
          details: `إضافة تقرير جديد للموظف ${user.name} بتاريخ ${date}`
        });
      }

      MySwal.fire({ title: 'تم الحفظ!', text: 'تم حفظ التقرير بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });

      const updatedReports = await getReports();
      setAllReports(updatedReports);
    };

    processSubmission();
  };

  const setCurrentTime = (setter) => {
    const now = new Date();
    setter(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  };
  const handleUpdateMissionStatus = async (missionId, status) => {
    const { value: note } = await MySwal.fire({
      title: 'إضافة ملاحظة (اختياري)',
      input: 'text',
      inputPlaceholder: 'اكتب ملاحظة هنا...',
      showCancelButton: true,
      confirmButtonText: 'تحديث الحالة',
      cancelButtonText: 'إلغاء'
    });

    await updateMissionStatus(missionId, status, note || '');
    const mission = missions.find(m => m.id === missionId);

    if (mission) {
      await createNotification({
        settingKey: 'delivery',
        moduleKey: 'delivery',
        moduleLabel: 'التوصيل',
        title: 'تحديث حالة توصيل',
        message: `تم تحديث حالة المهمة الخاصة بك إلى: ${status}`,
        targetEmployeeId: mission.assignedEmployeeId,
        createdById: user.id,
        createdByName: user.name,
        createdByRole: user.level || user.role,
        target: { tab: 'missions' }
      });
    }
    const updatedMissions = await getMissions();
    setMissions(updatedMissions.filter(m => m.assignedEmployeeId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    MySwal.fire({ icon: 'success', title: 'تم تحديث الحالة', timer: 1000, showConfirmButton: false });
  };

  const myReports = allReports.filter(r => String(r.userId || '').trim() === String(user.id || '').trim()).reverse();
  const filteredHistory = myReports.filter(r => {
    const matchFrom = dateFrom ? r.date >= dateFrom : true;
    const matchTo = dateTo ? r.date <= dateTo : true;
    return matchFrom && matchTo;
  });

  useEffect(() => {
    if (!notificationTarget) return;

    if (notificationTarget.moduleKey === 'reports' && myReports.length > 0) {
      const matchedReport = myReports.find((report) => (
        (notificationTarget.reportId && report.id === notificationTarget.reportId) ||
        (
          (!notificationTarget.reportId || !report.id) &&
          (!notificationTarget.reportDate || report.date === notificationTarget.reportDate) &&
          (!notificationTarget.reportUserId || String(report.userId || '').trim() === String(notificationTarget.reportUserId || '').trim()) &&
          (!notificationTarget.reportUserName || report.userName === notificationTarget.reportUserName)
        )
      ));

      if (matchedReport) {
        // setActiveTab('history');
        handleViewReportDetails(matchedReport);
      }
    }
  }, [notificationTarget, myReports]);

  const myMissingPunches = missingPunches.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentMonthPunchesCount = myMissingPunches.filter(p => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    const now = new Date();
    return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
  }).length;
  
  const userMissingPunchQuota = user.allowedMissingPunches ?? 0;
  const remainingPunches = Math.max(0, userMissingPunchQuota - currentMonthPunchesCount);

  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);

  const handleSaveMissingPunch = async (e) => {
    e.preventDefault();
    if (isRequestSubmitting) return;

    if (!missingPunchForm.date || missingPunchForm.date.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء اختيار تاريخ الختمة الناقصة', 'warning');
      return;
    }
    if (!missingPunchForm.time || missingPunchForm.time.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال وقت الختمة الناقصة', 'warning');
      return;
    }
    if (!missingPunchForm.reason || missingPunchForm.reason.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال سبب الختمة الناقصة', 'warning');
      return;
    }

    if (remainingPunches <= 0) {
      MySwal.fire('تنبيه', 'لقد استنفذت رصيدك من الختمات الناقصة لهذا الشهر.', 'warning');
      return;
    }

    const isDuplicate = missingPunches.some(p => p.date === missingPunchForm.date && p.type === missingPunchForm.type);
    if (isDuplicate) {
      MySwal.fire('خطأ', 'لقد قمت بتقديم طلب ختمة ناقصة مسبقاً في نفس التاريخ ونفس النوع!', 'error');
      return;
    }

    setIsRequestSubmitting(true);
    try {
      await saveMissingPunch({
        ...missingPunchForm,
        employeeId: user.id,
        employeeName: user.name,
        department: departments[userRoles[0]] || 'غير محدد',
        status: 'قيد المراجعة'
      });
      
      await createNotification({
        settingKey: 'missingPunch',
        targetEmployeeId: user.id,
        moduleKey: 'hr',
        moduleLabel: 'الموارد البشرية',
        title: 'طلب ختمة ناقصة',
        message: `الموظف: ${user.name}\nالنوع: ${missingPunchForm.type}\nالتاريخ: ${missingPunchForm.date}\nالوقت: ${missingPunchForm.time}`,
        target: { tab: 'hr_requests' }
      });
      
      MySwal.fire('نجاح', 'تم إرسال طلب الختمة الناقصة بنجاح', 'success');
      setShowMissingPunchModal(false);
      setMissingPunchForm({ date: '', type: 'دخول', time: '', reason: '' });
      const updatedPunches = await getMissingPunches();
      setMissingPunches(updatedPunches.filter(m => String(m.employeeId) === String(user.id)));
    } catch (error) {
      console.error(error);
      MySwal.fire('خطأ', 'حدث خطأ أثناء إرسال الطلب', 'error');
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const handleSaveLeaveRequest = async (e) => {
    e.preventDefault();
    if (isRequestSubmitting) return;

    if (!leaveFormData.notes || leaveFormData.notes.trim() === '') {
      MySwal.fire('تنبيه', 'الرجاء إدخال السبب / الملاحظات لإتمام الطلب', 'warning');
      return;
    }
    
    const isDept = ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'بدل عمل إضافي'].includes(leaveFormData.type);
    if (isDept) {
      if (!leaveFormData.date || !leaveFormData.startTime || !leaveFormData.endTime) {
        MySwal.fire('تنبيه', 'الرجاء إدخال التاريخ ووقت البداية والنهاية للمغادرة', 'warning');
        return;
      }
      if (leaveFormData.startTime >= leaveFormData.endTime) {
        MySwal.fire('خطأ', 'لا يمكن أن يكون وقت النهاية قبل أو يساوي وقت البداية. يجب أن يكون نطاق الطلب خلال يوم واحد فقط.', 'error');
        return;
      }
      
      if (leaveFormData.type !== 'بدل عمل إضافي') {
        const [sHours, sMins] = leaveFormData.startTime.split(':').map(Number);
        const [eHours, eMins] = leaveFormData.endTime.split(':').map(Number);
        const diffMins = (eHours * 60 + eMins) - (sHours * 60 + sMins);
        
        if (diffMins > 240) {
          MySwal.fire('خطأ', 'يوجد مشكلة بالوقت المدخل', 'error');
          return;
        }
      } else {
        const [sHours, sMins] = leaveFormData.startTime.split(':').map(Number);
        const [eHours, eMins] = leaveFormData.endTime.split(':').map(Number);
        const diffMins = (eHours * 60 + eMins) - (sHours * 60 + sMins);
        
        if (diffMins > 360) {
          MySwal.fire('خطأ', 'يوجد مشكلة بالوقت المدخل', 'error');
          return;
        }

        let shiftStart = user.shiftStart || '08:00';
        let shiftEnd = user.shiftEnd || '16:00';
        try {
          const settings = await getGlobalSettings();
          if (user.workShiftName && settings.workShifts) {
            const shift = settings.workShifts.find(s => s.name === user.workShiftName);
            if (shift) {
              shiftStart = shift.startTime;
              shiftEnd = shift.endTime;
            }
          }
        } catch(e){}

        const [shiftStartH, shiftStartM] = shiftStart.split(':').map(Number);
        const [shiftEndH, shiftEndM] = shiftEnd.split(':').map(Number);

        const overtimeStartMins = sHours * 60 + sMins;
        const overtimeEndMins = eHours * 60 + eMins;
        const shiftStartMins = shiftStartH * 60 + shiftStartM;
        const shiftEndMins = shiftEndH * 60 + shiftEndM;

        if (overtimeStartMins < shiftEndMins && overtimeEndMins > shiftStartMins) {
          MySwal.fire('خطأ', 'لا يمكن تقديم عمل إضافي خلال أوقات الدوام الرسمي الخاصة بك (' + shiftStart + ' إلى ' + shiftEnd + ')', 'error');
          return;
        }
      }
    } else {
      if (!leaveFormData.startDate || !leaveFormData.endDate) {
        MySwal.fire('تنبيه', 'الرجاء إدخال تاريخ البداية والنهاية للطلب', 'warning');
        return;
      }
      if (new Date(leaveFormData.endDate) < new Date(leaveFormData.startDate)) {
        MySwal.fire('تنبيه', 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو يساويه', 'warning');
        return;
      }
    }

    setIsRequestSubmitting(true);
    try {
      await saveHRLeave({
        ...leaveFormData,
        employeeId: user.id,
        employeeName: user.name,
        department: departments[userRoles[0]] || 'غير محدد'
      });
      
      const settingKeyMap = {
        'إجازة سنوية': 'leaves',
        'إجازة مرضية': 'leaves',
        'إجازة غير مدفوعة': 'leaves',
        'مغادرة خاصة': 'earlyLeave',
        'مغادرة عمل': 'earlyLeave',
        'خروج مبكر': 'earlyLeave',
        'إذن تأخير': 'earlyLeave',
        'بدل عمل إضافي': 'overtime'
      };
      const settingKey = settingKeyMap[leaveFormData.type] || 'leaves';

      await createNotification({
        settingKey,
        targetEmployeeId: user.id,
        moduleKey: 'hr',
        moduleLabel: 'الموارد البشرية',
        title: 'طلب جديد: ' + leaveFormData.type,
        message: `الموظف: ${user.name}\nالملاحظات: ${leaveFormData.notes || 'لا يوجد'}`,
        target: { tab: 'hr_requests' }
      });
      
      MySwal.fire('نجاح', 'تم إرسال الطلب بنجاح', 'success');
      setShowLeaveModal(false);
      setLeaveFormData({ type: allowedLeaveTypes[0] || 'إجازة سنوية', startDate: '', endDate: '', duration: '', notes: '', status: 'معلق' });
      const updatedLeaves = await getHRLeaves();
      setMyLeaves(updatedLeaves.filter(l => String(l.employeeId) === String(user.id) || l.employeeName === user.name));
    } catch (error) {
      console.error(error);
      MySwal.fire('خطأ', 'حدث خطأ أثناء إرسال الطلب', 'error');
    } finally {
      setIsRequestSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {

      case 'home':
        return (
          <HomeTab
            isMobile={isMobile}
            isFlash={isFlash}
            fetchAddress={fetchAddress}
            isCheckingInOut={isCheckingInOut}
            currentAddress={currentAddress}
            LiveClock={LiveClock}
            todayAttendance={todayAttendance}
            handleGPSAction={handleGPSAction}
            DashboardCard={DashboardCard}
            allowedLeaveTypes={allowedLeaveTypes}
            leaveFormData={leaveFormData}
            setLeaveFormData={setLeaveFormData}
            setShowLeaveModal={setShowLeaveModal}
            handleTabChange={handleTabChange}
            user={user}
            setShowAdvanceModal={setShowAdvanceModal}
            canViewMissions={canViewMissions}
            isSupervisor={isSupervisor}
            canViewSupervisorReports={canViewSupervisorReports}
            remainingPunches={remainingPunches}
            setShowMissingPunchModal={setShowMissingPunchModal}
          />
        );

      case 'add':
        return (
          <DailyReportTab
            handleSubmit={handleSubmit}
            allReports={allReports}
            user={user}
            date={date}
            setDate={setDate}
            userRoles={userRoles}
            selectedDeptKey={selectedDeptKey}
            setSelectedDeptKey={setSelectedDeptKey}
            departments={departments}
            setTasks={setTasks}
            timeIn={timeIn}
            timeOut={timeOut}
            breakTimeFrom={breakTimeFrom}
            setBreakTimeFrom={setBreakTimeFrom}
            breakTimeTo={breakTimeTo}
            setBreakTimeTo={setBreakTimeTo}
            phoneSafe={phoneSafe}
            setPhoneSafe={setPhoneSafe}
            phoneUsages={phoneUsages}
            setPhoneUsages={setPhoneUsages}
            tasks={tasks}
            tasksData={tasksData}
            updateTask={updateTask}
            removeTaskRow={removeTaskRow}
            addTaskRow={addTaskRow}
            isMobile={isMobile}
          />
        );

      case 'history':
        return (
          <ReportHistoryTab
            myReports={myReports}
            handleViewReportDetails={handleViewReportDetails}
            isMobile={isMobile}
          />
        );

      case 'missions':
        return (
          <MissionsTab
            missions={missions}
            globalSettings={globalSettings}
            handleUpdateMissionStatus={handleUpdateMissionStatus}
          />
        );

      case 'missing_punches':
        return (
          <MissingPunchesTab
            remainingPunches={remainingPunches}
            userMissingPunchQuota={userMissingPunchQuota}
            currentMonthPunchesCount={currentMonthPunchesCount}
            setShowMissingPunchModal={setShowMissingPunchModal}
            myMissingPunches={myMissingPunches}
          />
        );

      case 'hr_requests':
        return (
          <HRRequestsTab
            user={user}
            myLeaves={myLeaves}
            missingPunches={missingPunches}
            myReports={myReports}
            myAdvances={myAdvances}
            handleViewReportDetails={handleViewReportDetails}
            handleEditRequest={handleEditRequest}
            handleDeleteRequest={handleDeleteRequest}
          />
        );
      case 'sales': return <AdminSales user={user} />;
      case 'production': return <AdminProduction user={user} notificationTarget={notificationTarget} />;
      case 'supervisor-tasks': return <AdminSupervisorTasks user={user} />;
      case 'supervisor-reports': return <AdminSupervisorReports user={user} />;
      case 'live': return <AdminLive user={user} />;

      case 'stock': return <AdminStock user={user} notificationTarget={notificationTarget} />;
      case 'delivery': return <AdminDelivery user={user} notificationTarget={notificationTarget} />;
      case 'customers': return <AdminCustomers user={user} />;
      case 'reports': return <AdminReports notificationTarget={notificationTarget} />;
      case 'production-tasks': return <AdminTasks user={user} />;
      case 'site-settings': return <AdminSettings user={user} />;

      default: return null;
    }
  };

  return (
    <div className="w-full h-full" style={{ maxWidth: '100%' }}>

      {/* Mobile Bottom Nav via CSS classes */}
      <div className="modern-bottom-nav no-print lg:hidden overflow-x-auto hide-scrollbar" style={{ justifyContent: 'flex-start', gap: '1rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className={`modern-nav-item shrink-0 ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
          <Home size={22} /> <span>الرئيسية</span>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      <div className="admin-layout">
        {/* Sidebar */}
        <div className={`admin-sidebar no-print ${isSidebarOpen ? 'open' : ''}`}>
          <div className="flex flex-col items-center text-center mb-4 pt-4 px-4 relative">
            {/* Close button for mobile */}
            <button
              className="lg:hidden absolute left-4 top-4 p-2 text-muted hover:text-danger"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={24} />
            </button>

            <div className="mb-2" style={{ width: '100%', maxWidth: '160px', height: 'auto', padding: '10px' }}>
              <img src="/logo-mrsleep.png" alt="Mr Sleep" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
            <h3 className="text-lg font-bold mb-0">{user.name}</h3>
            <div className="flex flex-col gap-2 mt-3 w-full">
              <div className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                <span className="text-xs font-bold flex items-center gap-1"><Fingerprint size={14} />الرقم الوظيفي</span>
                <span className="text-xs font-extrabold">{user.id}</span>
              </div>
              {userTitle && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                  <span className="text-xs font-bold flex items-center gap-1"><Activity size={14} />المسمى الوظيفي</span>
                  <span className="text-xs font-extrabold">{userTitle}</span>
                </div>
              )}
              {user.directManager && (
                <div className="flex items-center justify-between rounded-xl px-3 py-2 shadow-sm" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                  <span className="text-xs font-bold flex items-center gap-1"><Users size={14} />المدير المباشر</span>
                  <span className="text-xs font-extrabold truncate ml-1" style={{ maxWidth: '55%' }}>{user.directManager}</span>
                </div>
              )}
            </div>
            <p className="text-muted text-xs">حساب موظف</p>
          </div>
            <div className="admin-sidebar-grid">
              <div className={`admin-sidebar-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
                <Home size={22} /> <span>الرئيسية</span>
              </div>
            </div>
          <button onClick={onLogout} className="admin-logout-btn mt-6" style={{ fontFamily: 'Rubik, sans-serif' }}>
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>

        {/* Content Area */}
        <div className="admin-content">
          {/* Beautiful Header Card */}
          <div className="relative mb-8 rounded-[24px] p-6 shadow-sm border border-sky-100 flex flex-col justify-between no-print" style={{ background: 'linear-gradient(to left, #e0f2fe, #f0fdfa)' }}>
              <div className="flex flex-col-reverse sm:flex-row justify-between w-full items-start gap-4 sm:gap-0">
              <div className="flex flex-col text-right mt-2 w-full">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight w-full">{user.name || 'أهلاً بك'}</h2>
                <p className="text-slate-600 font-medium text-sm">نتمنى لك {getGreeting() === 'صباح الخير' ? 'صباحاً مشرقاً ومثمراً' : 'مساءً هادئاً ومريحاً'}</p>
              </div>

              <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start" dir="ltr">
                <NotificationCenter user={user} onNavigate={handleNotificationNavigate} />
                <button type="button" className="header-icon-button bg-white/60 hover:bg-white/80 transition-colors" onClick={() => window.location.reload()} title="تحديث الصفحة">
                  <RefreshCw size={19} className="text-sky-500" />
                </button>
                <button type="button" className="header-icon-button bg-white/60 hover:bg-white/80 transition-colors" onClick={toggleDarkMode} title="الوضع الليلي">
                  <SunMoon size={19} />
                </button>
                <HeaderUserMenu user={user} onLogout={onLogout} onUpdateUser={onUpdateUser} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 w-full relative z-10">
              <div className="flex items-center justify-between rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                <div className="flex items-center gap-2">
                  <Fingerprint size={16} />
                  <span className="text-xs font-bold">الرقم الوظيفي</span>
                </div>
                <span className="text-sm font-extrabold">{user.id}</span>
              </div>
              
              {user.jobTitle && (
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                  <div className="flex items-center gap-2">
                    <Activity size={16} />
                    <span className="text-xs font-bold">المسمى الوظيفي</span>
                  </div>
                  <span className="text-sm font-extrabold">{user.jobTitle}</span>
                </div>
              )}

              {user.directManager && (
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span className="text-xs font-bold">المدير المباشر</span>
                  </div>
                  <span className="text-sm font-extrabold truncate ml-2" style={{ maxWidth: '60%' }}>{user.directManager}</span>
                </div>
              )}
            </div>
          </div>
          
          {renderContent()}
        </div>
      </div>

      {showProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 style={{ marginBottom: 0 }}>تعديل الملف الشخصي</h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowProfileModal(false)}><X size={16} /></button>
            </div>
            <div className="input-group text-center">
              <div className="flex justify-center items-center gap-4 mb-4" style={{ margin: '0 auto' }}>
                <img src="/logo-mrsleep.png" alt="Mr Sleep" style={{ height: '80px', objectFit: 'contain' }} />
              </div>
            </div>
            <div className="input-group">
              <label>الاسم</label>
              <input type="text" className="input-field" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>تغيير كلمة المرور</label>
              <input type="text" className="input-field" value={profileData.password} onChange={(e) => setProfileData({ ...profileData, password: e.target.value })} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveProfile}>حفظ التغييرات</button>
          </div>
        </div>
      )}

      {/* Missing Punch Modal */}
      {showMissingPunchModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">طلب ختمة ناقصة</h3>
              <button type="button" onClick={() => setShowMissingPunchModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleSaveMissingPunch} className="space-y-4">
                <div className="input-group">
                  <label>التاريخ</label>
                  <Flatpickr 
                    value={missingPunchForm.date} 
                    onChange={(dates, dateStr) => setMissingPunchForm({...missingPunchForm, date: dateStr})} 
                    className="input-field w-full bg-white" 
                    options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today' }}
                    placeholder="اختر التاريخ"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="input-group">
                    <label>نوع الختمة</label>
                    <select className="input-field" value={missingPunchForm.type} onChange={e => setMissingPunchForm({...missingPunchForm, type: e.target.value})}>
                      <option value="دخول">دخول</option>
                      <option value="خروج">خروج</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>الوقت</label>
                    <Flatpickr 
                      className="input-field" 
                      value={missingPunchForm.time} 
                      onChange={([d]) => setMissingPunchForm({...missingPunchForm, time: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''})} 
                      options={{ enableTime: true, noCalendar: true, dateFormat: "h:i K", locale: Arabic, disableMobile: true }} 
                      placeholder="اختر الوقت" 
                      required 
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>سبب عدم تسجيل الختمة</label>
                  <textarea rows={2} className="input-field" required placeholder="اذكر السبب بوضوح..." value={missingPunchForm.reason} onChange={e => setMissingPunchForm({...missingPunchForm, reason: e.target.value})}></textarea>
                  <label>نوع الطلب</label>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowMissingPunchModal(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={isRequestSubmitting} className="btn btn-primary">{isRequestSubmitting ? 'Loading...' : 'Submit'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">
                {['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(leaveFormData.type) ? 'تقديم طلب إجازة' : 
                 leaveFormData.type === 'بدل عمل إضافي' ? 'تقديم بدل عمل إضافي' : 'تقديم طلب مغادرة'}
              </h3>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleSaveLeaveRequest} className="space-y-4">
              
              {/* Balances Display */}
              {['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(leaveFormData.type) && (
                <>
                  <div className="flex gap-3 mb-4">
                    {leaveFormData.type === 'إجازة سنوية' && allowedLeaveTypes.includes('إجازة سنوية') && (
                      <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-xs text-blue-600 mb-1 font-bold">رصيد الإجازة السنوية</div>
                        <div className="text-xl font-black text-blue-800">{calculatedVacationBalance} <span className="text-sm font-normal">يوم</span></div>
                      </div>
                    )}
                    {leaveFormData.type === 'إجازة مرضية' && allowedLeaveTypes.includes('إجازة مرضية') && (
                      <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center shadow-sm">
                        <div className="text-xs text-emerald-600 mb-1 font-bold">رصيد الإجازة المرضية</div>
                        <div className="text-xl font-black text-emerald-800">{calculatedSickBalance} <span className="text-sm font-normal">يوم</span></div>
                      </div>
                    )}
                  </div>
                  {leaveFormData.type === 'إجازة غير مدفوعة' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                      <Info size={16} className="text-amber-600 shrink-0" />
                      ملاحظة: الإجازة غير المدفوعة سوف تُخصم من راتبك القادم.
                    </div>
                  )}
                  {leaveFormData.type === 'إجازة مرضية' && (
                    <div className="p-3 rounded-xl mb-4 text-sm font-bold flex gap-2 items-center" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', borderWidth: '1px' }}>
                      <Info size={16} className="shrink-0" style={{ color: '#dc2626' }} />
                      ملاحظة هامة: يرجى إرسال نسخة عن تقرير الإجازة المرضية إلى رقم هاتف الشركة على الواتساب لغايات الموافقة، وإلا فلن يتم قبولها.
                    </div>
                  )}
                </>
              )}
                {leaveFormData.type !== 'بدل عمل إضافي' && (
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={leaveFormData.type} onChange={e=>setLeaveFormData({...leaveFormData, type: e.target.value})} className="input-field" required>
                    {['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر'].includes(leaveFormData.type) ? (

                      allowedLeaveTypes.filter(t => ['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر'].includes(t)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    ) : (
                      allowedLeaveTypes.filter(t => ['إجازة سنوية', 'إجازة مرضية', 'إجازة غير مدفوعة'].includes(t)).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                </div>
                )}
                
                {leaveFormData.type === 'مغادرة خاصة' && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                    <Info size={16} className="text-amber-600 shrink-0" />
                    ملاحظة: المغادرة الخاصة سوف تُخصم من راتبك القادم.
                  </div>
                )}
                {leaveFormData.type === 'بدل عمل إضافي' && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl mb-4 text-sm flex gap-2 items-center">
                    <Info size={16} className="text-blue-600 shrink-0" />
                    ملاحظة: العمل الإضافي يجب أن يكون حصراً خارج أوقات الدوام الرسمي.
                  </div>
                )}
                {['مغادرة خاصة', 'مغادرة عمل', 'إذن تأخير', 'خروج مبكر', 'بدل عمل إضافي'].includes(leaveFormData.type) ? (
                  <div className="space-y-4">
                    <div className="input-group">
                      <label>{leaveFormData.type === 'بدل عمل إضافي' ? 'تاريخ العمل الإضافي' : 'تاريخ المغادرة'}</label>
                      <Flatpickr 
                        value={leaveFormData.date} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, date: dateStr})} 
                        className="input-field w-full bg-white" 
                        options={{ 
                          ...defaultDatePickerOptions,
                          minDate: new Date(new Date().setDate(new Date().getDate() - 2)),
                          maxDate: leaveFormData.type === 'بدل عمل إضافي' ? 'today' : new Date(new Date().setDate(new Date().getDate() + 7))
                        }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="input-group">
                        <label>من الساعة</label>
                        <input 
                          type="time"
                          className="input-field w-full bg-white text-slate-800" 
                          value={leaveFormData.startTime || ''} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, startTime: e.target.value})} 
                          required 
                        />
                      </div>
                      <div className="input-group">
                        <label>إلى الساعة</label>
                        <input 
                          type="time"
                          className="input-field w-full bg-white text-slate-800" 
                          value={leaveFormData.endTime || ''} 
                          onChange={(e) => setLeaveFormData({...leaveFormData, endTime: e.target.value})} 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="input-group">
                      <label>من تاريخ</label>
                      <Flatpickr 
                        value={leaveFormData.startDate} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, startDate: dateStr})} 
                        className="input-field w-full bg-white" 
                        options={{ 
                          ...defaultDatePickerOptions,
                          minDate: new Date(new Date().setDate(new Date().getDate() - 4)),
                          maxDate: leaveFormData.type === 'إجازة مرضية' 
                            ? new Date(new Date().setDate(new Date().getDate() + 2)) 
                            : new Date(new Date().setDate(new Date().getDate() + 30))
                        }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>إلى تاريخ</label>
                      <Flatpickr 
                        value={leaveFormData.endDate} 
                        onChange={(dates, dateStr) => setLeaveFormData({...leaveFormData, endDate: dateStr})} 
                        className="input-field w-full bg-white" 
                        options={{ 
                          ...defaultDatePickerOptions,
                          minDate: new Date(new Date().setDate(new Date().getDate() - 4)),
                          maxDate: leaveFormData.type === 'إجازة مرضية' 
                            ? new Date(new Date().setDate(new Date().getDate() + 2)) 
                            : new Date(new Date().setDate(new Date().getDate() + 30))
                        }}
                        placeholder="اختر التاريخ"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <label>ملاحظات / السبب</label>
                  <textarea rows={2} value={leaveFormData.notes} onChange={e=>setLeaveFormData({...leaveFormData, notes: e.target.value})} className="input-field" required></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="btn btn-outline">إلغاء</button>
                  <button type="submit" disabled={isRequestSubmitting} className="btn btn-primary">{isRequestSubmitting ? 'جاري الحفظ...' : 'حفظ الطلب'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    
      {/* Advance Request Modal */}
      {showAdvanceModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-slate-800">طلب سلفة</h3>
              <button type="button" onClick={() => setShowAdvanceModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();

              if (user.allowAdvances === false) {
                 Swal.fire({
                    icon: 'error',
                    title: 'عذراً',
                    text: 'غير مسموح لك بتقديم طلبات سلف. يرجى مراجعة إدارة الموارد البشرية.',
                    confirmButtonText: 'حسناً'
                 });
                 return;
              }

              const currentDay = new Date().getDate();
              let periodsToCheck = globalSettings?.hrSettings?.advancePeriods || [{fromDay: 15, toDay: 20}];
              
              if (user.useCustomAdvancePeriods && user.customAdvancePeriods && user.customAdvancePeriods.length > 0) {
                 periodsToCheck = user.customAdvancePeriods;
              }

              if (periodsToCheck && periodsToCheck.length > 0) {
                 let isAllowedByPeriod = false;
                 for (const p of periodsToCheck) {
                    if (currentDay >= p.fromDay && currentDay <= p.toDay) {
                       isAllowedByPeriod = true;
                       break;
                    }
                 }
                 
                 if (!isAllowedByPeriod) {
                    const periodsText = periodsToCheck.map(p => `من يوم ${p.fromDay} إلى ${p.toDay}`).join('، أو ');
                    Swal.fire({
                       icon: 'info',
                       title: 'ملاحظة إدارية',
                       text: `تقديم طلبات السلف متاح فقط خلال الفترات التالية من كل شهر: (${periodsText}). شكراً لتفهمك!`,
                       confirmButtonText: 'حسناً'
                    });
                    return;
                 }
              }

              if (!advanceForm.type || advanceForm.type.trim() === '') {
                Swal.fire('تنبيه', 'الرجاء اختيار نوع السلفة', 'warning');
                return;
              }
              if (!advanceForm.date || advanceForm.date.trim() === '') {
                Swal.fire('تنبيه', 'الرجاء اختيار التاريخ', 'warning');
                return;
              }
              if (advanceForm.type !== 'سلفة شخصية' && (!advanceForm.paymentMethod || advanceForm.paymentMethod.trim() === '')) {
                Swal.fire('تنبيه', 'الرجاء اختيار طريقة الصرف', 'warning');
                return;
              }
              if (!advanceForm.amount || advanceForm.amount <= 0) {
                Swal.fire('تنبيه', 'الرجاء إدخال مبلغ صحيح', 'warning');
                return;
              }
              const amountNum = Number(advanceForm.amount);
              const maxPct = globalSettings?.hrSettings?.maxAdvancePercentage ?? 50;
              const maxAmount = ((user.basicSalary || 0) * maxPct) / 100;
              
              if (amountNum > maxAmount) {
                Swal.fire('مرفوض', `لا يمكن أن تتجاوز السلفة ${maxPct}% من الراتب الأساسي (${maxAmount} د.أ)`, 'error');
                return;
              }

              if (!advanceForm.reason || advanceForm.reason.trim() === '') {
                Swal.fire('تنبيه', 'الرجاء إدخال سبب السلفة', 'warning');
                return;
              }

              try {
                await saveHRAdvance({
                  ...advanceForm,
                  amount: amountNum,
                  employeeId: user.id,
                  employeeName: user.name,
                  department: user.department || 'غير محدد'
                }, user);
                await createNotification({
                  settingKey: 'advances',
                  targetEmployeeId: user.id,
                  moduleKey: 'hr',
                  moduleLabel: 'الموارد البشرية',
                  title: 'طلب سلفة جديد',
                  message: `الموظف: ${user.name}\nالنوع: ${advanceForm.type}\nالمبلغ: ${amountNum} د.أ\nالسبب: ${advanceForm.reason}`,
                  target: { tab: 'hr_requests' }
                });
                
                Swal.fire('نجاح', 'تم تقديم طلب السلفة بنجاح وهو بانتظار الموافقة', 'success');
                setShowAdvanceModal(false);
                setAdvanceForm({ type: 'سلفة شخصية', date: new Date().toISOString().split('T')[0], amount: '', reason: '', paymentMethod: 'خصم من الراتب القادم', status: 'معلق' });
              } catch (error) {
                Swal.fire('خطأ', 'حدث خطأ أثناء حفظ الطلب', 'error');
              }
            }}>
              <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>نوع السلفة *</label>
                    <select 
                      value={advanceForm.type} 
                      onChange={e => {
                        const newType = e.target.value;
                        setAdvanceForm({
                          ...advanceForm, 
                          type: newType,
                          paymentMethod: newType === 'سلفة شخصية' ? 'خصم من الراتب القادم' : 'تصرف نقداً'
                        });
                      }} 
                      className="input-field" 
                      required
                    >
                      <option value="سلفة شخصية">سلفة شخصية</option>
                      <option value="سلفة عمل">سلفة عمل</option>
                    </select>
                  </div>
                  
                  <div className="input-group">
                    <label>التاريخ *</label>
                    <Flatpickr 
                      value={advanceForm.date} 
                      onChange={(dates, dateStr) => setAdvanceForm({...advanceForm, date: dateStr})} 
                      className="input-field w-full bg-white" 
                      options={{ ...defaultDatePickerOptions, minDate: 'today' }}
                      placeholder="اختر التاريخ"
                      required
                    />
                  </div>
                  
                  {advanceForm.type === 'سلفة شخصية' ? (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2">
                        <span className="font-bold">توضيح:</span> سيتم خصم قيمة هذه السلفة من الراتب القادم.
                      </div>
                    </div>
                  ) : (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>طريقة الصرف *</label>
                      <select 
                        value={advanceForm.paymentMethod} 
                        onChange={e => setAdvanceForm({...advanceForm, paymentMethod: e.target.value})} 
                        className="input-field" 
                        required
                      >
                        <option value="تصرف نقداً">تصرف نقداً</option>
                        <option value="تصرف على الراتب القادم">تصرف على الراتب القادم</option>
                      </select>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>قيمة السلفة (د.أ) *</label>
                    <input type="number" step="1" min="1" value={advanceForm.amount} onChange={e=>setAdvanceForm({...advanceForm, amount: e.target.value})} className="input-field" required />
                    <p className="text-xs text-gray-500 mt-1">الحد الأقصى المسموح: {(((user.basicSalary || 0) * (globalSettings?.hrSettings?.maxAdvancePercentage ?? 50)) / 100).toFixed(0)} د.أ</p>
                  </div>
                </div>

                <div className="input-group">
                  <label>السبب *</label>
                  <textarea rows={3} value={advanceForm.reason} onChange={e=>setAdvanceForm({...advanceForm, reason: e.target.value})} className="input-field" required></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary px-6">إرسال الطلب</button>
              </div>
            </form>
          
      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '20px',
          right: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0.65rem 1.5rem',
          zIndex: 9999,
        }}>
          {/* Right Icon - Grid (rendered with div dots for 100% compatibility) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '23px', height: '14px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={'r'+i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6' }}></div>
              ))}
            </div>
          </div>
          
          {/* Center Icon - Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f766e' }}>الرئيسية</span>
          </div>

          {/* Left Icon - Grid */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.8, cursor: 'pointer' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '23px', height: '14px' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={'l'+i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#14b8a6' }}></div>
              ))}
            </div>
          </div>
        </div>
      )}
</div>
        </div>
      )}

    </div>

  );
};

export default EmployeeDashboard;
