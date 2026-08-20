import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, Search, Trash2, Package, Printer, X, User, Edit2, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Copy, GripVertical, CheckCircle, Save, FilePlus, Share2, SlidersHorizontal, Eye, Calendar, Wallet, CreditCard, Tag } from 'lucide-react';
import { getQuotes, saveQuote, deleteQuote, getCustomers, getGlobalSettings, canPerformAction, addLog, getStock, saveSalesOrder, saveGlobalSettings, convertQuoteToPriceList } from '../../store';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import Select from '../../components/SearchSelect';
import html2pdf from 'html2pdf.js';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const MySwal = withReactContent(Swal);

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const AdminQuotes = ({ user }) => {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stock, setStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showTermsList, setShowTermsList] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'quoteNumber', direction: 'desc' });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSortConfig, setPreviewSortConfig] = useState(null);

  const handlePreviewSort = (key) => {
    let direction = 'asc';
    if (previewSortConfig && previewSortConfig.key === key && previewSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setPreviewSortConfig({ key, direction });
  };

  const [globalSettings, setGlobalSettings] = useState({
    quoteStatuses: [],
    quoteValidities: [],
    quoteTerms: [],
    quoteTaxRates: [],
    logoUrl: '/logo-mrsleep.png',
    siteName: 'Mirjas HR'
  });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    quoteDate: getLocalDateStr(new Date()),
    status: 'جديد',
    validity: '',
    taxRate: 0,
    terms: [],
    notes: '',
    items: [{ productName: '', warehouse: '', quantity: 1, price: 0, total: 0, taxRate: 16 }]
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getButtonTheme = (type) => {
    switch (type) {
      case 'preview':
        return {
          iconColor: '#0ea5e9',
          borderColor: '#bae6fd',
          bgColor: '#f0f9ff',
          hoverBg: '#e0f2fe',
          hoverBorder: '#7dd3fc'
        };
      case 'edit':
        return {
          iconColor: '#4f46e5',
          borderColor: '#c7d2fe',
          bgColor: '#e0e7ff',
          hoverBg: '#c7d2fe',
          hoverBorder: '#818cf8'
        };
      case 'copy':
        return {
          iconColor: '#d97706',
          borderColor: '#fde047',
          bgColor: '#fef9c3',
          hoverBg: '#fef08a',
          hoverBorder: '#facc15'
        };
      case 'print':
        return {
          iconColor: '#64748b',
          borderColor: '#cbd5e1',
          bgColor: '#f8fafc',
          hoverBg: '#f1f5f9',
          hoverBorder: '#94a3b8'
        };
      case 'share':
        return {
          iconColor: '#059669',
          borderColor: '#a7f3d0',
          bgColor: '#ecfdf5',
          hoverBg: '#d1fae5',
          hoverBorder: '#6ee7b7'
        };
      case 'convert':
        return {
          iconColor: '#0d9488',
          borderColor: '#99f6e4',
          bgColor: '#f0fdfa',
          hoverBg: '#ccfbf1',
          hoverBorder: '#5eead4'
        };
      case 'pricelist':
        return {
          iconColor: '#0284c7',
          borderColor: '#bae6fd',
          bgColor: '#e0f2fe',
          hoverBg: '#bae6fd',
          hoverBorder: '#38bdf8'
        };
      case 'delete':
        return {
          iconColor: '#ef4444',
          borderColor: '#fca5a5',
          bgColor: '#fef2f2',
          hoverBg: '#fee2e2',
          hoverBorder: '#f87171'
        };
      default:
        return {
          iconColor: '#475569',
          borderColor: '#e2e8f0',
          bgColor: '#ffffff',
          hoverBg: '#f8fafc',
          hoverBorder: '#cbd5e1'
        };
    }
  };

  const getActionButtonStyle = (type) => {
    const theme = getButtonTheme(type);
    return {
      width: '38px',
      height: '38px',
      borderRadius: '12px',
      backgroundColor: theme.bgColor,
      border: `1.5px solid ${theme.borderColor}`,
      color: theme.iconColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
    };
  };

  const handleActionButtonMouseEnter = (e, type) => {
    const theme = getButtonTheme(type);
    e.currentTarget.style.backgroundColor = theme.hoverBg;
    e.currentTarget.style.borderColor = theme.hoverBorder;
  };

  const handleActionButtonMouseLeave = (e, type) => {
    const theme = getButtonTheme(type);
    e.currentTarget.style.backgroundColor = theme.bgColor;
    e.currentTarget.style.borderColor = theme.borderColor;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesData, customersData, settingsData, stockData] = await Promise.all([
        getQuotes(),
        getCustomers(),
        getGlobalSettings(),
        getStock()
      ]);
      setQuotes(quotesData || []);
      setCustomers(customersData || []);
      setGlobalSettings(prev => ({ ...prev, ...settingsData }));
      setStock(stockData || []);
    } catch (e) {
      console.error(e);
      Swal.fire('خطأ', 'تعذر جلب البيانات', 'error');
    }
    setLoading(false);
  };

  const handleOpenModal = (quote = null) => {
    if (quote) {
      setEditingQuote(quote);
      setFormData({
        ...quote,
        paymentMethod: quote.paymentMethod || 'كاش',
        items: quote.items && quote.items.length > 0 ? quote.items.map(item => ({ ...item, warehouse: item.warehouse || '' })) : [{ productName: '', warehouse: '', quantity: 1, price: 0, total: 0, notes: '' }]
      });
    } else {
      setEditingQuote(null);
      const currentYear = new Date().getFullYear().toString().substr(-2);
      const prefix = `Q${currentYear}-`;
      let maxNum = 0;
      quotes.forEach(d => {
        if (d.quoteNumber && d.quoteNumber.startsWith(prefix)) {
          const num = parseInt(d.quoteNumber.replace(prefix, ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      const autoNextNumber = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;

      setFormData({
        quoteNumber: autoNextNumber,
        customerId: '',
        customerName: '',
        quoteDate: getLocalDateStr(new Date()),
        paymentMethod: 'كاش',
        status: (globalSettings.quoteStatuses && globalSettings.quoteStatuses.length > 0) ? globalSettings.quoteStatuses[0] : 'جديد',
        validity: (globalSettings.quoteValidities && globalSettings.quoteValidities.length > 0) ? globalSettings.quoteValidities[0] : '',
        taxRate: (globalSettings.quoteTaxRates && globalSettings.quoteTaxRates.length > 0) ? globalSettings.quoteTaxRates[0] : 0,
        terms: (globalSettings.quoteTerms || []).filter(term => term.includes('لا تشمل ضريبة المبيعات') || term.includes('تخضع هذه الأسعار للتغيير')),
        notes: '',
        items: [{ productName: '', warehouse: '', quantity: 1, price: 0, total: 0, taxRate: 'غير شامل' }]
      });
    }
    setActiveStep(1);
    setShowModal(true);
  };

  const templateOptions = [
    { value: 'default', label: `الشروط الافتراضية • ${globalSettings.quoteTerms?.length || 0} شروط` },
    { value: 'custom', label: 'تخصيص الشروط...' },
    { value: 'none', label: 'بدون شروط' }
  ];

  const getCurrentTemplate = () => {
    if (!formData.terms || formData.terms.length === 0) {
      return { value: 'none', label: 'بدون شروط' };
    }
    if (globalSettings.quoteTerms && formData.terms.length === globalSettings.quoteTerms.length) {
      return { value: 'default', label: `الشروط الافتراضية • ${globalSettings.quoteTerms.length} شروط` };
    }
    return { value: 'custom', label: 'تخصيص الشروط...' };
  };

  const handleTemplateChange = (selected) => {
    if (selected.value === 'default') {
      setFormData({ ...formData, terms: [...(globalSettings.quoteTerms || [])] });
    } else if (selected.value === 'none') {
      setFormData({ ...formData, terms: [] });
    } else {
      setShowTermsList(true);
    }
  };

  const handleAddNewTerm = async () => {
    const { value: termText } = await Swal.fire({
      title: 'إضافة شرط جديد لمستندات عروض الأسعار',
      input: 'text',
      inputPlaceholder: 'اكتب نص الشرط هنا...',
      showCancelButton: true,
      confirmButtonText: 'إضافة وحفظ',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#0f766e',
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى كتابة نص الشرط أولاً!';
        }
      }
    });

    if (termText) {
      const updatedTerms = [...(globalSettings.quoteTerms || []), termText];
      const updatedSettings = { ...globalSettings, quoteTerms: updatedTerms };

      try {
        await saveGlobalSettings(updatedSettings);
        setGlobalSettings(updatedSettings);
        setFormData(prev => ({
          ...prev,
          terms: [...prev.terms, termText]
        }));
        Swal.fire({
          title: 'تم الإضافة',
          text: 'تم إضافة الشرط بنجاح إلى الإعدادات العامة وتحديده لعرض السعر الحالي.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error(error);
        Swal.fire('خطأ', 'تعذر حفظ الشرط الجديد في الإعدادات', 'error');
      }
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productName: '', warehouse: '', quantity: 1, price: 0, total: 0, taxRate: 'غير شامل' }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'price') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].price) || 0;
      newItems[index].total = qty * price;
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calculateTax = () => {
    return formData.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      let rate = 0;
      if (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== '') {
        const parsed = parseFloat(item.taxRate);
        if (!isNaN(parsed)) rate = parsed;
      }
      return sum + (qty * price * (rate / 100));
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSave = async (forceStatus = null) => {
    if (!formData.customerId || !formData.customerName) {
      Swal.fire('خطأ', 'يرجى اختيار العميل', 'error');
      return;
    }

    if (formData.items.length === 0) {
      Swal.fire('خطأ', 'يرجى إضافة صنف واحد على الأقل', 'error');
      return;
    }

    const hasEmptyItem = formData.items.some(item => !item.productName);
    if (hasEmptyItem) {
      Swal.fire('خطأ', 'يرجى اختيار الصنف لجميع الأسطر المضافة', 'error');
      return;
    }



    const dataToSave = {
      ...formData,
      status: typeof forceStatus === 'string' ? forceStatus : formData.status || 'معلق',
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      grandTotal: calculateTotal(),
      version: editingQuote ? (formData.version ? formData.version + 1 : 2) : 1,
      createdBy: formData.createdBy || user?.name || 'مدير',
      lastActionBy: user?.name || 'مدير',
      lastActionDate: getLocalDateStr(new Date())
    };

    const result = await saveQuote(dataToSave);
    if (result) {
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'عروض الأسعار',
        action: editingQuote ? 'تعديل' : 'إضافة',
        details: `${editingQuote ? 'تعديل' : 'إضافة'} عرض سعر رقم: ${result.quoteNumber} للعميل: ${result.customerName}`
      });

      Swal.fire({
        title: editingQuote ? 'تم التعديل' : 'تمت الإضافة',
        text: editingQuote ? 'تم تحديث عرض السعر بنجاح' : 'تم إضافة عرض السعر بنجاح برقم ' + result.quoteNumber,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setShowModal(false);
      fetchData();
    }
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
      const quoteToDelete = quotes.find(q => q.id === id);
      await deleteQuote(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'عروض الأسعار',
        action: 'حذف',
        details: `حذف عرض سعر رقم: ${quoteToDelete?.quoteNumber || id}`
      });
      fetchData();
    }
  };

  const convertToOrder = async (quote) => {
    const result = await MySwal.fire({
      title: 'تحويل إلى طلبية',
      text: 'سيتم إنشاء طلبية بيع جديدة بنفس تفاصيل عرض السعر. هل تريد المتابعة؟',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'نعم، حوّل لطلبية',
      cancelButtonText: 'إلغاء',
      customClass: {
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (result.isConfirmed) {
      // Map quote items to order items
      const orderItems = (quote.items || []).map(i => ({
        productName: i.productName,
        quantity: i.quantity,
        notes: i.notes,
        itemStatus: 'قيد التحضير' // Default for new orders
      }));

      const newOrder = {
        customerId: quote.customerId,
        customerName: quote.customerName,
        orderDate: getLocalDateStr(new Date()),
        deliveryDate: '',
        status: 'جديد',
        orderNotes: `محول من عرض السعر رقم ${quote.quoteNumber}. ${quote.notes || ''}`,
        items: orderItems,
        createdBy: user?.name || 'مدير',
        lastActionBy: user?.name || 'مدير'
      };

      try {
        const savedOrder = await saveSalesOrder(newOrder);
        if (savedOrder) {
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'عروض الأسعار',
            action: 'تحويل',
            details: `تحويل عرض السعر ${quote.quoteNumber} إلى طلبية مبيعات رقم ${savedOrder.orderNumber || ''}`
          });

          // Optionally update quote status
          await saveQuote({ ...quote, status: 'محولة إلى إدارة الطلبات', lastActionBy: user?.name, lastActionDate: getLocalDateStr(new Date()) });

          Swal.fire({
            title: 'تم التحويل',
            text: `تم إنشاء الطلبية بنجاح برقم ${savedOrder.orderNumber}`,
            icon: 'success'
          });
          fetchData();
        }
      } catch (err) {
        console.error("Error converting quote:", err);
        Swal.fire('خطأ', 'فشل تحويل عرض السعر لطلبية', 'error');
      }
    }
  };

  const handleCopyQuote = (quote) => {
    setEditingQuote(null);
    const currentYear = new Date().getFullYear().toString().substr(-2);
    const prefix = `Q${currentYear}-`;
    let maxNum = 0;
    quotes.forEach(d => {
      if (d.quoteNumber && d.quoteNumber.startsWith(prefix)) {
        const num = parseInt(d.quoteNumber.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const autoNextNumber = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;

    setFormData({
      ...quote,
      id: undefined,
      quoteNumber: autoNextNumber,
      quoteDate: getLocalDateStr(new Date()),
      status: (globalSettings.quoteStatuses && globalSettings.quoteStatuses.length > 0) ? globalSettings.quoteStatuses[0] : 'جديد',
      createdBy: user?.name || 'مدير',
      lastActionBy: user?.name || 'مدير',
      lastActionDate: getLocalDateStr(new Date())
    });
    setActiveStep(1);
    setShowModal(true);
  };

  const handleConvertToPriceList = async (quote) => {
    try {
      const result = await Swal.fire({
        title: 'تحويل إلى قائمة أسعار الزبون',
        text: `هل تريد تحويل عرض السعر رقم (${quote.quoteNumber || quote.id}) إلى قائمة أسعار مخصصة للزبون "${quote.customerName}"؟`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، تحويل لقائمة الأسعار',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#0284c7'
      });

      if (result.isConfirmed) {
        Swal.fire({ title: 'جاري تحويل العرض إلى قائمة أسعار...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const savedList = await convertQuoteToPriceList(quote);
        Swal.fire({
          title: 'تم التحويل بنجاح!',
          text: `تم إنشاء/تحديث قائمة الأسعار للزبون (${quote.customerName}) برقم (${savedList.code}).`,
          icon: 'success',
          confirmButtonText: 'ممتاز'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('خطأ', 'حدث خطأ أثناء تحويل عرض السعر إلى قائمة أسعار.', 'error');
    }
  };


  const triggerSharePDF = async (quoteToShare = null) => {
    const quote = quoteToShare || selectedQuote;
    if (!quote) return;
    const printEl = document.querySelector('.quote-print-layout');
    if (!printEl) return;

    Swal.fire({
      title: 'جاري تجهيز ملف PDF...',
      html: 'يرجى الانتظار لحين إنشاء ملف PDF ومشاركته.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Save original styles to restore them later
    const originalWidth = printEl.style.getPropertyValue('width');
    const originalMinWidth = printEl.style.getPropertyValue('min-width');
    const originalMaxWidth = printEl.style.getPropertyValue('max-width');
    const originalZoom = printEl.style.getPropertyValue('zoom');

    // Force 800px width and zoom 1 inline with !important to bypass any cached CSS rules
    printEl.style.setProperty('width', '800px', 'important');
    printEl.style.setProperty('min-width', '800px', 'important');
    printEl.style.setProperty('max-width', '800px', 'important');
    printEl.style.setProperty('zoom', '1', 'important');

    const portal = document.getElementById('print-portal');
    const originalPortalDirection = portal.style.direction;
    const originalStyles = {
      display: portal.style.display,
      position: portal.style.position,
      top: portal.style.top,
      left: portal.style.left,
      zIndex: portal.style.zIndex,
      width: portal.style.width
    };

    try {
      portal.style.display = 'block';
      portal.style.position = 'absolute';
      portal.style.top = '0';
      portal.style.right = '0';
      portal.style.left = 'auto';
      portal.style.width = '800px';
      portal.style.zIndex = '-9999';
      portal.style.direction = 'rtl';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `عرض_سعر_${quote.quoteNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false, 
          windowWidth: 800, 
          width: 800,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().set(opt).from(printEl).output('blob');

      // Restore original printEl styles
      if (originalWidth) printEl.style.setProperty('width', originalWidth); else printEl.style.removeProperty('width');
      if (originalMinWidth) printEl.style.setProperty('min-width', originalMinWidth); else printEl.style.removeProperty('min-width');
      if (originalMaxWidth) printEl.style.setProperty('max-width', originalMaxWidth); else printEl.style.removeProperty('max-width');
      if (originalZoom) printEl.style.setProperty('zoom', originalZoom); else printEl.style.removeProperty('zoom');

      // Restore original portal styles
      Object.assign(portal.style, originalStyles);
      portal.style.direction = originalPortalDirection;

      Swal.close();

      const fileName = opt.filename;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `عرض سعر #${quote.quoteNumber}`,
          text: `مرفق عرض سعر رقم #${quote.quoteNumber}`
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.click();
        Swal.fire('تم تحميل ملف PDF', 'تم التحميل بنجاح لعدم دعم متصفحك للمشاركة', 'success');
      }
    } catch (error) {
      // Restore original printEl styles on error
      if (originalWidth) printEl.style.setProperty('width', originalWidth); else printEl.style.removeProperty('width');
      if (originalMinWidth) printEl.style.setProperty('min-width', originalMinWidth); else printEl.style.removeProperty('min-width');
      if (originalMaxWidth) printEl.style.setProperty('max-width', originalMaxWidth); else printEl.style.removeProperty('max-width');
      if (originalZoom) printEl.style.setProperty('zoom', originalZoom); else printEl.style.removeProperty('zoom');

      // Restore original portal styles
      Object.assign(portal.style, originalStyles);
      portal.style.direction = originalPortalDirection;

      if (error.name !== 'AbortError') {
        Swal.fire('فشلت المشاركة', 'حدث خطأ أثناء الإنشاء', 'error');
      } else {
        Swal.close();
      }
    }
  };

  const debouncedSearchTerm = useDebounce(searchTerm);
  const filteredQuotes = [...quotes].filter(q => {
    const matchSearch = matchesSearch(
      [q.quoteNumber, q.customerName, q.customerNumber, q.phone, q.items],
      debouncedSearchTerm
    );
    const matchDateFrom = dateFrom ? q.quoteDate >= dateFrom : true;
    const matchDateTo = dateTo ? q.quoteDate <= dateTo : true;
    const matchCust = selectedCustomer ? q.customerId === selectedCustomer : true;
    const matchStatus = selectedStatus ? q.status === selectedStatus : true;
    return matchSearch && matchDateFrom && matchDateTo && matchCust && matchStatus;
  });

  filteredQuotes.sort((a, b) => {
    if (sortConfig.key === 'quoteNumber') {
      const numA = parseInt((a.quoteNumber || '').replace(/\D/g, ''), 10);
      const numB = parseInt((b.quoteNumber || '').replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    }
    const strA = String(a[sortConfig.key] || '');
    const strB = String(b[sortConfig.key] || '');
    return sortConfig.direction === 'asc'
      ? strA.localeCompare(strB, undefined, { numeric: true })
      : strB.localeCompare(strA, undefined, { numeric: true });
  });

  const getStatusBadge = (status) => {
    let color = 'bg-slate-100 text-slate-800';
    if (status === 'مقبول' || status === 'محولة إلى إدارة الطلبات' || status === 'محول لطلبية') color = 'bg-emerald-100 text-emerald-800';
    if (status === 'مرفوض' || status === 'ملغي') color = 'bg-rose-100 text-rose-800';
    if (status === 'قيد المراجعة') color = 'bg-amber-100 text-amber-800';
    if (status === 'جديد') color = 'bg-blue-100 text-blue-800';

    return <span className={`px-3 py-1 rounded-full text-sm font-bold ${color}`}>{status}</span>;
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'white',
      border: state.isFocused ? '1px solid #0f766e' : '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(15, 118, 110, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      minHeight: '44px',
      height: '44px',
      transition: 'all 0.2s',
      ':hover': {
        borderColor: '#cbd5e1'
      }
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 12px',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1e293b',
      fontWeight: 'bold',
      fontSize: '0.95rem',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '0.95rem',
      fontWeight: '500',
    }),
    menuPortal: base => ({ ...base, zIndex: 999999 }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '14px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      zIndex: 999999,
      width: 'max-content',
      minWidth: '100%',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0f766e' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#1e293b',
      cursor: 'pointer',
      padding: '10px 16px',
      fontSize: '0.95rem',
      fontWeight: state.isSelected ? 'bold' : 'normal',
      ':active': {
        backgroundColor: '#0f766e',
      }
    }),
  };

  const renderQuoteDocument = (quote) => {
    if (!quote) return null;
    return (
      <div className="quote-print-layout" style={{
        direction: 'rtl',
        padding: '2.5rem 3rem',
        fontFamily: 'Tajawal, sans-serif',
        background: 'white',
        color: '#1e293b',
        borderTop: '5px solid #0f766e',
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'right'
      }}>
        <style>{`
          .quote-print-layout * {
            letter-spacing: normal !important;
            font-variant-ligatures: normal !important;
          }
          .quote-print-layout th,
          .quote-print-layout th div,
          .quote-print-layout td {
            font-weight: bold !important; 
          }
        `}</style>
        <div>
          {/* Header Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            {/* Right Side (rendered on the right in RTL): Company Logo & Contact Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', flex: 1, textAlign: 'right' }}>
              {globalSettings.logoUrl ? (
                <img src={globalSettings.logoUrl} alt={globalSettings.siteName} style={{ height: '55px', objectFit: 'contain', marginBottom: '2px' }} />
              ) : (
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f766e' }}>{globalSettings.siteName}</div>
              )}
            </div>

            {/* Left Side (rendered on the left in RTL): Title & Quote Number & General Details */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flex: 1, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#1e293b' }}>عرض سعر</h1>
                <div style={{
                  border: '1px solid #0d9488',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px'
                }}>
                  {quote.quoteNumber}{quote.version ? ` (V${quote.version})` : ' (V1)'}
                </div>
              </div>
              
              {/* Date and Validity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: '#475569', fontWeight: 'bold' }}>
                <div>تاريخ العرض: <span style={{ color: '#0f172a' }}>{quote.quoteDate}</span></div>
                <div style={{ color: '#cbd5e1' }}>|</div>
                <div>صالح لمدة: <span style={{ color: '#0f172a' }}>{quote.validity || '---'}</span></div>
              </div>
            </div>
          </div>

          {/* Customer & Quote Info Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
            alignItems: 'center'
          }}>
            {/* Right column: المقدم إليه */}
            <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.7rem', color: '#0f766e', fontWeight: '800' }}>العميل:</span>
              <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quote.customerName}</span>
            </div>
            
            <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>

            {/* Middle column: حالة العرض */}
            <div style={{ flex: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: '800' }}>الحالة:</span>
              <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: '800' }}>{quote.status || 'مسودة'}</span>
            </div>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>

            {/* Left Column: طريقة الدفع والعملة */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: '800' }}>الدفع:</span>
              <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: '800' }}>{quote.paymentMethod || 'كاش'}</span>
            </div>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>

            {/* Currency */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#0f766e', fontWeight: '800' }}>العملة:</span>
              <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: '800' }}>دينار أردني</span>
            </div>
          </div>

          {/* Pricing Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#e2f2f0', color: '#0f766e' }}>
                <th onClick={() => handlePreviewSort('index')} style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '4%', cursor: 'pointer' }}># {previewSortConfig?.key === 'index' ? (previewSortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => handlePreviewSort('name')} style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'right', fontWeight: '800', width: '50%', cursor: 'pointer' }}><div style={{ textAlign: 'right' }}>الصنف / الوصف {previewSortConfig?.key === 'name' ? (previewSortConfig.direction === 'asc' ? '▲' : '▼') : ''}</div></th>
                <th onClick={() => handlePreviewSort('quantity')} style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '7%', cursor: 'pointer' }}>الكمية {previewSortConfig?.key === 'quantity' ? (previewSortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                <th onClick={() => handlePreviewSort('price')} style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '10%', cursor: 'pointer' }}>سعر الوحدة {previewSortConfig?.key === 'price' ? (previewSortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
                <th style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '8%' }}>الضريبة</th>
                <th style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '10%' }}>قيمة الضريبة</th>
                <th onClick={() => handlePreviewSort('total')} style={{ padding: '6px 4px', border: '1px solid #ccfbf1', textAlign: 'center', fontWeight: '800', width: '11%', cursor: 'pointer' }}>الإجمالي {previewSortConfig?.key === 'total' ? (previewSortConfig.direction === 'asc' ? '▲' : '▼') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const sortedItems = [...(quote.items || [])].map((item, index) => ({ ...item, originalIndex: index + 1 }));
                if (previewSortConfig) {
                  sortedItems.sort((a, b) => {
                    let valA, valB;
                    switch (previewSortConfig.key) {
                      case 'price': valA = parseFloat(a.price) || 0; valB = parseFloat(b.price) || 0; break;
                      case 'quantity': valA = parseFloat(a.quantity) || 0; valB = parseFloat(b.quantity) || 0; break;
                      case 'total': valA = parseFloat(a.total) || 0; valB = parseFloat(b.total) || 0; break;
                      case 'name': valA = a.productName || ''; valB = b.productName || ''; break;
                      default: valA = a.originalIndex; valB = b.originalIndex;
                    }
                    if (valA < valB) return previewSortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return previewSortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                  });
                }
                return sortedItems.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#475569', fontWeight: 'bold' }}>
                      {String(item.originalIndex).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{item.productName}</div>
                      {item.notes && <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px', textAlign: 'right' }}>{item.notes}</div>}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontFamily: 'monospace' }}>
                      {(parseFloat(item.price) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#475569' }}>
                      {(() => {
                        const rate = item.taxRate !== undefined ? item.taxRate : (quote.taxRate || 0);
                        return isNaN(rate) ? rate : `${rate}%`;
                      })()}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#475569', fontFamily: 'monospace' }}>
                      {(((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 1)) * ((parseFloat(item.taxRate !== undefined ? item.taxRate : quote.taxRate) || 0) / 100)).toFixed(2)}
                    </td>
                    <td style={{ padding: '6px 4px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#0f766e', fontFamily: 'monospace' }}>
                      {(parseFloat(item.total) || 0).toFixed(2)}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>

          {/* Bottom Section: Terms & Totals Side-by-side */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
            {/* Right Side: Terms & Conditions & Notes */}
            <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Terms and Conditions */}
              {quote.terms && quote.terms.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f766e', fontSize: '0.9rem', fontWeight: '800', borderBottom: '1px solid #0f766e', paddingBottom: '4px' }}>الشروط والأحكام</h4>
                  <ol style={{ margin: 0, paddingRight: '16px', color: '#334155', lineHeight: '1.4', fontSize: '0.8rem', fontWeight: '600' }}>
                    {quote.terms.map((term, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{term}</li>
                    ))}
                  </ol>
                </div>
              )}
              
              {/* Notes */}
              {quote.notes && (
                <div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f766e', fontSize: '0.9rem', fontWeight: '800', borderBottom: '1px solid #0f766e', paddingBottom: '4px' }}>ملاحظات</h4>
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.8rem', fontWeight: '600', lineHeight: '1.4' }}>
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Left Side: Summary Totals */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>المجموع الفرعي</td>
                    <td style={{ padding: '6px 12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a', textAlign: 'left', fontFamily: 'monospace' }}>
                      {(parseFloat(quote.subtotal) || 0).toFixed(2)} د.أ
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#475569', textAlign: 'right' }}>الضريبة</td>
                    <td style={{ padding: '6px 12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a', textAlign: 'left', fontFamily: 'monospace' }}>
                      {(parseFloat(quote.taxAmount) || 0).toFixed(2)} د.أ
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#0f766e', color: 'white' }}>
                    <td style={{ padding: '8px 12px', border: '1px solid #0f766e', fontWeight: '900', fontSize: '0.95rem', textAlign: 'right' }}>الإجمالي النهائي</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #0f766e', fontWeight: '900', fontSize: '0.95rem', textAlign: 'left', fontFamily: 'monospace' }}>
                      {(parseFloat(quote.grandTotal) || 0).toFixed(2)} د.أ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>


      </div>
    );
  };

  return (
    <>
      {selectedQuote && createPortal(
        renderQuoteDocument(selectedQuote),
        document.getElementById('print-portal')
      )}

      <div className="no-print">
        {/* Header */}
        {isMobile ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileText size={24} style={{ color: '#0f766e' }} />
              <span>عروض الأسعار</span>
            </h2>
            {canPerformAction(user, 'ADD', 'QUOTES', globalSettings) && (
              <button
                type="button"
                onClick={() => handleOpenModal()}
                disabled={loading}
                style={{
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '13.5px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} />
                <span>عرض سعر جديد</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-primary" /> عروض الأسعار
            </h2>
            {canPerformAction(user, 'ADD', 'QUOTES', globalSettings) && (
              <button className="btn btn-primary flex items-center gap-2" onClick={() => handleOpenModal()} disabled={loading}>
                <Plus size={18} /> عرض سعر جديد
              </button>
            )}
          </div>
        )}

        {/* Filter Bar */}
        {isMobile ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="بحث برقم العرض أو اسم العميل..."
                style={{
                  width: '100%',
                  height: '44px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0 40px 0 14px',
                  fontSize: '13.5px',
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <div>
              <select
                style={{
                  width: '180px',
                  height: '42px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">جميع الحالات</option>
                {globalSettings.quoteStatuses?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="glass-panel mb-6 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="text-slate-400" size={20} />
                <input type="text" placeholder="بحث برقم العرض أو اسم العميل..." className="input-field mb-0 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <select className="input-field mb-0 md:w-48" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="">جميع الحالات</option>
                {globalSettings.quoteStatuses?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Main List Rendering */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {filteredQuotes.map(quote => (
              <div
                key={quote.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Top Row: Quote Number & Version (Right), Status Badge (Left) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f766e', fontFamily: 'sans-serif' }}>
                      {quote.quoteNumber}
                    </span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '8px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 'bold' }}>
                      V{quote.version || 1}
                    </span>
                  </div>

                  <div>
                    {getStatusBadge(quote.status)}
                  </div>
                </div>

                {/* Customer Name */}
                <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                  {quote.customerName}
                </div>

                {/* 3 Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                  {/* Col 1: تاريخ العرض */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={18} style={{ color: '#0f766e' }} />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>تاريخ العرض</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{quote.quoteDate}</span>
                  </div>

                  {/* Col 2: الإجمالي */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRight: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9' }}>
                    <Wallet size={18} style={{ color: '#0f766e' }} />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>الإجمالي</span>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{quote.grandTotal} د.أ</span>
                  </div>

                  {/* Col 3: طريقة الدفع */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <CreditCard size={18} style={{ color: '#0f766e' }} />
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>طريقة الدفع</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{quote.paymentMethod || 'كاش'}</span>
                  </div>
                </div>

                {/* Action Icon Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Preview */}
                  <button
                    style={getActionButtonStyle('preview')}
                    onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'preview')}
                    onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'preview')}
                    title="معاينة"
                    onClick={() => { setSelectedQuote(quote); setShowPreviewModal(true); }}
                  >
                    <Eye size={18} />
                  </button>

                  {/* Edit */}
                  {canPerformAction(user, 'EDIT', 'QUOTES', globalSettings) && (
                    <button
                      style={getActionButtonStyle('edit')}
                      onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'edit')}
                      onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'edit')}
                      title="تعديل"
                      onClick={() => handleOpenModal(quote)}
                    >
                      <Edit2 size={18} />
                    </button>
                  )}

                  {/* Copy */}
                  {canPerformAction(user, 'ADD', 'QUOTES', globalSettings) && (
                    <button
                      style={getActionButtonStyle('copy')}
                      onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'copy')}
                      onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'copy')}
                      title="نسخ عرض السعر"
                      onClick={() => handleCopyQuote(quote)}
                    >
                      <Copy size={18} />
                    </button>
                  )}

                  {/* Print */}
                  <button
                    style={getActionButtonStyle('print')}
                    onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'print')}
                    onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'print')}
                    title="طباعة"
                    onClick={() => { setSelectedQuote(quote); setTimeout(() => window.print(), 100); }}
                  >
                    <Printer size={18} />
                  </button>

                  {/* Convert */}
                  {canPerformAction(user, 'ADD', 'SALES', globalSettings) && (
                    <button
                      style={getActionButtonStyle('convert')}
                      onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'convert')}
                      onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'convert')}
                      title="تحويل لطلبية بيع"
                      onClick={() => convertToOrder(quote)}
                    >
                      <FilePlus size={18} />
                    </button>
                  )}

                  {/* Delete */}
                  {canPerformAction(user, 'DELETE', 'QUOTES', globalSettings) && (
                    <button
                      style={getActionButtonStyle('delete')}
                      onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'delete')}
                      onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'delete')}
                      title="حذف"
                      onClick={() => handleDelete(quote.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredQuotes.length === 0 && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
                لا يوجد عروض أسعار متطابقة مع البحث
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold text-slate-700 text-center">رقم العرض</th>
                    <th className="p-4 font-bold text-slate-700 text-center">النسخة</th>
                    <th className="p-4 font-bold text-slate-700 text-center">العميل</th>
                    <th className="p-4 font-bold text-slate-700 text-center">تاريخ العرض</th>
                    <th className="p-4 font-bold text-slate-700 text-center">المبلغ الكلي</th>
                    <th className="p-4 font-bold text-slate-700 text-center">طريقة الدفع</th>
                    <th className="p-4 font-bold text-slate-700 text-center">الحالة</th>
                    <th className="p-4 font-bold text-slate-700 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.map(quote => (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-primary text-center">{quote.quoteNumber}</td>
                      <td className="p-4 font-bold text-slate-800 text-center">V{quote.version || 1}</td>
                      <td className="p-4 font-bold text-slate-800 text-center">{quote.customerName}</td>
                      <td className="p-4 text-slate-600 text-center">{quote.quoteDate}</td>
                      <td className="p-4 font-bold text-slate-800 text-center">{quote.grandTotal} د.أ</td>
                      <td className="p-4 text-slate-600 text-center"><span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', backgroundColor: quote.paymentMethod === 'ذمم' ? '#fee2e2' : '#f0fdfa', color: quote.paymentMethod === 'ذمم' ? '#ef4444' : '#0f766e', border: quote.paymentMethod === 'ذمم' ? '1px solid #fecaca' : '1px solid #ccfbf1' }}>{quote.paymentMethod || 'كاش'}</span></td>
                      <td className="p-4 text-center">{getStatusBadge(quote.status)}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {/* Preview */}
                          <button
                            style={getActionButtonStyle('preview')}
                            onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'preview')}
                            onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'preview')}
                            title="معاينة"
                            onClick={() => { setSelectedQuote(quote); setShowPreviewModal(true); }}
                          >
                            <Eye size={18} />
                          </button>

                          {/* Edit */}
                          {canPerformAction(user, 'EDIT', 'QUOTES', globalSettings) && (
                            <button
                              style={getActionButtonStyle('edit')}
                              onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'edit')}
                              onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'edit')}
                              title="تعديل"
                              onClick={() => handleOpenModal(quote)}
                            >
                              <Edit2 size={18} />
                            </button>
                          )}

                          {/* Copy */}
                          {canPerformAction(user, 'ADD', 'QUOTES', globalSettings) && (
                            <button
                              style={getActionButtonStyle('copy')}
                              onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'copy')}
                              onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'copy')}
                              title="نسخ عرض السعر"
                              onClick={() => handleCopyQuote(quote)}
                            >
                              <Copy size={18} />
                            </button>
                          )}

                          {/* Print */}
                          <button
                            style={getActionButtonStyle('print')}
                            onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'print')}
                            onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'print')}
                            title="طباعة"
                            onClick={() => { setSelectedQuote(quote); setTimeout(() => window.print(), 100); }}
                          >
                            <Printer size={18} />
                          </button>

                          {/* Convert to Sale Order */}
                          {canPerformAction(user, 'ADD', 'SALES', globalSettings) && (
                            <button
                              style={getActionButtonStyle('convert')}
                              onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'convert')}
                              onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'convert')}
                              title="تحويل لطلبية بيع"
                              onClick={() => convertToOrder(quote)}
                            >
                              <FilePlus size={18} />
                            </button>
                          )}

                          {/* Delete */}
                          {canPerformAction(user, 'DELETE', 'QUOTES', globalSettings) && (
                            <button
                              style={getActionButtonStyle('delete')}
                              onMouseEnter={(e) => handleActionButtonMouseEnter(e, 'delete')}
                              onMouseLeave={(e) => handleActionButtonMouseLeave(e, 'delete')}
                              title="حذف"
                              onClick={() => handleDelete(quote.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredQuotes.length === 0 && (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-500">لا يوجد عروض أسعار متطابقة مع البحث</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedQuote && (
          <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', padding: isMobile ? '4px' : '20px' }}>
            <div className="modal-content" style={{ maxWidth: isMobile ? '100vw' : '860px', width: '100%', maxHeight: isMobile ? '100vh' : '90vh', overflowY: 'auto', borderRadius: isMobile ? '0' : '20px', padding: '0', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              
              {/* Sticky Top Toolbar */}
              <div style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '10px 14px' : '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={isMobile ? 18 : 22} style={{ color: '#0f766e' }} />
                  <span style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', color: '#1e293b' }}>معاينة عرض السعر ({selectedQuote.quoteNumber})</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setTimeout(() => window.print(), 100);
                    }}
                    style={{ backgroundColor: '#0f766e', color: 'white', border: 'none', borderRadius: '10px', padding: isMobile ? '6px 14px' : '8px 20px', fontSize: isMobile ? '12.5px' : '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                  >
                    <Printer size={16} /> <span>طباعة</span>
                  </button>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable document wrapper */}
              <div style={{
                padding: isMobile ? '12px 6px' : '30px',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}>
                <div style={{
                  width: '800px',
                  maxWidth: '100%',
                  zoom: isMobile ? Math.min(1, (window.innerWidth - 20) / 800) : 1,
                  transform: (isMobile && !('zoom' in document.body.style)) ? `scale(${Math.min(1, (window.innerWidth - 20) / 800)})` : undefined,
                  transformOrigin: 'top right',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff'
                }}>
                  {renderQuoteDocument(selectedQuote)}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Modal Wizard */}
        {showModal && (
          <div className="modal-overlay" style={isMobile ? { padding: 0, zIndex: 10000 } : { zIndex: 10000 }}>
            <div
              className={isMobile ? "modal-content animate-fade-in" : "modal-content wide animate-fade-in"}
              style={isMobile ? {
                width: '100vw',
                height: '100vh',
                maxHeight: '100vh',
                maxWidth: '100vw',
                borderRadius: 0,
                padding: 0,
                margin: 0,
                backgroundColor: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              } : {
                maxWidth: '1200px',
                maxHeight: '90vh',
                overflowY: 'auto',
                borderRadius: '20px',
                padding: '30px'
              }}
            >
              {isMobile ? (
                <>
                  {/* Mobile Top Header */}
                  <div style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 100
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b'
                      }}
                    >
                      <X size={18} />
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                        {editingQuote ? 'تعديل عرض السعر' : 'إنشاء عرض سعر جديد'}
                      </h2>
                      <span style={{ fontSize: '11px', color: '#0d9488', backgroundColor: '#e6f4ea', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                        {formData.quoteNumber || 'جديد (تلقائي)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>

                  {/* Mobile Scrollable Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* 1. بيانات العرض */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                        <FileText size={18} style={{ color: '#0f766e' }} />
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f766e' }}>بيانات العرض</span>
                      </div>

                      {/* العميل */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#475569' }}>العميل <span className="text-red-500">*</span></label>
                        <Select
                          options={customers.map(c => ({ value: c.id, label: c.name, customer: c }))}
                          value={formData.customerId ? { value: formData.customerId, label: formData.customerName } : null}
                          onChange={(selected) => setFormData({ ...formData, customerId: selected ? selected.value : '', customerName: selected ? selected.label : '' })}
                          styles={customSelectStyles}
                          placeholder="اختر العميل..."
                          isSearchable={true}
                        />
                      </div>

                      {/* Row: تاريخ العرض + فترة الصلاحية */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>تاريخ العرض</label>
                          <Flatpickr
                            className="input-field w-full"
                            value={formData.quoteDate}
                            onChange={([d]) => setFormData({ ...formData, quoteDate: getLocalDateStr(d) })}
                            options={{ dateFormat: 'Y-m-d', allowInput: false, disableMobile: true }}
                            onOpen={(selectedDates, dateStr, instance) => { if (instance && instance.input) instance.input.blur(); }}
                            style={{
                              height: '42px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0 10px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              color: '#1e293b',
                              backgroundColor: 'white'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>فترة الصلاحية</label>
                          <Select
                            options={[
                              ...(globalSettings.quoteValidities?.map(v => ({ value: v, label: v })) || []),
                              { value: 'CREATE_NEW_VALIDITY', label: '➕ صلاحية جديدة...' }
                            ]}
                            value={formData.validity ? { value: formData.validity, label: formData.validity } : null}
                            onChange={async (selected) => {
                              if (selected && selected.value === 'CREATE_NEW_VALIDITY') {
                                const { value: newVal } = await Swal.fire({
                                  title: 'إنشاء فترة صلاحية جديدة',
                                  input: 'text',
                                  inputPlaceholder: 'مثال: 10 أيام...',
                                  showCancelButton: true,
                                  confirmButtonText: 'حفظ',
                                  cancelButtonText: 'إلغاء',
                                  confirmButtonColor: '#0f766e'
                                });
                                if (newVal) {
                                  const updatedList = [...(globalSettings.quoteValidities || []), newVal];
                                  const updatedSettings = { ...globalSettings, quoteValidities: updatedList };
                                  await saveGlobalSettings(updatedSettings);
                                  setGlobalSettings(updatedSettings);
                                  setFormData({ ...formData, validity: newVal });
                                }
                              } else {
                                setFormData({ ...formData, validity: selected ? selected.value : '' });
                              }
                            }}
                            isSearchable={false}
                            styles={{
                              ...customSelectStyles,
                              control: (base) => ({ ...base, minHeight: '42px', height: '42px', borderRadius: '10px' })
                            }}
                            placeholder="اختر..."
                          />
                        </div>
                      </div>

                      {/* Row: حالة العرض + طريقة الدفع */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>حالة العرض</label>
                          <Select
                            options={globalSettings.quoteStatuses?.map(s => ({ value: s, label: s })) || []}
                            value={formData.status ? { value: formData.status, label: formData.status } : null}
                            onChange={(selected) => setFormData({ ...formData, status: selected ? selected.value : '' })}
                            isSearchable={false}
                            styles={{
                              ...customSelectStyles,
                              control: (base) => ({ ...base, minHeight: '42px', height: '42px', borderRadius: '10px' })
                            }}
                            placeholder="الحالة..."
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>طريقة الدفع</label>
                          <Select
                            options={[
                              { value: 'كاش', label: 'كاش' },
                              { value: 'ذمم', label: 'ذمم' }
                            ]}
                            value={formData.paymentMethod ? { value: formData.paymentMethod, label: formData.paymentMethod } : { value: 'كاش', label: 'كاش' }}
                            onChange={(selected) => setFormData({ ...formData, paymentMethod: selected ? selected.value : 'كاش' })}
                            isSearchable={false}
                            styles={{
                              ...customSelectStyles,
                              control: (base) => ({ ...base, minHeight: '42px', height: '42px', borderRadius: '10px' })
                            }}
                            placeholder="الدفع..."
                          />
                        </div>
                      </div>

                      {/* تعديل الشروط والأحكام Button */}
                      <button
                        type="button"
                        onClick={() => setShowTermsList(!showTermsList)}
                        style={{
                          width: '100%',
                          height: '44px',
                          backgroundColor: '#ffffff',
                          color: '#0f766e',
                          border: '1.5px solid #0f766e',
                          borderRadius: '10px',
                          fontSize: '13.5px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          marginTop: '2px'
                        }}
                      >
                        <SlidersHorizontal size={16} style={{ color: '#0f766e' }} />
                        <span>تعديل الشروط والأحكام</span>
                      </button>

                      <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 2px', lineHeight: '1.4' }}>
                        {formData.terms.length > 0
                          ? formData.terms.join(' . ')
                          : 'الأسعار أعلاه لا تشمل ضريبة المبيعات . التسليم في موقع العميل . صال...'
                        }
                      </p>

                      {showTermsList && (
                        <div style={{ width: '100%', borderTop: '1px dashed #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {globalSettings.quoteTerms?.map((term, i) => {
                              const isSelected = formData.terms.includes(term);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newTerms = isSelected
                                      ? formData.terms.filter(t => t !== term)
                                      : [...formData.terms, term];
                                    setFormData({ ...formData, terms: newTerms });
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                                    backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                                    color: isSelected ? '#0f766e' : '#64748b',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: '#0f766e' }} />
                                  <span>{term}</span>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={handleAddNewTerm}
                            style={{
                              height: '34px',
                              backgroundColor: '#f0fdfa',
                              color: '#0f766e',
                              border: '1px dashed #0f766e',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={14} /> <span>إنشاء شرط جديد</span>
                          </button>
                        </div>
                      )}

                      {/* ملاحظة إضافية (اختياري) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#475569' }}>ملاحظة إضافية (اختياري)</label>
                        <textarea
                          rows="2"
                          className="input-field w-full"
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: '#1e293b',
                            outline: 'none',
                            resize: 'none'
                          }}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="أضف ملاحظة خاصة بالعرض..."
                        />
                      </div>
                    </div>

                    {/* 2. الأصناف والمنتجات */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>الأصناف والمنتجات</span>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 14px',
                            backgroundColor: '#ffffff',
                            color: '#0f766e',
                            border: '1.5px solid #0f766e',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} />
                          <span>إضافة سطر جديد</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formData.items.map((item, index) => (
                          <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                              <span style={{ backgroundColor: '#f1f5f9', color: '#1e293b', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>الصنف / الوصف</label>
                              <Select
                                options={
                                  (stock && stock.length > 0)
                                    ? (stock.filter(s => s.category === 'بضاعة جاهزة' || (s.category && s.category.includes('بضاعة'))).length > 0
                                        ? stock.filter(s => s.category === 'بضاعة جاهزة' || (s.category && s.category.includes('بضاعة'))).map(s => ({ value: `${s.name}***${s.warehouse || 'الرئيسي'}`, label: `${s.name} (${s.warehouse || 'الرئيسي'})` }))
                                        : stock.map(s => ({ value: `${s.name}***${s.warehouse || 'الرئيسي'}`, label: `${s.name} (${s.warehouse || 'الرئيسي'})` }))
                                      )
                                    : []
                                }
                                value={item.productName ? { value: `${item.productName}***${item.warehouse || 'الرئيسي'}`, label: `${item.productName} (${item.warehouse || 'الرئيسي'})` } : null}
                                onChange={(selected) => {
                                  const newItems = [...formData.items];
                                  if (selected) {
                                    const parts = selected.value.split('***');
                                    const prodName = parts[0];
                                    
                                    const isDuplicate = formData.items.some((it, i) => i !== index && it.productName === prodName);
                                    if (isDuplicate) {
                                      MySwal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        icon: 'warning',
                                        title: 'هذا الصنف موجود مسبقاً في عرض السعر',
                                        showConfirmButton: false,
                                        timer: 2000
                                      });
                                      return;
                                    }
                                    
                                    newItems[index].productName = prodName;
                                    newItems[index].warehouse = parts[1];
                                  } else {
                                    newItems[index].productName = '';
                                    newItems[index].warehouse = '';
                                  }
                                  setFormData({ ...formData, items: newItems });
                                }}
                                placeholder="اختر الصنف أو الوصف..."
                                isSearchable={true}
                                menuPortalTarget={document.body}
                                styles={{
                                  ...customSelectStyles,
                                  control: (base) => ({ ...base, borderRadius: '10px', minHeight: '42px', height: '42px' }),
                                  menuPortal: (base) => ({ ...base, zIndex: 999999 })
                                }}
                              />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>الضريبة (%)</label>
                                <Select
                                  options={(globalSettings.quoteTaxRates && globalSettings.quoteTaxRates.length > 0 ? globalSettings.quoteTaxRates : [16, 0, 8, 4]).map(r => ({ value: r, label: isNaN(r) ? String(r) : `${r}%` }))}
                                  value={item.taxRate !== undefined ? { value: item.taxRate, label: isNaN(item.taxRate) ? String(item.taxRate) : `${item.taxRate}%` } : { value: 'غير شامل', label: 'غير شامل' }}
                                  onChange={(selected) => handleItemChange(index, 'taxRate', selected ? selected.value : 0)}
                                  isSearchable={false}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    ...customSelectStyles,
                                    control: (base) => ({ ...base, borderRadius: '10px', minHeight: '40px', height: '40px' }),
                                    menuPortal: (base) => ({ ...base, zIndex: 999999 })
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>الكمية</label>
                                <input
                                  type="text"
                                  className="input-field text-center font-bold"
                                  style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', width: '100%', fontSize: '14px' }}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                    handleItemChange(index, 'quantity', val);
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#475569', textAlign: 'center' }}>سعر الوحدة (د.أ)</label>
                                <input
                                  type="text"
                                  className="input-field text-center font-bold"
                                  style={{ height: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', width: '100%', fontSize: '14px', color: '#0f766e' }}
                                  value={item.price}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9.]/g, '');
                                    handleItemChange(index, 'price', val);
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                disabled={formData.items.length === 1}
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '10px',
                                  border: '1.5px solid #fee2e2',
                                  backgroundColor: '#ffffff',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  opacity: formData.items.length === 1 ? 0.4 : 1
                                }}
                              >
                                <Trash2 size={18} />
                              </button>

                              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>قيمة الضريبة</span>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                    {((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0) * ((parseFloat(item.taxRate) || 0) / 100)).toFixed(2)} د.أ
                                  </span>
                                </div>

                                <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }}></div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>الإجمالي</span>
                                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f766e' }}>
                                    {(parseFloat(item.total) || 0).toFixed(2)} د.أ
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. ملخص الفاتورة العام (Stacked List) */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>الإجمالي قبل الضريبة</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>{calculateSubtotal().toFixed(2)} د.أ</span>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#f1f5f9' }}></div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>إجمالي الضريبة</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>{calculateTax().toFixed(2)} د.أ</span>
                      </div>
                      <div style={{ height: '1px', backgroundColor: '#f1f5f9' }}></div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#0f766e', fontWeight: '900' }}>الإجمالي بعد الضريبة</span>
                        <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f766e', fontFamily: 'monospace' }}>{calculateTotal().toFixed(2)} د.أ</span>
                      </div>
                    </div>

                  </div>

                  {/* Sticky Mobile Footer */}
                  <div style={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '12px',
                    zIndex: 100
                  }}>
                    <button
                      type="button"
                      onClick={() => handleSave()}
                      style={{ flex: 1, height: '46px', backgroundColor: '#0f766e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      متابعة
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave('مسودة')}
                      style={{ flex: 1, height: '46px', backgroundColor: '#ffffff', color: '#0f766e', border: '1.5px solid #0f766e', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <Save size={18} />
                      <span>حفظ كمسودة</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: '#f1f5f9' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ backgroundColor: '#e0f2fe', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {editingQuote ? <Edit2 size={24} style={{ color: '#0284c7' }} /> : <FilePlus size={24} style={{ color: '#0284c7' }} />}
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {editingQuote ? 'تعديل عرض السعر' : 'إنشاء عرض سعر جديد'}
                          <span style={{ fontSize: '1.1rem', color: '#0f766e', backgroundColor: '#f0fdfa', padding: '4px 12px', borderRadius: '8px', border: '1px solid #ccfbf1' }}>
                            {formData.quoteNumber || 'جديد (تلقائي)'}
                          </span>
                        </h2>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* 1. بيانات العرض */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <FileText size={18} style={{ color: '#0f766e' }} />
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f766e' }}>بيانات العرض</span>
                      </div>

                      {/* Row 1: General Info */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%' }}>
                        {/* Quote Number */}
                        <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>رقم عرض السعر</label>
                          <input
                            type="text"
                            className="input-field w-full"
                            style={{
                              height: '44px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '0 12px',
                              fontSize: '0.95rem',
                              fontWeight: 'bold',
                              color: '#0f766e',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            value={formData.quoteNumber || ''}
                            onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                            placeholder="تلقائي (مثل Q26-0001)..."
                          />
                        </div>

                        {/* Customer - 30% width */}
                        <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>العميل <span className="text-red-500">*</span></label>
                          <Select
                            options={customers.map(c => ({ value: c.id, label: c.name, customer: c }))}
                            value={formData.customerId ? { value: formData.customerId, label: formData.customerName } : null}
                            onChange={(selected) => setFormData({ ...formData, customerId: selected ? selected.value : '', customerName: selected ? selected.label : '' })}
                            styles={customSelectStyles}
                            placeholder="اختر العميل..."
                          />
                        </div>

                        {/* Date */}
                        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>تاريخ العرض</label>
                          <Flatpickr
                            className="input-field w-full"
                            value={formData.quoteDate}
                            onChange={([d]) => setFormData({ ...formData, quoteDate: getLocalDateStr(d) })}
                            options={{ dateFormat: 'Y-m-d' }}
                            style={{
                              height: '44px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '0 12px',
                              fontSize: '0.95rem',
                              fontWeight: 'bold',
                              color: '#1e293b',
                              backgroundColor: 'white',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                          />
                        </div>

                        {/* Validity */}
                        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>فترة الصلاحية</label>
                          <Select
                            options={[
                              ...(globalSettings.quoteValidities?.map(v => ({ value: v, label: v })) || []),
                              { value: 'CREATE_NEW_VALIDITY', label: '➕ إنشاء صلاحية جديدة...' }
                            ]}
                            value={formData.validity ? { value: formData.validity, label: formData.validity } : null}
                            onChange={async (selected) => {
                              if (selected && selected.value === 'CREATE_NEW_VALIDITY') {
                                const { value: newVal } = await Swal.fire({
                                  title: 'إنشاء فترة صلاحية جديدة',
                                  input: 'text',
                                  inputPlaceholder: 'مثال: 10 أيام أو 3 أسابيع...',
                                  showCancelButton: true,
                                  confirmButtonText: 'إضافة وحفظ',
                                  cancelButtonText: 'إلغاء',
                                  confirmButtonColor: '#0f766e',
                                  inputValidator: (value) => {
                                    if (!value) {
                                      return 'يرجى كتابة فترة الصلاحية!';
                                    }
                                  }
                                });
                                if (newVal) {
                                  const updatedList = [...(globalSettings.quoteValidities || []), newVal];
                                  const updatedSettings = { ...globalSettings, quoteValidities: updatedList };
                                  try {
                                    await saveGlobalSettings(updatedSettings);
                                    setGlobalSettings(updatedSettings);
                                    setFormData({ ...formData, validity: newVal });
                                    Swal.fire({
                                      title: 'تم الحفظ',
                                      text: 'تم إضافة فترة الصلاحية بنجاح إلى الإعدادات وتحديدها.',
                                      icon: 'success',
                                      timer: 2000,
                                      showConfirmButton: false
                                    });
                                  } catch (e) {
                                    console.error(e);
                                    Swal.fire('خطأ', 'تعذر حفظ فترة الصلاحية الجديدة', 'error');
                                  }
                                }
                              } else {
                                setFormData({ ...formData, validity: selected ? selected.value : '' });
                              }
                            }}
                            styles={customSelectStyles}
                            placeholder="اختر الصلاحية..."
                            isSearchable={false}
                          />
                        </div>

                        {/* Status */}
                        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>حالة العرض</label>
                          <Select
                            options={globalSettings.quoteStatuses?.map(s => ({ value: s, label: s })) || []}
                            value={formData.status ? { value: formData.status, label: formData.status } : null}
                            onChange={(selected) => setFormData({ ...formData, status: selected ? selected.value : '' })}
                            styles={customSelectStyles}
                            placeholder="اختر الحالة..."
                            isSearchable={false}
                          />
                        </div>

                        {/* Payment Method */}
                        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>طريقة الدفع</label>
                          <Select
                            options={[
                              { value: 'كاش', label: 'كاش' },
                              { value: 'ذمم', label: 'ذمم' }
                            ]}
                            value={formData.paymentMethod ? { value: formData.paymentMethod, label: formData.paymentMethod } : { value: 'كاش', label: 'كاش' }}
                            onChange={(selected) => setFormData({ ...formData, paymentMethod: selected ? selected.value : 'كاش' })}
                            styles={customSelectStyles}
                            placeholder="طريقة الدفع..."
                            isSearchable={false}
                          />
                        </div>
                      </div>

                      {/* Row 2: Terms & Notes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                            <button
                              type="button"
                              onClick={() => setShowTermsList(!showTermsList)}
                              style={{
                                height: '42px',
                                backgroundColor: '#ffffff',
                                color: '#0f766e',
                                border: '1.5px solid #0f766e',
                                borderRadius: '10px',
                                padding: '0 20px',
                                fontSize: '13.5px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                            >
                              <SlidersHorizontal size={16} style={{ color: '#0f766e' }} />
                              <span>تعديل الشروط والأحكام</span>
                            </button>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px', marginRight: '4px' }}>
                            {formData.terms.length > 0
                              ? formData.terms.join('، ')
                              : 'بدون شروط مضافة'
                            }
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>ملاحظة إضافية (اختياري)</label>
                          <input
                            type="text"
                            className="input-field w-full"
                            style={{
                              height: '42px',
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '0 12px',
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: '#1e293b',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="أضف ملاحظة خاصة بالعرض..."
                          />
                        </div>
                      </div>

                      {showTermsList && (
                        <div style={{ width: '100%', borderTop: '1px dashed #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {globalSettings.quoteTerms?.map((term, i) => {
                              const isSelected = formData.terms.includes(term);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newTerms = isSelected
                                      ? formData.terms.filter(t => t !== term)
                                      : [...formData.terms, term];
                                    setFormData({ ...formData, terms: newTerms });
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: isSelected ? '1.5px solid #0f766e' : '1.5px solid #e2e8f0',
                                    backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                                    color: isSelected ? '#0f766e' : '#64748b',
                                    fontSize: '12.5px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    style={{
                                      accentColor: '#0f766e',
                                      cursor: 'pointer',
                                      width: '14px',
                                      height: '14px'
                                    }}
                                  />
                                  <span>{term}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleAddNewTerm}
                              style={{
                                height: '36px',
                                backgroundColor: '#f0fdfa',
                                color: '#0f766e',
                                border: '1.5px dashed #0f766e',
                                borderRadius: '8px',
                                padding: '0 16px',
                                fontSize: '12.5px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ccfbf1'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                            >
                              <Plus size={14} style={{ color: '#0f766e' }} />
                              <span>إنشاء شرط جديد</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desktop Items Table */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '800' }}>الأصناف والمنتجات</h3>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: '#f0fdfa',
                            color: '#0f766e',
                            border: '1px solid #ccfbf1',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} />
                          <span>إضافة سطر جديد</span>
                        </button>
                      </div>

                      <div style={{ overflow: 'visible', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', textAlign: 'right' }}>
                          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '4%', textAlign: 'center' }}>#</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '45%', minWidth: '300px' }}>الصنف / الوصف</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '9%', textAlign: 'center', minWidth: '100px' }}>الضريبة (%)</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '7%', textAlign: 'center' }}>الكمية</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '10%', textAlign: 'center' }}>سعر الوحدة (د.أ)</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '11%', textAlign: 'center' }}>قيمة الضريبة (د.أ)</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '9%', textAlign: 'center' }}>الإجمالي (د.أ)</th>
                              <th style={{ padding: '12px 10px', color: '#475569', fontWeight: '800', fontSize: '13px', borderBottom: '1px solid #e2e8f0', width: '4%', textAlign: 'center' }}>إجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.items.map((item, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>
                                  {String(index + 1).padStart(2, '0')}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <Select
                                    options={stock.filter(s => s.category === 'بضاعة جاهزة' || (s.category && s.category.includes('بضاعة'))).map(s => ({ value: `${s.name}***${s.warehouse || 'الرئيسي'}`, label: `${s.name} (${s.warehouse || 'الرئيسي'}) - المتوفر: ${Number(s.quantity || 0)}` }))}
                                    value={item.productName ? { value: `${item.productName}***${item.warehouse || 'الرئيسي'}`, label: `${item.productName} (${item.warehouse || 'الرئيسي'})` } : null}
                                    maxMenuHeight={450}
                                    onChange={(selected) => {
                                      const newItems = [...formData.items];
                                      if (selected) {
                                        const parts = selected.value.split('***');
                                        const prodName = parts[0];
                                        
                                        const isDuplicate = formData.items.some((it, i) => i !== index && it.productName === prodName);
                                        if (isDuplicate) {
                                          import('sweetalert2').then(({ default: Swal }) => {
                                            Swal.fire({
                                              toast: true,
                                              position: 'top-end',
                                              icon: 'warning',
                                              title: 'هذا الصنف موجود مسبقاً في عرض السعر',
                                              showConfirmButton: false,
                                              timer: 2000
                                            });
                                          });
                                          return;
                                        }
                                        
                                        newItems[index].productName = prodName;
                                        newItems[index].warehouse = parts[1];
                                      } else {
                                        newItems[index].productName = '';
                                        newItems[index].warehouse = '';
                                      }
                                      setFormData({ ...formData, items: newItems });
                                    }}
                                    placeholder="اختر الصنف أو الوصف..."
                                    isSearchable={true}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    styles={{
                                      ...customSelectStyles,
                                      control: (base) => ({ ...base, minHeight: '40px', height: '40px', borderRadius: '10px' })
                                    }}
                                  />
                                  {item.productName && (() => {
                                    const stockItem = stock.find(s => s.name === item.productName && (s.warehouse || 'الرئيسي') === (item.warehouse || 'الرئيسي') && (s.category === 'بضاعة جاهزة' || (s.category && s.category.includes('بضاعة'))));
                                    const availableQty = stockItem ? Number(stockItem.quantity || 0) : 0;
                                    const warehouseName = stockItem ? (stockItem.warehouse || 'الرئيسي') : 'الرئيسي';
                                    return (
                                      <div style={{
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: availableQty > 0 ? '#0f766e' : '#ef4444',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap'
                                      }}>
                                        <span>📦 المتوفر: {availableQty}</span>
                                        <span style={{ color: '#cbd5e1' }}>|</span>
                                        <span>🏢 المستودع: {warehouseName}</span>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <Select
                                    options={globalSettings.quoteTaxRates?.map(r => ({ value: r, label: isNaN(r) ? String(r) : `${r}%` })) || []}
                                    value={item.taxRate !== undefined ? { value: item.taxRate, label: isNaN(item.taxRate) ? String(item.taxRate) : `${item.taxRate}%` } : { value: 'غير شامل', label: 'غير شامل' }}
                                    onChange={(selected) => {
                                      handleItemChange(index, 'taxRate', selected ? selected.value : 0);
                                    }}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    styles={{
                                      ...customSelectStyles,
                                      control: (base) => ({ ...base, minHeight: '40px', height: '40px', borderRadius: '10px', minWidth: '85px' }),
                                      valueContainer: (base) => ({ ...base, padding: '0 4px' }),
                                      dropdownIndicator: (base) => ({ ...base, padding: '4px' })
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <input
                                    type="text"
                                    className="input-field text-center font-bold text-base"
                                    style={{
                                      height: '40px',
                                      width: '100%',
                                      maxWidth: '70px',
                                      marginBottom: 0,
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '10px',
                                      backgroundColor: '#ffffff',
                                      fontWeight: 'bold',
                                      fontSize: '14px',
                                      display: 'inline-block'
                                    }}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      let val = e.target.value.replace(/[^0-9]/g, '');
                                      if (val.length > 4) {
                                        val = val.substring(0, 4);
                                      }
                                      handleItemChange(index, 'quantity', val);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <input
                                    type="text"
                                    className="input-field text-center font-bold text-base text-primary"
                                    style={{
                                      height: '40px',
                                      width: '100%',
                                      maxWidth: '90px',
                                      marginBottom: 0,
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '10px',
                                      backgroundColor: '#ffffff',
                                      fontWeight: 'bold',
                                      fontSize: '14px',
                                      display: 'inline-block'
                                    }}
                                    value={item.price}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      val = val.replace('-', '');
                                      val = val.replace(/[^0-9.]/g, '');
                                      const dots = val.split('.');
                                      if (dots.length > 2) {
                                        val = dots[0] + '.' + dots.slice(1).join('');
                                      }
                                      const parts = val.split('.');
                                      if (parts[0].length > 4) {
                                        parts[0] = parts[0].substring(0, 4);
                                        val = parts.join('.');
                                      }
                                      handleItemChange(index, 'price', val);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#64748b', fontFamily: 'monospace' }}>
                                  {((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0) * ((parseFloat(item.taxRate) || 0) / 100)).toFixed(2)}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', fontFamily: 'monospace' }}>
                                  {(parseFloat(item.total) || 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="icon-btn icon-btn-delete"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={formData.items.length === 1}
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '8px',
                                      border: '1px solid #fee2e2',
                                      backgroundColor: '#fff5f5',
                                      color: '#ef4444',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 4. Desktop ملخص الفاتورة الأفقي */}
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>الإجمالي قبل الضريبة</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>{calculateSubtotal().toFixed(2)} د.أ</span>
                      </div>
                      <div style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>إجمالي الضريبة</span>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>{calculateTax().toFixed(2)} د.أ</span>
                      </div>
                      <div style={{ width: '1px', height: '40px', backgroundColor: '#e2e8f0' }}></div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '14px', color: '#0f766e', fontWeight: '900' }}>الإجمالي بعد الضريبة</span>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#0f766e', fontFamily: 'monospace' }}>{calculateTotal().toFixed(2)} د.أ</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Footer Buttons */}
                  <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100" style={{ borderColor: '#e2e8f0' }}>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSave()}
                        style={{
                          backgroundColor: '#0f766e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '10px 28px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span>متابعة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave('مسودة')}
                        style={{
                          backgroundColor: '#ffffff',
                          color: '#0f766e',
                          border: '1.5px solid #0f766e',
                          borderRadius: '10px',
                          padding: '10px 24px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Save size={18} style={{ color: '#0f766e' }} /> <span>حفظ كمسودة</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminQuotes;
