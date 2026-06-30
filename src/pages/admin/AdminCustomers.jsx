import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, UserPlus, Phone, User as UserIcon, X, ArrowUpDown } from 'lucide-react';
import { getCustomers, saveCustomer, deleteCustomer, isAdmin, getGlobalSettings, canPerformAction, addLog } from '../../store';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const AdminCustomers = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'customerNumber', direction: 'asc' });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'المفرق', 'عجلون', 'جرش', 'البلقاء', 'مأدبا', 'الكرك', 'الطفيلة', 'معان', 'العقبة'];

  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [globalSettings, setGlobalSettings] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [custs, settings] = await Promise.all([
      getCustomers(),
      getGlobalSettings()
    ]);
    setCustomers(custs);
    setGlobalSettings(settings);
    setLoading(false);
  };

  useEffect(() => {
    const updateExistingCustomers = async () => {
      if (customers.length > 0) {
        const toUpdate = customers.filter(c => !c.customerNumber);
        if (toUpdate.length > 0) {
          let maxNum = 0;
          customers.forEach(c => {
            if (c.customerNumber && c.customerNumber.startsWith('CLI-')) {
              const num = parseInt(c.customerNumber.replace('CLI-', ''), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          });
          
          toUpdate.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
          
          for (const c of toUpdate) {
            maxNum++;
            const newNum = `CLI-${String(maxNum).padStart(4, '0')}`;
            await saveCustomer({ ...c, customerNumber: newNum });
          }
          fetchData();
        }
      }
    };
    updateExistingCustomers();
  }, [customers]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenModal = (customer = null) => {
    const isEdit = !!customer;
    let customerNumber = customer?.customerNumber || '';

    if (!isEdit) {
      let maxNum = 0;
      customers.forEach(c => {
        if (c.customerNumber && c.customerNumber.startsWith('CLI-')) {
          const num = parseInt(c.customerNumber.replace('CLI-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      customerNumber = `CLI-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const initialData = isEdit ? { ...customer, customerNumber } : { name: '', phone: '', city: '', location: '', status: 'نشط', customerNumber };

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false, // We use our custom header
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
             <span>${isEdit ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash text-muted"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              رقم العميل
            </label>
            <input id="swal-customerNumber" class="premium-input bg-slate-50 text-slate-500 cursor-not-allowed font-bold" value="${initialData.customerNumber}" disabled>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              اسم العميل
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: شركة مرجاس للتجارة" value="${initialData.name}">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone text-muted"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              رقم الهاتف
            </label>
            <input id="swal-phone" class="premium-input" placeholder="07xxxxxxxx" value="${initialData.phone || ''}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: flex-end;">
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map text-muted"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                المدينة
              </label>
              <select id="swal-city" class="premium-input">
                <option value="">اختر المدينة...</option>
                ${JORDANIAN_CITIES.map(city => `<option value="${city}" ${initialData.city === city ? 'selected' : ''}>${city}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة
              </label>
              <input id="swal-location" class="premium-input" placeholder="مثال: خلدا، شارع المدينة..." value="${initialData.location || ''}">
            </div>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase text-muted"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              القطاع
            </label>
            <select id="swal-sector" class="premium-input">
              <option value="">اختر القطاع...</option>
              ${(globalSettings.customerSectors || []).map(s => `<option value="${s}" ${initialData.sector === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity text-muted"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
              حالة العميل
            </label>
            <select id="swal-status" class="premium-input">
              <option value="نشط" ${(!initialData.status || initialData.status === 'نشط') ? 'selected' : ''}>نشط</option>
              <option value="غير نشط" ${initialData.status === 'غير نشط' ? 'selected' : ''}>غير نشط</option>
              <option value="عميل محتمل" ${initialData.status === 'عميل محتمل' ? 'selected' : ''}>عميل محتمل</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'تحديث البيانات' : 'حفظ العميل',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      preConfirm: () => {
        const name = document.getElementById('swal-name').value;
        const phone = document.getElementById('swal-phone').value;
        const location = document.getElementById('swal-location').value;
        const city = document.getElementById('swal-city').value;
        const sector = document.getElementById('swal-sector').value;
        const status = document.getElementById('swal-status').value;
        if (!name) {
          Swal.showValidationMessage('يرجى ملء اسم العميل');
          return false;
        }
        if (!phone || phone.trim().length !== 10 || isNaN(phone.trim())) {
          Swal.showValidationMessage('يرجى إدخال رقم هاتف يتكون من 10 أرقام حصراً');
          return false;
        }
        if (!city) {
          Swal.showValidationMessage('يرجى اختيار المدينة');
          return false;
        }
        if (!location) {
          Swal.showValidationMessage('يرجى إدخال المنطقة');
          return false;
        }
        if (!sector) {
          Swal.showValidationMessage('يرجى اختيار القطاع');
          return false;
        }

        return { name, phone: phone.trim(), city, location, sector, status, customerNumber: initialData.customerNumber, id: isEdit ? customer.id : null };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await saveCustomer(result.value);
        if (res) {
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'العملاء',
            action: isEdit ? 'تعديل' : 'إضافة',
            details: `${isEdit ? 'تعديل بيانات' : 'إضافة'} العميل: ${result.value.name}`
          });
          Swal.fire({
            title: isEdit ? 'تم التحديث' : 'تمت الإضافة',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          fetchData();
        }
      }
    });
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
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
    });

    if (result.isConfirmed) {
      const customerToDelete = customers.find(c => c.id === id);
      await deleteCustomer(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'العملاء',
        action: 'حذف',
        details: `حذف العميل: ${customerToDelete?.name || id}`
      });
      Swal.fire({
        title: 'تم الحذف!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredCustomers = sortedCustomers.filter(c => {
    const nameMatch = (c.name || '').toLowerCase().includes(searchName.toLowerCase());
    const locationMatch = (c.location || '').toLowerCase().includes(searchLocation.toLowerCase());
    const phoneMatch = (c.phone || '').includes(searchName); // Search by phone in the name box is also common
    const statusMatch = filterStatus ? c.status === filterStatus : true;
    const sectorMatch = filterSector ? c.sector === filterSector : true;
    const cityMatch = filterCity ? c.city === filterCity : true;
    
    return (nameMatch || phoneMatch) && locationMatch && statusMatch && sectorMatch && cityMatch;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="text-primary" /> إدارة العملاء والموردين
          </h2>
          <p className="text-muted">إضافة وتعديل بيانات العملاء والموردين للطلبيات</p>
        </div>
        {canPerformAction(user, 'ADD', 'CUSTOMERS', globalSettings) && (
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenModal()} 
            disabled={loading}
            style={loading ? {opacity: 0.6, cursor: 'not-allowed'} : {}}
          >
            <Plus size={18} /> إضافة عميل جديد
          </button>
        )}
      </div>

      <div className="glass-panel mb-4 no-print flex justify-between items-center flex-wrap gap-3" style={{ padding: '0.8rem 1rem' }}>
        <div className="flex items-center gap-3 w-full md:max-w-md">
          <Search className="text-muted" size={20} />
          <input 
            type="text" 
            placeholder="البحث باسم العميل أو رقم الهاتف..." 
            className="input-field flex-1" 
            style={{ marginBottom: 0 }}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
            onClick={() => setShowFilterModal(true)}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '15px',
              border: 'none',
              color: 'white',
              backgroundColor: 'var(--primary)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span>تصفية</span>
            {(filterStatus || filterSector || filterCity) && (
              <span className="bg-white text-primary rounded-full px-2 py-0.5 text-[0.7rem] font-bold mr-1">نشط</span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">جاري التحميل...</div>
      ) : (
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('customerNumber')} className="cursor-pointer hover:text-primary transition-colors" style={{ width: '100px' }}>
                  <div className="flex items-center gap-1">الرقم <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">اسم العميل <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('phone')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">رقم التلفون <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('city')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">المدينة <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('location')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">العنوان / المنطقة <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('sector')} className="cursor-pointer hover:text-primary transition-colors">
                  <div className="flex items-center gap-1">القطاع <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th onClick={() => handleSort('status')} className="cursor-pointer hover:text-primary transition-colors text-center">
                  <div className="flex items-center justify-center gap-1">حالة العميل <ArrowUpDown size={14} className="text-muted" /></div>
                </th>
                <th style={{ width: '150px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td data-label="الرقم" style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }} className="text-primary">{customer.customerNumber || (index + 1)}</td>
                    <td data-label="اسم العميل">
                      {customer.name}
                    </td>
                    <td data-label="رقم التلفون">
                      <div className="flex items-center gap-2 justify-end lg:justify-start">
                        <Phone size={14} className="text-muted" />
                        {customer.phone}
                      </div>
                    </td>
                    <td data-label="المدينة">
                      <div className="flex items-center gap-2 justify-end lg:justify-start text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                        {customer.city || '---'}
                      </div>
                    </td>
                    <td data-label="العنوان / المنطقة">
                      <div className="flex items-center gap-2 justify-end lg:justify-start text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        {customer.location || '---'}
                      </div>
                    </td>
                    <td data-label="القطاع">
                      <div className="flex items-center gap-2 justify-end lg:justify-start text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit">
                        {customer.sector || '---'}
                      </div>
                    </td>
                    <td data-label="حالة العميل" className="text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        (customer.status || 'نشط') === 'نشط' ? 'bg-emerald-100 text-emerald-700' :
                        (customer.status === 'غير نشط') ? 'bg-slate-100 text-slate-700' :
                        (customer.status === 'عميل محتمل') ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {customer.status || 'نشط'}
                      </span>
                    </td>
                    <td data-label="إجراءات" style={{ textAlign: 'center' }}>
                      <div className="flex justify-center gap-2">
                        {canPerformAction(user, 'EDIT', 'CUSTOMERS', globalSettings) && (
                          <button className="icon-btn icon-btn-edit" title="تعديل" onClick={() => handleOpenModal(customer)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'DELETE', 'CUSTOMERS', globalSettings) && (
                          <button className="icon-btn icon-btn-delete" title="حذف" onClick={() => handleDelete(customer.id)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-muted">لا يوجد عملاء مطابقين للبحث</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showFilterModal && (
        <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter text-primary"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> تصفية مخصصة</h3>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="input-group">
                <label>المدينة</label>
                <select className="input-field" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                  <option value="">جميع المدن</option>
                  {JORDANIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>القطاع</label>
                <select className="input-field" value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
                  <option value="">جميع القطاعات</option>
                  {(globalSettings.customerSectors || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>الحالة</label>
                <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">جميع الحالات</option>
                  <option value="نشط">نشط</option>
                  <option value="غير نشط">غير نشط</option>
                  <option value="عميل محتمل">عميل محتمل</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6 pt-4 border-t">
              <button className="btn btn-primary flex-1" onClick={() => setShowFilterModal(false)}>تطبيق</button>
              <button className="btn btn-outline flex-1" onClick={() => {
                setFilterCity('');
                setFilterSector('');
                setFilterStatus('');
                setShowFilterModal(false);
              }}>إلغاء التصفية</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
