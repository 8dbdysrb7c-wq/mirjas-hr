import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Clock, Calendar, ClipboardList, UserCheck, UserX, 
  Hourglass, Ban, ArrowRight, CheckCircle, Package, FileText, 
  AlertTriangle, Smile, Meh, Frown, AlertOctagon, HelpCircle, CheckCircle2, ChevronLeft, RefreshCw, ShoppingCart, UserPlus
} from 'lucide-react';
import { getCustomers, saveRepVisit, saveSupervisorTask, getEmployees, saveCustomer, getGlobalSettings, getRepVisits } from '../../../store';
import Flatpickr from 'react-flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import Swal from 'sweetalert2';
import Select from '../../../components/SearchSelect';

export const RepVisitsTab = ({ user, onBack, handleTabChange }) => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [allVisits, setAllVisits] = useState([]);
  const [prevVisitsInfo, setPrevVisitsInfo] = useState(null);
  const [visitType, setVisitType] = useState(''); // first_visit, follow_up
  
  // GPS & Timing
  const [locationStatus, setLocationStatus] = useState('LOADING'); // LOADING, SUCCESS, ERROR
  const [currentAddress, setCurrentAddress] = useState('جاري تحديد موقع الوصول...');
  const [coords, setCoords] = useState(null);
  const [timeIn, setTimeIn] = useState(null);

  // Stepper Fields
  const [status, setStatus] = useState(''); // met, not_found, waiting, failed, postponed
  const [summary, setSummary] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [action, setAction] = useState(''); // none, review, new_appointment, samples, price_offer, waiting_reply
  const [rating, setRating] = useState(''); // very_interested, interested, needs_followup, uninterested, stop
  
  // Sub-fields for Actions/Statuses
  const [followUpDate, setFollowUpDate] = useState(null);
  const [sampleType, setSampleType] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [sampleNotes, setSampleNotes] = useState('');
  const [failedReason, setFailedReason] = useState(''); // for "الزيارة لم تتم"

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCustomer = async () => {
    const settings = await getGlobalSettings();
    const allCustomers = await getCustomers();
    const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];
    const cities = (settings.jordanianCities && settings.jordanianCities.length > 0) ? settings.jordanianCities : JORDANIAN_CITIES;

    const getNextNumber = (type) => {
      const prefix = type === 'مورد' ? 'SUP-' : 'CLI-';
      let maxNum = 0;
      allCustomers.forEach(c => {
        if (c.customerNumber && c.customerNumber.startsWith(prefix)) {
          const num = parseInt(c.customerNumber.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    };

    const initialData = { 
      name: '', phone: '', city: '', location: '', status: 'نشط', 
      type: 'عميل', salesRep: user?.name || 'زبائن الشركة', customerNumber: getNextNumber('عميل') 
    };

    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
             <span>إضافة عميل جديد</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group" style="display: none;">
            <select id="swal-type" class="premium-input">
              <option value="عميل" selected>عميل</option>
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash text-muted"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              الرقم التعريفي
            </label>
            <input id="swal-customerNumber" class="premium-input bg-slate-50 text-slate-500 cursor-not-allowed font-bold" value="${initialData.customerNumber}" disabled>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              الاسم
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: شركة مرجاس للتجارة">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone text-muted"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              رقم الهاتف
            </label>
            <input id="swal-phone" class="premium-input" placeholder="07xxxxxxxx">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: flex-end;">
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map text-muted"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                المدينة
              </label>
              <select id="swal-city" class="premium-input">
                <option value="">اختر المدينة...</option>
                ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group" style="margin-bottom: 0;" id="swal-location-container">
            </div>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase text-muted"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              القطاع
            </label>
            <select id="swal-sector" class="premium-input">
              <option value="">اختر القطاع...</option>
              ${(settings.customerSectors || []).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group" id="swal-salesRep-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              البائع (مندوب الطلبيات) *
            </label>
            <select id="swal-salesRep" class="premium-input">
              <option value="زبائن الشركة" ${(!initialData.salesRep || initialData.salesRep === 'زبائن الشركة') ? 'selected' : ''}>زبائن الشركة</option>
              ${(settings.salesReps || []).filter(rep => rep !== 'زبائن الشركة').map(rep => `<option value="${rep}" ${initialData.salesRep === rep ? 'selected' : ''}>${rep}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity text-muted"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
              حالة الحساب
            </label>
            <select id="swal-status" class="premium-input">
              <option value="نشط" selected>نشط</option>
              <option value="غير نشط">غير نشط</option>
              <option value="عميل محتمل">عميل محتمل</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ العميل',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        const typeSelect = document.getElementById('swal-type');
        const salesRepGroup = document.getElementById('swal-salesRep-group');
        const salesRepSelect = document.getElementById('swal-salesRep');

        const toggleSalesRep = (type) => {
          if (salesRepGroup && salesRepSelect) {
            if (type === 'مورد') {
              salesRepGroup.style.display = 'none';
              salesRepSelect.value = '';
            } else {
              salesRepGroup.style.display = 'block';
            }
          }
        };

        if (typeSelect) {
          toggleSalesRep(typeSelect.value);
          typeSelect.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            toggleSalesRep(selectedType);
            const numberInput = document.getElementById('swal-customerNumber');
            if (numberInput) {
              numberInput.value = getNextNumber(selectedType);
            }
          });
        }

        const citySelect = document.getElementById('swal-city');
        const locationContainer = document.getElementById('swal-location-container');

        const updateLocationField = (selectedCity, currentVal) => {
          if (!locationContainer) return;
          if (selectedCity === 'عمان') {
            const areas = (settings.ammanAreas && settings.ammanAreas.length > 0) ? settings.ammanAreas : [
              'عبدون', 'دير غبار', 'أم أذينة', 'الرابية', 'الشميساني', 'الصويفية', 'الجندويل', 
              'خلدا', 'تلاع العلي', 'أم السماق', 'ضاحية الرشيد', 'ضاحية الحسين', 'مرج الحمام', 
              'الجبيهة', 'شفا بدران', 'أبو نصير', 'طبربور', 'الهاشمي الشمالي', 'الهاشمي الجنوبي', 
              'جبل الحسين', 'جبل عمان', 'جبل اللويبدة', 'الأشرفية', 'الوحدات', 'رأس العين', 
              'وسط البلد', 'النصر', 'القويسمة', 'أبو علندا', 'خريبة السوق', 'المقابلين', 
              'الجويدة', 'سحاب', 'الموقر', 'ماركا الشمالية', 'ماركا الجنوبية', 'طارق', 
              'بسمان', 'البيادر', 'وادي السير', 'اليادودة', 'حسبان', 'البنيات'
            ];
            const optionsHtml = areas.map(area => {
              const isSel = currentVal === area ? 'selected' : '';
              return '<option value="' + area + '" ' + isSel + '>' + area + '</option>';
            }).join('');

            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة *
              </label>
              <select id="swal-location" class="premium-input">
                <option value="">اختر المنطقة...</option>
                ${optionsHtml}
              </select>
            `;
          } else {
            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة
              </label>
              <input id="swal-location" class="premium-input" placeholder="مثال: وسط المدينة..." value="${selectedCity ? currentVal : ''}">
            `;
          }
        };

        if (citySelect) {
          updateLocationField(citySelect.value, '');
          citySelect.addEventListener('change', (e) => {
            updateLocationField(e.target.value, '');
          });
        }
      },
      preConfirm: () => {
        const type = document.getElementById('swal-type').value;
        const name = document.getElementById('swal-name').value;
        const phone = document.getElementById('swal-phone').value;
        const location = document.getElementById('swal-location') ? document.getElementById('swal-location').value : '';
        const city = document.getElementById('swal-city').value;
        const sector = document.getElementById('swal-sector').value;
        const status = document.getElementById('swal-status').value;
        const salesRep = document.getElementById('swal-salesRep').value;
        const customerNumber = document.getElementById('swal-customerNumber').value;

        if (!type) {
          Swal.showValidationMessage('يرجى اختيار النوع (عميل / مورد)');
          return false;
        }
        if (!name) {
          Swal.showValidationMessage('يرجى ملء الاسم');
          return false;
        }
        if (type === 'عميل' && (!salesRep || salesRep === '')) {
          Swal.showValidationMessage('يرجى اختيار البائع (مندوب الطلبيات)');
          return false;
        }

        return { type, customerNumber, name, phone, location, city, sector, status, salesRep, region: city + (location ? ' - ' + location : '') };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const formData = result.value;
        try {
          const newCust = {
            name: formData.name,
            phone: formData.phone || '',
            region: formData.region || '',
            city: formData.city || '',
            location: formData.location || '',
            status: formData.status || 'نشط',
            type: formData.type || 'عميل',
            customerNumber: formData.customerNumber,
            sector: formData.sector || '',
            salesRep: formData.salesRep || '',
            createdAt: new Date().toISOString(),
            createdBy: user?.name || 'المندوب'
          };
          const savedCust = await saveCustomer(newCust);
          setCustomers(prev => [...prev, savedCust]);
          setSelectedCustomer(savedCust);
          Swal.fire({ title: 'تم الحفظ', text: 'تمت إضافة العميل بنجاح!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (err) {
          console.error(err);
          Swal.fire('خطأ', 'حدث خطأ أثناء حفظ العميل', 'error');
        }
      }
    });
  };

  // Load customers and start check-in on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const custs = await getCustomers();
        setCustomers(custs.filter(c => c.status !== 'غير نشط'));
        const vsts = await getRepVisits();
        setAllVisits(vsts || []);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();

    // Record time in
    setTimeIn(new Date());

    // Auto GPS Check-in
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setLocationStatus('SUCCESS');
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`);
          const data = await res.json();
          if (data && data.address) {
            const parts = [];
            if (data.address.state || data.address.city || data.address.town) parts.push(data.address.state || data.address.city || data.address.town);
            if (data.address.suburb || data.address.neighbourhood) parts.push(data.address.suburb || data.address.neighbourhood);
            setCurrentAddress(parts.join(' ، ') || 'موقع الزيارة');
          } else {
            setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } catch (e) {
          setCurrentAddress('عمان، الأردن');
        }
      }, () => {
        setLocationStatus('ERROR');
        setCurrentAddress('تعذر تحديد الموقع الجغرافي');
      });
    } else {
      setLocationStatus('ERROR');
      setCurrentAddress('المتصفح لا يدعم تحديد الموقع');
    }
  }, []);

  // Check previously visited customer details and set defaults
  useEffect(() => {
    if (!selectedCustomer) {
      setPrevVisitsInfo(null);
      setVisitType('');
      return;
    }
    const customerVisits = allVisits.filter(v => String(v.customerId) === String(selectedCustomer.id));
    if (customerVisits.length > 0) {
      const sorted = [...customerVisits].sort((a, b) => new Date(b.timeIn || b.date) - new Date(a.timeIn || a.date));
      const lastVisit = sorted[0];
      
      let lastVisitDateStr = '';
      if (lastVisit.timeIn) {
        const d = new Date(lastVisit.timeIn);
        lastVisitDateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      } else {
        lastVisitDateStr = lastVisit.date || '';
      }

      setPrevVisitsInfo({
        count: customerVisits.length,
        lastDate: lastVisitDateStr,
        lastType: lastVisit.visitType === 'first_visit' ? 'أول زيارة' : 'متابعة'
      });
      setVisitType('follow_up');
    } else {
      setPrevVisitsInfo(null);
      setVisitType('first_visit');
    }
  }, [selectedCustomer, allVisits]);

  // Rules Engine: enforce constraints when Visit Status changes
  useEffect(() => {
    if (!status) return;

    if (status === 'not_found') {
      // Must choose "موعد جديد"
      setAction('new_appointment');
      setRating('');
    } else if (status === 'failed') {
      // Must choose "موعد جديد"
      setAction('new_appointment');
      setRating('');
    } else if (status === 'postponed') {
      // Must choose "موعد جديد" or "موعد مراجعة"
      if (action !== 'new_appointment' && action !== 'review') {
        setAction('review');
      }
      setRating('');
    } else if (status === 'waiting') {
      // Allow only review, waiting_reply, new_appointment
      if (action !== 'review' && action !== 'waiting_reply' && action !== 'new_appointment') {
        setAction('review');
      }
      setRating('');
    } else {
      // met: all actions allowed, default none or keep existing
    }
  }, [status]);

  const handleFinishVisit = async () => {
    if (!selectedCustomer) {
      Swal.fire('تنبيه', 'يرجى اختيار العميل أولاً!', 'warning');
      return;
    }
    if (!visitType) {
      Swal.fire('تنبيه', 'يرجى تحديد نوع الزيارة!', 'warning');
      return;
    }
    if (!status) {
      Swal.fire('تنبيه', 'يرجى تحديد حالة الزيارة!', 'warning');
      return;
    }

    if (!responsibleName.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة مع من تم اللقاء!', 'warning');
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!responsiblePhone.trim() || !phoneRegex.test(responsiblePhone.trim())) {
      Swal.fire('تنبيه', 'يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام!', 'warning');
      return;
    }

    // Validation according to status
    if (status === 'met') {
      if (!rating) {
        Swal.fire('تنبيه', 'يرجى اختيار تقييم العميل قبل إنهاء الزيارة!', 'warning');
        return;
      }
    }

    if (status === 'failed') {
      if (!failedReason.trim()) {
        Swal.fire('تنبيه', 'يرجى كتابة سبب عدم إتمام الزيارة!', 'warning');
        return;
      }
    }

    if (!summary.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة ملخص الزيارة!', 'warning');
      return;
    }

    if (!action) {
      Swal.fire('تنبيه', 'يرجى تحديد الإجراء المطلوب!', 'warning');
      return;
    }

    if (action === 'samples' && !sampleNotes.trim()) {
      Swal.fire('تنبيه', 'يرجى كتابة تفاصيل العينات وملاحظات التسليم!', 'warning');
      return;
    }

    // Validation according to action requirements
    if (['review', 'waiting_reply'].includes(action) || (status === 'postponed')) {
      if (!followUpDate) {
        Swal.fire('تنبيه', 'يرجى تحديد تاريخ المتابعة/المراجعة القادم!', 'warning');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // End timestamp
      const timeOut = new Date();
      const durationMs = timeOut.getTime() - timeIn.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

      // Fetch checkout GPS
      let checkoutGPS = coords;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          checkoutGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn("Could not fetch fresh GPS at checkout, using arrival GPS");
        }
      }

      // Map labels
      const statusLabels = {
        met: 'تم اللقاء',
        not_found: 'العميل غير موجود',
        waiting: 'لا يوجد اهتمام',
        failed: 'الزيارة لم تتم',
        postponed: 'تأجلت الزيارة',
        needs_followup: 'متابعة'
      };

      const actionLabels = {
        new_order: 'طلبية جديدة',
        review: 'موعد مراجعة',
        none: 'لا يوجد',
        samples: 'إرسال عينات',
        price_offer: 'عرض سعر',
        waiting_reply: 'انتظار رد العميل'
      };

      const ratingLabels = {
        very_interested: 'مهتم جداً',
        interested: 'مهتم',
        needs_followup: 'يحتاج متابعة',
        uninterested: 'غير مهتم',
        stop: 'توقف عن التعامل'
      };

      const visitData = {
        userId: user.id,
        userName: user.name,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        visitType,
        visitTypeLabel: visitType === 'first_visit' ? 'أول زيارة' : 'متابعة',
        status,
        statusLabel: statusLabels[status],
        responsibleName,
        responsiblePhone,
        summary,
        region: selectedCustomer.region || selectedCustomer.city || 'غير محددة',
        city: selectedCustomer.city || 'غير محددة',
        sector: selectedCustomer.sector || 'غير محددة',
        date: new Date().toISOString().split('T')[0],
        timeIn: timeIn.toISOString(),
        timeOut: timeOut.toISOString(),
        duration: durationMinutes,
        status: statusLabels[status],
        statusKey: status,
        action: actionLabels[action],
        actionKey: action,
        rating: rating ? ratingLabels[rating] : 'لا يوجد (زيارة لم تتم)',
        ratingKey: rating || '',
        followUpDate: followUpDate ? followUpDate.toISOString().split('T')[0] : null,
        failedReason: status === 'failed' ? failedReason : null,
        samplesData: action === 'samples' ? { type: sampleType, qty: sampleQty, notes: sampleNotes } : null,
        arrivalGPS: coords,
        checkoutGPS
      };

      // 1. Save Visit to Firestore
      await saveRepVisit(visitData);


      Swal.fire({
        title: 'تم إنهاء الزيارة',
        text: 'تم حفظ تقرير الزيارة وموقعك الجغرافي بنجاح. شكراً لك!',
        icon: 'success',
        confirmButtonText: 'ممتاز',
        confirmButtonColor: '#1a8d9b'
      }).then(() => {
        if (onBack) onBack();
        else if (handleTabChange) handleTabChange('home');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('خطأ', 'حدث خطأ أثناء حفظ تقرير الزيارة، يرجى التحقق من اتصالك بالإنترنت والملف.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Unlocked = selectedCustomer && responsibleName.trim() !== '' && responsiblePhone.trim().length >= 10;
  const isStep2Unlocked = isStep1Unlocked && visitType !== '';
  const isStep3Unlocked = isStep2Unlocked && status !== '';
  
  const isSummaryFilled = status === 'failed' ? failedReason.trim() !== '' : summary.trim() !== '';
  const isStep4Unlocked = isStep3Unlocked && isSummaryFilled;
  
  const isActionConfigured = ['review', 'new_appointment', 'waiting_reply'].includes(action) 
    ? (followUpDate !== null) 
    : (action === 'samples' ? sampleNotes.trim() !== '' : action !== '');
  const isStep5Unlocked = isStep4Unlocked && isActionConfigured;

  const isFormComplete = status === 'met' 
    ? (isStep5Unlocked && rating !== '') 
    : (isStep4Unlocked && isActionConfigured);

  return (
    <div style={{
      maxWidth: '540px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      paddingBottom: '120px',
      fontFamily: 'Tajawal, sans-serif'
    }} dir="rtl">
      
      {/* Mobile Top Navbar */}
      <div style={{
        background: 'linear-gradient(135deg, #1a8d9b 0%, #15737e 100%)',
        color: '#ffffff',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 4px 15px rgba(26, 141, 155, 0.15)'
      }}>
        <button 
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ArrowRight size={20} />
        </button>
        <span style={{ fontWeight: '850', fontSize: '18px' }}>تقرير زيارة مندوب مبيعات</span>
        <button 
          onClick={() => handleTabChange && handleTabChange('rep-visits-history')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#ffffff',
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="سجل الزيارات"
        >
          <ClipboardList size={20} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 1. Customer Selection Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '18px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
          border: '1px solid #f1f5f9',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              backgroundColor: '#e6f4f6',
              color: '#1a8d9b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MapPin size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>اختر العميل</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Select 
                    options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.city || c.region || 'بدون منطقة'})`, customer: c }))}
                    value={selectedCustomer ? { value: selectedCustomer.id, label: `${selectedCustomer.name} (${selectedCustomer.city || selectedCustomer.region || 'بدون منطقة'})`, customer: selectedCustomer } : null}
                    onChange={(selected) => setSelectedCustomer(selected ? selected.customer : null)}
                    placeholder="-- ابحث عن العميل --"
                    isSearchable
                    styles={{
                      control: (base) => ({ 
                        ...base, 
                        minHeight: '42px',
                        borderRadius: '12px', 
                        border: '1.5px solid #e2e8f0', 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        backgroundColor: '#ffffff',
                        boxShadow: 'none',
                        '&:hover': { border: '1.5px solid #cbd5e1' }
                      }),
                      menu: (base) => ({ ...base, zIndex: 9999, textAlign: 'right' }),
                      option: (base) => ({ ...base, textAlign: 'right' })
                    }}
                    noOptionsMessage={() => "لا يوجد عملاء بهذا الاسم"}
                  />
                </div>
                <button
                  onClick={handleAddCustomer}
                  style={{
                    backgroundColor: '#1a8d9b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 5px rgba(26, 141, 155, 0.2)'
                  }}
                  title="إضافة عميل جديد"
                >
                  <UserPlus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Smart alert for previously visited customers */}
          {prevVisitsInfo && (
            <div style={{
              backgroundColor: '#f0fdfa',
              border: '1px solid #ccfbf1',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              direction: 'rtl'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0d9488', fontWeight: 'bold', fontSize: '13px' }}>
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                <span>هذا العميل تمت زيارته سابقًا</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px', color: '#0f766e', paddingRight: '20px' }}>
                <div>آخر زيارة: <span style={{ fontWeight: 'bold' }}>{prevVisitsInfo.lastDate}</span></div>
                <div>عدد الزيارات: <span style={{ fontWeight: 'bold' }}>{prevVisitsInfo.count}</span></div>
                <div style={{ gridColumn: 'span 2' }}>نوع الزيارة: <span style={{ fontWeight: 'bold' }}>{prevVisitsInfo.lastType}</span></div>
              </div>
            </div>
          )}

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '14px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '14px',
              opacity: selectedCustomer ? 1 : 0.45,
              pointerEvents: selectedCustomer ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <UserCheck size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>مع من تم اللقاء</label>
              <input 
                type="text"
                placeholder="مع من التقيت؟ (مطلوب)"
                value={responsibleName} 
                onChange={(e) => setResponsibleName(e.target.value)}
                disabled={!selectedCustomer}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  backgroundColor: selectedCustomer ? '#ffffff' : '#f8fafc',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '14px',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '14px',
              opacity: (selectedCustomer && responsibleName.trim() !== '') ? 1 : 0.45,
              pointerEvents: (selectedCustomer && responsibleName.trim() !== '') ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              backgroundColor: '#eff6ff',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>رقم الهاتف (مطلوب)</label>
              <input 
                type="text"
                placeholder="07xxxxxxxx"
                value={responsiblePhone} 
                onChange={(e) => setResponsiblePhone(e.target.value)}
                disabled={!(selectedCustomer && responsibleName.trim() !== '')}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#1e293b',
                  backgroundColor: (selectedCustomer && responsibleName.trim() !== '') ? '#ffffff' : '#f8fafc',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} style={{ color: '#1a8d9b' }} />
              <span><strong style={{ color: '#1e293b' }}>{timeIn ? (() => {
                const d = timeIn;
                const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                let hours = d.getHours();
                const minutes = d.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'م' : 'ص';
                hours = hours % 12;
                hours = hours ? hours : 12; 
                const hoursStr = hours.toString().padStart(2, '0');
                return `${hoursStr}:${minutes} ${ampm} - ${dateStr}`;
              })() : '...'}</strong></span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} style={{ color: locationStatus === 'SUCCESS' ? '#10b981' : '#f59e0b' }} />
              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentAddress}>
                {currentAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Vertical Stepper Container */}
        <div style={{ position: 'relative', paddingRight: '42px' }}>
          
          {/* STEP 1: Visit Type */}
          <div 
            style={{ 
              position: 'relative', 
              marginBottom: '24px',
              opacity: isStep1Unlocked ? 1 : 0.45,
              pointerEvents: isStep1Unlocked ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Step Number Circle */}
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: visitType ? '#1a8d9b' : (isStep1Unlocked ? '#0f766e' : '#cbd5e1'),
              color: isStep1Unlocked ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 10,
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
            }}>1</div>

            {/* Dynamic Connecting Line Segment */}
            <div style={{
              position: 'absolute',
              top: '34px',
              right: '-28px',
              bottom: '-28px',
              width: '3px',
              backgroundColor: isStep2Unlocked ? '#1a8d9b' : '#cbd5e1',
              zIndex: 0,
              transition: 'background-color 0.3s ease'
            }} />

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>نوع الزيارة</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[
                  { key: 'first_visit', label: 'أول زيارة', icon: UserPlus, color: '#10b981' },
                  { key: 'follow_up', label: 'زيارة متابعة', icon: RefreshCw, color: '#3b82f6' }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = visitType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setVisitType(item.key)}
                      disabled={!isStep1Unlocked}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: isActive ? '2.5px solid #14b8a6' : '1.5px solid #e2e8f0',
                        backgroundColor: isActive ? '#1a8d9b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 6px 15px rgba(26, 141, 155, 0.3)' : 'none',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <IconComp size={20} style={{ color: isActive ? '#ffffff' : item.color }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: Visit Status */}
          <div 
            style={{ 
              position: 'relative', 
              marginBottom: '24px',
              opacity: isStep2Unlocked ? 1 : 0.45,
              pointerEvents: isStep2Unlocked ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Step Number Circle */}
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: status ? '#1a8d9b' : (isStep2Unlocked ? '#0f766e' : '#cbd5e1'),
              color: isStep2Unlocked ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 10,
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
            }}>2</div>

            {/* Dynamic Connecting Line Segment */}
            <div style={{
              position: 'absolute',
              top: '34px',
              right: '-28px',
              bottom: '-28px',
              width: '3px',
              backgroundColor: isStep3Unlocked ? '#1a8d9b' : '#cbd5e1',
              zIndex: 0,
              transition: 'background-color 0.3s ease'
            }} />

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>حالة الزيارة</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { key: 'met', label: 'تم اللقاء', icon: UserCheck, color: '#10b981' },
                  { key: 'not_found', label: 'العميل غير موجود', icon: UserX, color: '#64748b' },
                  { key: 'waiting', label: 'لا يوجد اهتمام', icon: Frown, color: '#f59e0b' },
                  { key: 'postponed', label: 'تأجلت الزيارة', icon: Calendar, color: '#3b82f6' },
                  { key: 'needs_followup', label: 'متابعة', icon: RefreshCw, color: '#8b5cf6' }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = status === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setStatus(item.key)}
                      disabled={!isStep2Unlocked}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: isActive ? '2.5px solid #14b8a6' : '1.5px solid #e2e8f0',
                        backgroundColor: isActive ? '#1a8d9b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 6px 15px rgba(26, 141, 155, 0.3)' : 'none',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <IconComp size={20} style={{ color: isActive ? '#ffffff' : item.color }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: Visit Summary / Reason */}
          <div 
            style={{ 
              position: 'relative', 
              marginBottom: '24px',
              opacity: isStep3Unlocked ? 1 : 0.45,
              pointerEvents: isStep3Unlocked ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: isSummaryFilled ? '#1a8d9b' : (isStep3Unlocked ? '#0f766e' : '#cbd5e1'),
              color: isStep3Unlocked ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 10,
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
            }}>3</div>

            {/* Dynamic Connecting Line Segment */}
            <div style={{
              position: 'absolute',
              top: '34px',
              right: '-28px',
              bottom: '-28px',
              width: '3px',
              backgroundColor: isStep4Unlocked ? '#1a8d9b' : '#cbd5e1',
              zIndex: 0,
              transition: 'background-color 0.3s ease'
            }} />

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}>
              {status === 'failed' ? (
                <>
                  <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>سبب عدم إتمام الزيارة</h4>
                  <input
                    type="text"
                    value={failedReason}
                    onChange={(e) => setFailedReason(e.target.value)}
                    disabled={!isStep3Unlocked}
                    placeholder="مثال: العميل مغلق / المسؤول غير موجود..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #ef4444',
                      fontSize: '13px',
                      color: '#1e293b',
                      outline: 'none',
                      backgroundColor: isStep3Unlocked ? '#ffffff' : '#f8fafc'
                    }}
                  />
                </>
              ) : (
                <>
                  <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 4px 0' }}>ملخص الزيارة</h4>
                  <textarea
                    value={summary}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setSummary(e.target.value);
                      }
                    }}
                    placeholder="اكتب ملخصاً عما دار بالزيارة..."
                    disabled={!isStep3Unlocked || status === ''}
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      backgroundColor: (isStep3Unlocked && status !== '') ? '#ffffff' : '#f8fafc'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {summary.length}/500 حرف
                  </div>
                </>
              )}
            </div>
          </div>

          {/* STEP 4: Required Action */}
          <div 
            style={{ 
              position: 'relative', 
              marginBottom: '24px',
              opacity: isStep4Unlocked ? 1 : 0.45,
              pointerEvents: isStep4Unlocked ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '4px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: action ? '#1a8d9b' : (isStep4Unlocked ? '#0f766e' : '#cbd5e1'),
              color: isStep4Unlocked ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 10,
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
            }}>4</div>

            {/* Dynamic Connecting Line Segment */}
            <div style={{
              position: 'absolute',
              top: '34px',
              right: '-28px',
              bottom: '-28px',
              width: '3px',
              backgroundColor: isStep5Unlocked ? '#1a8d9b' : '#cbd5e1',
              zIndex: 0,
              transition: 'background-color 0.3s ease'
            }} />

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: '1px solid #f1f5f9'
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>الإجراء المطلوب</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {[
                  { key: 'new_order', label: 'طلبية جديدة', icon: ShoppingCart, color: '#0ea5e9', allowed: ['met', 'needs_followup'].includes(status) },
                  { key: 'review', label: 'موعد مراجعة', icon: Clock, color: '#3b82f6', allowed: ['met', 'waiting', 'postponed', 'not_found', 'needs_followup'].includes(status) },
                  { key: 'none', label: 'لا يوجد', icon: HelpCircle, color: '#94a3b8', allowed: ['met', 'waiting', 'failed', 'postponed', 'needs_followup'].includes(status) },
                  { key: 'samples', label: 'إرسال عينات', icon: Package, color: '#a855f7', allowed: ['met', 'needs_followup'].includes(status) },
                  { key: 'price_offer', label: 'عرض سعر', icon: FileText, color: '#f59e0b', allowed: ['met', 'needs_followup'].includes(status) },
                  { key: 'waiting_reply', label: 'انتظار رد العميل', icon: Hourglass, color: '#ec4899', allowed: ['met', 'needs_followup'].includes(status) }
                ].map(item => {
                  const IconComp = item.icon;
                  const isActive = action === item.key;
                  const isVisible = item.allowed || status === '';
                  if (!isVisible) return null;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setAction(item.key)}
                      disabled={!isStep4Unlocked}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: isActive ? '2.5px solid #14b8a6' : '1.5px solid #e2e8f0',
                        backgroundColor: isActive ? '#1a8d9b' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 6px 15px rgba(26, 141, 155, 0.3)' : 'none',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <IconComp size={20} style={{ color: isActive ? '#ffffff' : item.color }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Conditional parameters based on Action */}
              {['review', 'new_appointment', 'waiting_reply'].includes(action) && (
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  marginTop: '12px'
                }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    {action === 'waiting_reply' ? 'تاريخ مراجعة الرد الإجباري' : 'تاريخ الموعد القادم'}
                  </label>
                  <Flatpickr
                    options={{
                      locale: Arabic,
                      dateFormat: 'Y-m-d',
                      minDate: 'today'
                    }}
                    value={followUpDate}
                    disabled={!isStep4Unlocked}
                    onChange={(dates) => {
                      if (dates && dates.length > 0) {
                        setFollowUpDate(dates[0]);
                      }
                    }}
                    placeholder="اختر التاريخ من التقويم"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #1a8d9b',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      backgroundColor: isStep4Unlocked ? '#ffffff' : '#f8fafc'
                    }}
                  />
                </div>
              )}

              {action === 'samples' && (
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '12px',
                  marginTop: '12px'
                }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 4px 0' }}>تفاصيل العينات المطلوبة</h4>
                  <textarea
                    value={sampleNotes}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setSampleNotes(e.target.value);
                      }
                    }}
                    placeholder="اكتب تفاصيل العينات والكميات المطلوبة وعنوان التسليم هنا..."
                    disabled={!isStep4Unlocked}
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      backgroundColor: isStep4Unlocked ? '#ffffff' : '#f8fafc'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {sampleNotes.length}/500 حرف
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 5: Customer Rating */}
          {(status === 'met' || status === '') && (
            <div 
              style={{ 
                position: 'relative', 
                marginBottom: '24px',
                opacity: (status === 'met' && isStep5Unlocked) ? 1 : 0.45,
                pointerEvents: (status === 'met' && isStep5Unlocked) ? 'auto' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'absolute',
                right: '-42px',
                top: '4px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: rating ? '#1a8d9b' : ((status === 'met' && isStep5Unlocked) ? '#0f766e' : '#cbd5e1'),
                color: (status === 'met' && isStep5Unlocked) ? '#ffffff' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '13px',
                zIndex: 10,
                boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
              }}>5</div>

              {/* Dynamic Connecting Line Segment */}
              <div style={{
                position: 'absolute',
                top: '34px',
                right: '-28px',
                bottom: '-28px',
                width: '3px',
                backgroundColor: isFormComplete ? '#10b981' : '#cbd5e1',
                zIndex: 0,
                transition: 'background-color 0.3s ease'
              }} />

              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                border: '1px solid #f1f5f9'
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: '850', color: '#1e293b', margin: '0 0 12px 0' }}>تقييم العميل</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'very_interested', label: 'مهتم جداً', icon: Smile, color: '#10b981' },
                    { key: 'interested', label: 'مهتم', icon: Smile, color: '#3b82f6' },
                    { key: 'needs_followup', label: 'يحتاج متابعة', icon: Meh, color: '#f59e0b' },
                    { key: 'uninterested', label: 'غير مهتم', icon: Frown, color: '#ef4444' },
                    { key: 'stop', label: 'توقف عن التعامل', icon: AlertOctagon, color: '#b91c1c' }
                  ].map(item => {
                    const IconComp = item.icon;
                    const isActive = rating === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setRating(item.key)}
                        disabled={!(status === 'met' && isStep5Unlocked)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '12px',
                          border: isActive ? '2.5px solid #14b8a6' : '1.5px solid #e2e8f0',
                          backgroundColor: isActive ? '#1a8d9b' : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingRight: '12px',
                          boxShadow: isActive ? '0 6px 15px rgba(26, 141, 155, 0.3)' : 'none',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <IconComp size={18} style={{ color: isActive ? '#ffffff' : item.color }} />
                        <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Submission Button */}
          <div 
            style={{ 
              position: 'relative',
              opacity: isFormComplete ? 1 : 0.45,
              pointerEvents: isFormComplete ? 'auto' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              right: '-42px',
              top: '12px',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: isFormComplete ? '#10b981' : '#cbd5e1',
              color: isFormComplete ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 10,
              boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
            }}>{status === 'met' ? '6' : '5'}</div>

            <button
              onClick={handleFinishVisit}
              disabled={isSubmitting || !isFormComplete}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: isSubmitting ? '#a7f3d0' : (isFormComplete ? '#10b981' : '#cbd5e1'),
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '16px',
                cursor: (isSubmitting || !isFormComplete) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isFormComplete ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? (
                <>جاري الحفظ...</>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>إنهاء الزيارة وحفظ التقرير</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
export default RepVisitsTab;
