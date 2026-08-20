import React, { useState, useEffect, useRef } from 'react';
import { Tag, Plus, Search, Trash2, Printer, Edit2, Copy, Share2, Eye, RefreshCw, FileText, CheckCircle2, ChevronDown, User, Check, X, SlidersHorizontal, GripVertical, ArrowUp, ArrowDown, ChevronsUpDown, MoveVertical, TrendingUp, MoreHorizontal, Calendar, Percent, ChevronLeft, ShieldAlert } from 'lucide-react';
import { getPriceLists, savePriceList, deletePriceList, getCustomers, getGlobalSettings, canPerformAction, addLog, getMasterProducts, saveMasterProduct, getStock, saveStockItem } from '../../store';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import { buildVisiblePriceListCatalog } from '../../utils/priceListCatalog';
import { masterPriceListCatalog } from '../../data/masterPriceListCatalog';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);
import Select from '../../components/SearchSelect';

const getLocalDateStr = (d = new Date()) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const roundMoney = (value) => Math.round(((Number(value) || 0) + Number.EPSILON) * 10) / 10;
const formatMoney = (value) => roundMoney(value).toFixed(1);

const WordIcon = ({ size = 26 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
    <path fill="#185ABD" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path fill="#fff" d="M14 3v5h5M7 13l1.5-4h1.5l1 3 1-3h1.5L12 13h-1.5l-.5-1.5-.5 1.5H8.5z" />
  </svg>
);

const ExcelIcon = ({ size = 26 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
    <path fill="#185C37" d="M11 20H4a1 1 0 01-1-1V5a1 1 0 011-1h7z" />
    <path fill="#21A366" d="M21 5v14a1 1 0 01-1 1h-9V4h9a1 1 0 011 1z" />
    <path fill="#fff" d="M12.5 16l2.5-4-2.5-4h2.5l1.5 2.5L18 8h2.5l-2.5 4 2.5 4h-2.5l-1.5-2.5L15 16z" />
  </svg>
);


const AdminPriceLists = ({ user }) => {
  const [priceLists, setPriceLists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('');

  // Master Catalog State & Tabs
  const [activeTab, setActiveTab] = useState('master'); // 'master' | 'customers'
  const [masterProducts, setMasterProducts] = useState([]);
  const [masterSortConfig, setMasterSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [stockItems, setStockItems] = useState([]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMasterSort = (key) => {
    let direction = 'asc';
    if (masterSortConfig.key === key && masterSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setMasterSortConfig({ key, direction });
  };

  const sortedMasterProducts = React.useMemo(() => {
    let sortableItems = [...masterProducts];
    if (masterSortConfig.key) {
      sortableItems.sort((a, b) => {
        let aVal = a[masterSortConfig.key];
        let bVal = b[masterSortConfig.key];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return masterSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return masterSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [masterProducts, masterSortConfig]);

  // Table Drag-Scroll & Ref State
  const tableScrollRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTopPos, setScrollTopPos] = useState(0);

  const handleTableMouseDown = (e) => {
    if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'SVG', 'PATH'].includes(e.target.tagName)) return;
    setIsMouseDown(true);
    if (tableScrollRef.current) {
      setStartY(e.pageY - tableScrollRef.current.offsetTop);
      setScrollTopPos(tableScrollRef.current.scrollTop);
    }
  };

  const handleTableMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleTableMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleTableMouseMove = (e) => {
    if (!isMouseDown || !tableScrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - tableScrollRef.current.offsetTop;
    const walk = (y - startY) * 2.8; // Fast 2.8x scroll speed multiplier!
    tableScrollRef.current.scrollTop = scrollTopPos - walk;
  };

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [showTermsPanel, setShowTermsPanel] = useState(false);

  // Master Product Modal State & Handlers
  const [modalSortConfig, setModalSortConfig] = useState({ key: '', direction: '' });
  const [previewSortConfig, setPreviewSortConfig] = useState({ key: '', direction: '' });

  const handlePreviewSort = (key) => {
    let direction = 'desc';
    if (previewSortConfig.key === key && previewSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setPreviewSortConfig({ key, direction });
  };

  const sortedPreviewItems = React.useMemo(() => {
    if (!selectedList || !selectedList.items) return [];
    let sortable = [...selectedList.items];
    if (previewSortConfig.key) {
      sortable.sort((a, b) => {
        let aVal = a[previewSortConfig.key];
        let bVal = b[previewSortConfig.key];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return previewSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return previewSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [selectedList, previewSortConfig]);

  const handleModalSort = (key) => {
    let direction = 'asc';
    if (modalSortConfig.key === key && modalSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setModalSortConfig({ key, direction });

    const sortedItems = [...formData.items].sort((a, b) => {
      let aVal = a[key] || '';
      let bVal = b[key] || '';
      if (key === 'basePrice' || key === 'discountPercent' || key === 'discountedPrice') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFormData(prev => ({ ...prev, items: sortedItems }));
  };

  const [masterSearchTerm, setMasterSearchTerm] = useState('');
  const debouncedMasterSearchTerm = useDebounce(masterSearchTerm, 300);
  const [selectedMasterIds, setSelectedMasterIds] = useState([]);
  const [masterCategoryFilter, setMasterCategoryFilter] = useState('');
  const [masterDepartmentFilter, setMasterDepartmentFilter] = useState('');
  const [requestedQuantities, setRequestedQuantities] = useState({});
  const [discountInputs, setDiscountInputs] = useState({});
  const [listPriceInputs, setListPriceInputs] = useState({});
  const canEditMasterPricing = canPerformAction(user, 'EDIT', 'pricelists', globalSettings);
  const canDeleteMasterPricing = canPerformAction(user, 'DELETE', 'pricelists', globalSettings) || canEditMasterPricing;

  const defaultQuantityTiers = (product) => {
    const base = Number(product?.basePrice) || 0;
    const target = Number(product?.targetPrice) || Number((base * (1 - (Number(product?.defaultDiscount) || 0) / 100)).toFixed(3));
    const minimum = Number(product?.minimumPrice) || target;
    const discountPercent = Number(product?.defaultDiscount) || (base ? getDiscountPercent(base, target) : 0);
    return [
      { from: 1, to: 49, listPrice: base, targetPrice: target, minimumPrice: minimum, discountPercent, priceListDiscountPercent: discountPercent },
      { from: 50, to: 199, listPrice: base, targetPrice: target, minimumPrice: minimum, discountPercent, priceListDiscountPercent: discountPercent },
      { from: 200, to: 499, listPrice: base, targetPrice: target, minimumPrice: minimum, discountPercent, priceListDiscountPercent: discountPercent },
      { from: 500, to: 999, listPrice: base, targetPrice: target, minimumPrice: minimum, discountPercent, priceListDiscountPercent: discountPercent },
      { from: 1000, to: null, listPrice: base, targetPrice: target, minimumPrice: minimum, discountPercent, priceListDiscountPercent: discountPercent }
    ];
  };

  const getProductTiers = (product) => {
    if (product?.quantityTiers?.length) return product.quantityTiers;
    if (product?.pricingSnapshot?.quantityTiers?.length) return product.pricingSnapshot.quantityTiers;
    return defaultQuantityTiers(product);
  };
  const getActiveTier = (product) => {
    const qty = Math.max(1, Number(requestedQuantities[product.id]) || 1);
    const tiers = [...getProductTiers(product)].sort((a, b) => Number(a.from) - Number(b.from));
    return tiers.find(t => qty >= Number(t.from || 0) && (t.to === null || t.to === '' || qty <= Number(t.to))) || tiers[tiers.length - 1];
  };
  const getDiscountPercent = (listPrice, targetPrice) => {
    const list = Number(listPrice) || 0;
    if (!list) return 0;
    return Math.max(0, ((list - (Number(targetPrice) || 0)) / list) * 100);
  };

  const getTierListPrice = (product, tier) => {
    const hasCostingDiscount = tier?.costingDiscountPercent !== undefined && tier?.costingDiscountPercent !== null && tier?.costingDiscountPercent !== '';
    const isLegacyCostingTier = product?.pricingApprovedAt
      && hasCostingDiscount
      && Number(tier?.costingDiscountPercent) > 0
      && Number(tier?.priceListDiscountPercent) === 0
      && Number(tier?.discountPercent) === 0;
    if (isLegacyCostingTier) return Number(product?.basePrice) || 0;
    if (tier?.listPrice !== undefined && tier?.listPrice !== null && tier?.listPrice !== '') return Number(tier.listPrice) || 0;
    if (tier?.salePrice !== undefined && tier?.salePrice !== null && tier?.salePrice !== '') return Number(tier.salePrice) || 0;
    if (product?.pricingApprovedAt && tier?.targetPrice !== undefined && tier?.targetPrice !== null && tier?.targetPrice !== '') return Number(tier.targetPrice) || 0;
    return Number(product?.basePrice) || 0;
  };

  const getTierPriceListDiscount = (product, tier) => {
    if (tier?.priceListDiscountOverridden === true) {
      return Number(tier?.priceListDiscountPercent) || 0;
    }
    if (tier?.costingDiscountPercent !== undefined && tier?.costingDiscountPercent !== null && tier?.costingDiscountPercent !== '') {
      return Number(tier.costingDiscountPercent) || 0;
    }
    if (tier?.priceListDiscountPercent !== undefined && tier?.priceListDiscountPercent !== null && tier?.priceListDiscountPercent !== '') {
      return Number(tier.priceListDiscountPercent) || 0;
    }
    if (product?.pricingApprovedAt && tier?.listPrice === undefined) return Number(tier?.discountPercent) > 50 ? Number(tier.discountPercent) : 0;
    if (tier?.discountPercent !== undefined && tier?.discountPercent !== null && tier?.discountPercent !== '') return Number(tier.discountPercent) || 0;
    return getDiscountPercent(getTierListPrice(product, tier), tier?.targetPrice);
  };

  const getTierPriceAfterDiscount = (product, tier) => {
    if (tier?.targetPrice !== undefined && tier?.targetPrice !== null && tier?.targetPrice !== '') {
      return Number(tier.targetPrice) || 0;
    }
    if (tier?.salePrice !== undefined && tier?.salePrice !== null && tier?.salePrice !== '') {
      return Number(tier.salePrice) || 0;
    }
    const listPrice = getTierListPrice(product, tier);
    return listPrice * (1 - getTierPriceListDiscount(product, tier) / 100);
  };

  const handleTierListPriceChange = async (product, activeTier, rawValue, shouldSave = false) => {
    if (!canEditMasterPricing || !activeTier) return;
    if (rawValue !== '' && !/^\d{0,6}(\.\d{0,3})?$/.test(rawValue)) return;

    const inputKey = `${product.id}-${activeTier.from}`;
    setListPriceInputs(previous => ({ ...previous, [inputKey]: rawValue }));
    if (rawValue === '' && !shouldSave) return;

    const parsedListPrice = rawValue === '' ? 0 : Number(rawValue);
    if (!Number.isFinite(parsedListPrice) || parsedListPrice < 0) return;
    const listPrice = roundMoney(parsedListPrice);

    const priceListDiscountPercent = getTierPriceListDiscount(product, activeTier);
    const targetPrice = roundMoney(listPrice * (1 - priceListDiscountPercent / 100));
    const tiers = getProductTiers(product);
    const firstTierFrom = Math.min(...tiers.map(tier => Number(tier.from) || 1));
    const quantityTiers = tiers.map(tier => (
      Number(tier.from) === Number(activeTier.from)
        ? { ...tier, listPrice, targetPrice, priceListDiscountPercent }
        : tier
    ));
    const updatedProduct = {
      ...product,
      basePrice: Number(activeTier.from) === firstTierFrom ? listPrice : product.basePrice,
      quantityTiers
    };

    setMasterProducts(previous => previous.map(item => item.id === product.id ? updatedProduct : item));

    if (shouldSave) {
      setListPriceInputs(previous => {
        const next = { ...previous };
        delete next[inputKey];
        return next;
      });
      await handleInlineMasterBlur(updatedProduct);
    }
  };

  const handleTierDiscountChange = async (product, activeTier, rawValue, shouldSave = false) => {
    if (!canEditMasterPricing || !activeTier) return;
    if (rawValue !== '' && !/^\d{0,2}$/.test(rawValue)) return;

    const inputKey = `${product.id}-${activeTier.from}`;
    setDiscountInputs(previous => ({ ...previous, [inputKey]: rawValue }));
    if (rawValue === '' && !shouldSave) return;

    const discountValue = rawValue === '' ? 0 : Number(rawValue);
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 99) return;

    const listPrice = getTierListPrice(product, activeTier);
    const targetPrice = roundMoney(listPrice * (1 - discountValue / 100));
    const quantityTiers = getProductTiers(product).map(tier => (
      Number(tier.from) === Number(activeTier.from)
        ? {
            ...tier,
            listPrice,
            targetPrice,
            discountPercent: discountValue,
            priceListDiscountPercent: discountValue,
            priceListDiscountOverridden: true
          }
        : tier
    ));
    const updatedProduct = { ...product, quantityTiers };

    setMasterProducts(previous => previous.map(item => item.id === product.id ? updatedProduct : item));

    if (shouldSave) {
      setDiscountInputs(previous => {
        const next = { ...previous };
        delete next[inputKey];
        return next;
      });
      if (discountValue > 50) {
        await Swal.fire({
          icon: 'warning',
          title: 'تنبيه: نسبة خصم مرتفعة',
          text: `نسبة الخصم المدخلة ${discountValue}% وتتجاوز 50%. يرجى التحقق منها قبل اعتماد السعر.`,
          confirmButtonText: 'تمت المراجعة',
          confirmButtonColor: '#ea580c',
          allowOutsideClick: false,
          allowEscapeKey: false
        });
      }
      await handleInlineMasterBlur(updatedProduct);
    }
  };

  const handleTierSelectionChange = (product, selectedTierFrom) => {
    setRequestedQuantities(previous => ({ ...previous, [product.id]: selectedTierFrom }));

    // Clear unfinished input from another tier so the newly selected tier's
    // approved costing values are rendered immediately.
    setListPriceInputs(previous => {
      const next = { ...previous };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${product.id}-`)) delete next[key];
      });
      return next;
    });
    setDiscountInputs(previous => {
      const next = { ...previous };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${product.id}-`)) delete next[key];
      });
      return next;
    });
  };

  const handleEditQuantityTiers = async (product) => {
    if (!canEditMasterPricing) return;
    const tiers = getProductTiers(product);
    const result = await MySwal.fire({
      title: `شرائح الكمية — ${product.name}`,
      width: 820,
      html: `<div dir="rtl" style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-family:inherit">
        <thead><tr><th style="padding:8px">من</th><th>إلى (فارغ = فأكثر)</th><th style="color:#16a34a">السعر بعد الخصم</th><th style="color:#dc2626">أقل سعر مسموح</th></tr></thead>
        <tbody>${tiers.map((t, i) => `<tr>
          <td><input id="tier-from-${i}" type="number" min="1" value="${t.from ?? ''}" class="swal2-input" style="width:130px;margin:6px"></td>
          <td><input id="tier-to-${i}" type="number" min="1" value="${t.to ?? ''}" class="swal2-input" style="width:150px;margin:6px"></td>
          <td><input id="tier-target-${i}" type="number" min="0" step="0.001" value="${t.targetPrice ?? 0}" class="swal2-input" style="width:150px;margin:6px"></td>
          <td><input id="tier-min-${i}" type="number" min="0" step="0.001" value="${t.minimumPrice ?? 0}" class="swal2-input" style="width:150px;margin:6px"></td>
        </tr>`).join('')}</tbody></table></div>`,
      showCancelButton: true,
      confirmButtonText: 'حفظ الشرائح', cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const values = tiers.map((_, i) => ({
          from: Number(document.getElementById(`tier-from-${i}`).value),
          to: document.getElementById(`tier-to-${i}`).value === '' ? null : Number(document.getElementById(`tier-to-${i}`).value),
          targetPrice: Number(document.getElementById(`tier-target-${i}`).value),
          minimumPrice: Number(document.getElementById(`tier-min-${i}`).value)
        }));
        for (let i = 0; i < values.length; i++) {
          const t = values[i];
          if (!t.from || (t.to !== null && t.to < t.from)) return Swal.showValidationMessage('تأكد من صحة نطاقات الكميات.');
          if (t.minimumPrice > t.targetPrice) return Swal.showValidationMessage('أقل سعر مسموح يجب ألا يزيد عن السعر بعد الخصم.');
          if (Number(t.targetPrice) > Number(product.basePrice || 0)) return Swal.showValidationMessage('السعر بعد الخصم يجب ألا يزيد عن سعر القائمة.');
          if (i > 0 && values[i - 1].to !== null && t.from <= values[i - 1].to) return Swal.showValidationMessage('شرائح الكمية متداخلة.');
        }
        return values;
      }
    });
    if (result.isConfirmed) {
      const updated = { ...product, quantityTiers: result.value };
      setMasterProducts(prev => prev.map(p => p.id === product.id ? updated : p));
      await handleInlineMasterBlur(updated);
      Swal.fire({ icon: 'success', title: 'تم حفظ شرائح الكمية', timer: 1200, showConfirmButton: false });
    }
  };

  const handleToggleMasterSelection = (id) => {
    setSelectedMasterIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMaster = (e, currentListIds) => {
    const visibleIds = [...new Set(currentListIds)];
    setSelectedMasterIds((previous) => e.target.checked
      ? [...new Set([...previous, ...visibleIds])]
      : previous.filter(id => !visibleIds.includes(id))
    );
  };

  const handleDeleteSelectedMaster = async () => {
    if (selectedMasterIds.length === 0) return;
    const result = await MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف ${selectedMasterIds.length} صنف من القائمة ولن تتمكن من استرجاعها!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'نعم، احذف المحدد!',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      try {
        let deletedCount = 0;
        for (const id of selectedMasterIds) {
          const product = masterProducts.find(item => item.id === id);
          if (!product) continue;
          await saveMasterProduct({
            id: String(id).startsWith('temp-') ? null : id,
            itemNumber: product.itemNumber || '',
            name: product.name || '',
            excludedFromPriceList: true,
            excludedAt: new Date().toISOString(),
            excludedBy: user?.name || user?.id || ''
          });
          deletedCount++;
        }
        setMasterProducts(prev => prev.filter(p => !selectedMasterIds.includes(p.id)));
        setSelectedMasterIds([]);
        MySwal.fire('تم الحذف!', `تم حذف ${deletedCount} صنف بنجاح.`, 'success');
      } catch (err) {
        MySwal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleOpenCreateMaster = (initialName = '') => {
    if (typeof initialName !== 'string') initialName = '';
    // Generate next item numbers mapping
    const nextItemNumbers = {};
    const allCategories = ['بضاعة جاهزة', ...(globalSettings.stockCategories || []).filter(c => c !== 'بضاعة جاهزة')];
    
    allCategories.forEach(cat => {
      // 1. Try to find the prefix from existing items in this category
      let categoryItems = stockItems.filter(p => p.category === cat && p.itemNumber);
      
      let prefix = '';
      if (categoryItems.length > 0) {
        for (const item of categoryItems) {
          const match = item.itemNumber.match(/^([A-Za-z]+-?)/);
          if (match) {
            prefix = match[1];
            break;
          }
        }
      }

      // 2. If no prefix found from existing items, fallback to fuzzy matching
      if (!prefix) {
        if (cat.includes('بضاعة جاهزة')) prefix = 'FG-';
        else if (cat.includes('مواد خام')) prefix = 'RM-';
        else if (cat.includes('تغليف') || cat.includes('تعبئة')) prefix = 'PK-';
        else if (cat.includes('قطع غيار')) prefix = 'SP-';
        else if (cat.includes('مستهلكات')) prefix = 'CS-';
        else prefix = 'ITM-';
      }

      // 3. Find the maximum number for this prefix across all products
      let maxNum = 0;
      stockItems.forEach(p => {
        if (p.itemNumber && p.itemNumber.startsWith(prefix)) {
          const numPart = p.itemNumber.substring(prefix.length);
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      });
      nextItemNumbers[cat] = `${prefix}${String(maxNum + 1).padStart(5, '0')}`;
    });

    const defaultCategory = 'بضاعة جاهزة';
    const initialItemNumber = nextItemNumbers[defaultCategory] || '';

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-primary"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
             <span>إضافة صنف جديد للمخزون</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="grid grid-cols-12 gap-x-8 gap-y-6">
            
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" placeholder="مثال: FG-00191" value="${initialItemNumber}" style="background: var(--surface); font-weight: bold; color: var(--primary-dark); text-align: center;" readonly>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="${initialName || ''}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="بضاعة جاهزة" selected>بضاعة جاهزة</option>
                ${(globalSettings.stockCategories || []).map(c => c !== 'بضاعة جاهزة' ? '<option value="' + c + '">' + c + '</option>' : '').join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled selected>اختر المخزن</option>
                ${(globalSettings.warehouses || []).map(w => '<option value="' + w + '">' + w + '</option>').join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الموقع (داخل المخزن)</label>
              <select id="swal-location" class="premium-input">
                <option value="">-- بدون موقع --</option>
                ${(globalSettings.stockLocations || []).map(loc => '<option value="' + loc + '">' + loc + '</option>').join('')}
              </select>
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                ${(globalSettings.stockColors || []).map(c => '<option value="' + c + '">' + c + '</option>').join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2; margin-bottom: 0;" value="0">
                <select id="swal-unit" class="premium-input" style="flex: 1; margin-bottom: 0;">
                  ${(globalSettings.stockUnits || []).map(u => '<option value="' + u + '">' + u + '</option>').join('')}
                </select>
              </div>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="0">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" selected>إدخال</option>
                <option value="إخراج">إخراج</option>
                <option value="إتلاف">إتلاف</option>
                <option value="جرد وتسوية">جرد وتسوية</option>
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>تاريخ آخر حركة</label>
              <input id="swal-lastMovementDate" type="date" class="premium-input" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4">
              <label>آخر مستلم / مسؤول</label>
              <input id="swal-lastRecipient" class="premium-input" placeholder="اسم الشخص" value="">
            </div>

            <div class="premium-form-group col-span-12 md:col-span-12">
              <label>ملاحظات</label>
              <textarea id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." style="min-height: 80px;"></textarea>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الصنف الجديد',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        const catSelect = document.getElementById('swal-category');
        const numInput = document.getElementById('swal-itemNumber');
        if (catSelect && numInput) {
          catSelect.addEventListener('change', (e) => {
             numInput.value = nextItemNumbers[e.target.value] || '';
          });
        }
      },
      preConfirm: () => {
        const data = {
          itemNumber: document.getElementById('swal-itemNumber').value,
          itemCode: document.getElementById('swal-itemCode').value,
          name: document.getElementById('swal-name').value,
          category: document.getElementById('swal-category').value,
          warehouse: document.getElementById('swal-warehouse').value,
          location: document.getElementById('swal-location').value,
          spec: document.getElementById('swal-spec').value,
          quantity: Number(document.getElementById('swal-quantity').value),
          unit: document.getElementById('swal-unit').value,
          minLimit: Number(document.getElementById('swal-minLimit').value),
          lastMovement: document.getElementById('swal-lastMovement').value,
          lastMovementDate: document.getElementById('swal-lastMovementDate').value,
          lastRecipient: document.getElementById('swal-lastRecipient').value,
          notes: document.getElementById('swal-notes').value,
          id: null
        };

        if (!data.name || !data.warehouse) {
          Swal.showValidationMessage('يرجى ملء الاسم والمخزن');
          return false;
        }

        return data;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await saveStockItem(result.value);
        await fetchData();
        Swal.fire({
          icon: 'success',
          title: 'تم الحفظ بنجاح',
          timer: 1500,
        });
      }
    });
  };

  const handleInlineMasterChange = (id, field, value) => {
    if (field === 'defaultDiscount' && value !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(value)) return;
    if (field === 'basePrice' && value !== '' && !/^\d{0,4}(\.\d{0,2})?$/.test(value)) return;

    setMasterProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleInlineMasterBlur = async (product) => {
    try {
      const payload = {
        itemNumber: product.itemNumber,
        name: product.name,
        basePrice: Number(product.basePrice) || 0,
        defaultDiscount: Number(product.defaultDiscount) || 0,
        targetPrice: Number(product.targetPrice) || 0,
        minimumPrice: Number(product.minimumPrice) || 0,
        quantityTiers: getProductTiers(product),
        pricingSnapshot: product.pricingSnapshot || null,
        unit: product.unit || '',
        category: product.category || '',
        department: product.department || '',
        spec: product.spec || '',
        notes: product.notes || ''
      };
      
      if (String(product.id).startsWith('temp-')) {
        payload.id = null; 
      } else {
        payload.id = product.id;
      }
      
      const saved = await saveMasterProduct(payload);
      
      if (String(product.id).startsWith('temp-') && saved && saved.id) {
         setMasterProducts(prev => prev.map(p => p.id === product.id ? { ...p, id: saved.id } : p));
      }
    } catch (err) {
      console.error('Error saving inline master product:', err);
    }
  };

  const handleDeleteMaster = async (product) => {
    const res = await Swal.fire({
      title: 'هل أنت متأكد من الحذف؟',
      text: 'حذف الصنف من القائمة الأم لن يؤثر على قوائم العملاء السابقة.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    });
    if (res.isConfirmed) {
      try {
        await saveMasterProduct({
          id: String(product.id).startsWith('temp-') ? null : product.id,
          itemNumber: product.itemNumber || '',
          name: product.name || '',
          excludedFromPriceList: true,
          excludedAt: new Date().toISOString(),
          excludedBy: user?.name || user?.id || ''
        });
        await fetchData();
        Swal.fire('تم الحذف!', 'تم حذف الصنف من قائمة الأسعار فقط، وبقي محفوظًا في المخزون.', 'success');
      } catch (err) {
        Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    customerName: '',
    customerId: '',
    customerPhone: '',
    notes: '',
    terms: [],
    bulkDiscount: '',
    items: []
  });

  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...formData.items];
    const [reorderedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, reorderedItem);

    setFormData(prev => ({ ...prev, items: updated }));
    setDraggedIndex(null);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plData, custData, setts, masterData, stockData] = await Promise.all([
        getPriceLists(),
        getCustomers(),
        getGlobalSettings(),
        getMasterProducts(),
        getStock()
      ]);
      setPriceLists(plData || []);
      setCustomers(custData || []);
      setGlobalSettings(setts || {});
      
      let currentMasterData = masterData || [];
      if (!masterData || masterData.length === 0) {
        console.log("Migrating static catalog to Firebase masterProducts...");
        const migratedProducts = [];
        for (const item of masterPriceListCatalog) {
          const product = {
            name: item.name,
            basePrice: item.basePrice || 0,
            defaultDiscount: item.defaultDiscount || 0,
            notes: item.notes || ''
          };
          const savedProduct = await saveMasterProduct(product);
          migratedProducts.push(savedProduct);
        }
        currentMasterData = migratedProducts;
      }
      
      setStockItems(stockData || []);

      // Use the same catalog builder as the costing calculator so both screens
      // always expose exactly the same rows and count.
      const mergedProducts = buildVisiblePriceListCatalog(currentMasterData, stockData || []);

      // Sort with isFromStock true first
      mergedProducts.sort((a, b) => {
        if (a.isFromStock === b.isFromStock) return 0;
        return a.isFromStock ? -1 : 1;
      });

      setMasterProducts(mergedProducts);
    } catch (err) {
      console.error('Error fetching price lists data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    const defaultItems = masterProducts
      .filter(item => item.isFromStock !== false)
      .map(item => {
      const discount = item.defaultDiscount || 0;
      const base = item.basePrice || 0;
      const discounted = parseFloat((base * (1 - discount / 100)).toFixed(3));
      return {
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        itemNumber: item.itemNumber || '-',
        name: item.name,
        basePrice: base,
        discountPercent: discount,
        discountedPrice: discounted,
        notes: item.notes || ''
      };
    });

    setFormData({
      id: null,
      code: '',
      customerName: '',
      customerId: '',
      customerPhone: '',
      notes: '',
      terms: ['الأسعار شاملة التوصيل', 'الأسعار غير شاملة ضريبة المبيعات'],
      bulkDiscount: '',
      items: defaultItems
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (list) => {
    const initialTerms = list.terms && Array.isArray(list.terms) && list.terms.length > 0 
      ? list.terms 
      : (list.notes && typeof list.notes === 'string' && list.notes.includes(' . ') ? list.notes.split(' . ') : []);

    const cleanNotes = (list.notes && typeof list.notes === 'string' && list.notes.includes(' . ')) ? '' : (list.notes || '');

    setFormData({
      id: list.id,
      code: list.code || '',
      customerName: list.customerName || '',
      customerId: list.customerId || '',
      customerPhone: list.customerPhone || '',
      notes: cleanNotes,
      terms: initialTerms,
      bulkDiscount: '',
      items: (list.items || []).map(it => ({
        ...it,
        id: it.id || `item-${Math.random().toString(36).substr(2, 9)}`
      }))
    });
    setShowModal(true);
  };

  const handleApplyBulkDiscount = () => {
    const disc = parseFloat(formData.bulkDiscount);
    if (isNaN(disc) || disc < 0 || disc > 100) {
      Swal.fire('تنبيـه', 'يرجى إدخال نسبة خصم صحيحة بين 0 و 100', 'warning');
      return;
    }

    const updated = formData.items.map(item => {
      const base = parseFloat(item.basePrice) || 0;
      const discounted = parseFloat((base * (1 - disc / 100)).toFixed(3));
      return {
        ...item,
        discountPercent: disc,
        discountedPrice: discounted
      };
    });

    setFormData(prev => ({
      ...prev,
      items: updated
    }));

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `تم تطبيق خصم ${disc}% على جميع البنود`,
      showConfirmButton: false,
      timer: 2000
    });
  };

  const handleItemChange = (index, field, value) => {
    if (field === 'discountPercent' && value !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(value)) return;
    if (field === 'basePrice' && value !== '' && !/^\d{0,4}(\.\d{0,2})?$/.test(value)) return;

    const updated = [...formData.items];
    const item = { ...updated[index] };

    if (field === 'basePrice') {
      const base = parseFloat(value) || 0;
      item.basePrice = base;
      const disc = parseFloat(item.discountPercent) || 0;
      item.discountedPrice = parseFloat((base * (1 - disc / 100)).toFixed(3));
    } else if (field === 'discountPercent') {
      const disc = parseFloat(value) || 0;
      item.discountPercent = disc;
      const base = parseFloat(item.basePrice) || 0;
      item.discountedPrice = parseFloat((base * (1 - disc / 100)).toFixed(3));
    } else if (field === 'discountedPrice') {
      const discounted = parseFloat(value) || 0;
      item.discountedPrice = discounted;
      const base = parseFloat(item.basePrice) || 0;
      if (base > 0) {
        item.discountPercent = parseFloat((((base - discounted) / base) * 100).toFixed(2));
      }
    } else {
      item[field] = value;
    }

    updated[index] = item;
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleAddItemFromCatalog = (selectedOption) => {
    if (!selectedOption) return;
    const catItem = masterProducts.find(c => c.id === selectedOption.value);
    if (!catItem) return;

    const discount = catItem.defaultDiscount || 0;
    const base = catItem.basePrice || 0;
    const discounted = parseFloat((base * (1 - discount / 100)).toFixed(3));

    const newItem = {
      id: `item-${Math.random().toString(36).substr(2, 9)}`,
      name: catItem.name,
      basePrice: base,
      discountPercent: discount,
      discountedPrice: discounted,
      notes: catItem.notes || ''
    };

    setFormData(prev => ({
      ...prev,
      items: [newItem, ...prev.items]
    }));
  };

  const handleAddCustomItem = () => {
    const newItem = {
      id: `item-${Math.random().toString(36).substr(2, 9)}`,
      name: 'بند جديد',
      basePrice: 0,
      discountPercent: 0,
      discountedPrice: 0,
      notes: ''
    };

    setFormData(prev => ({
      ...prev,
      items: [newItem, ...prev.items]
    }));
  };

  const handleRemoveItem = (index) => {
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.customerName) {
      Swal.fire('خطأ', 'يرجى اختيار أو كتابة اسم الزبون', 'error');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      Swal.fire('خطأ', 'يرجى إضافة بند واحد على الأقل في قائمة الأسعار', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'جاري الحفظ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await savePriceList(formData);
      await fetchData();
      setShowModal(false);
      Swal.fire('تم الحفظ!', 'تم حفظ قائمة الأسعار للزبون بنجاح.', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('خطأ', 'حدث خطأ أثناء حفظ قائمة الأسعار', 'error');
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: 'هل أنت تأكد من الحذف؟',
      text: 'لن تتمكن من استرجاع قائمة الأسعار هذه بعد الحذف',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#ef4444'
    });

    if (res.isConfirmed) {
      try {
        await deletePriceList(id);
        await fetchData();
        Swal.fire('تم الحذف!', 'تم حذف قائمة الأسعار بنجاح.', 'success');
      } catch (err) {
        Swal.fire('خطأ', 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleCloneList = async (list) => {
    const { value: newCustomerName } = await Swal.fire({
      title: 'استنساخ قائمة الأسعار',
      input: 'text',
      inputLabel: 'ادخل اسم الزبون الجديد لاستنساخ القائمة له:',
      inputValue: `${list.customerName} - نسخة جديدة`,
      showCancelButton: true,
      confirmButtonText: 'استنساخ الآن',
      cancelButtonText: 'إلغاء',
      inputValidator: (value) => {
        if (!value) {
          return 'يرجى كتابة اسم الزبون الجديد!';
        }
      }
    });

    if (newCustomerName) {
      try {
        Swal.fire({ title: 'جاري الاستنساخ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const clonedData = {
          ...list,
          id: null,
          code: '',
          customerName: newCustomerName,
          notes: `نسخة مستنسخة من قائمة الزبون (${list.customerName})`
        };
        await savePriceList(clonedData);
        await fetchData();
        Swal.fire('تم الاستنساخ!', `تم إنشاء قائمة أسعار جديدة للزبون "${newCustomerName}".`, 'success');
      } catch (err) {
        Swal.fire('خطأ', 'فشل استنساخ قائمة الأسعار', 'error');
      }
    }
  };

  const handleShareWhatsApp = (list) => {
    const text = `*قائمة الأسعار المعتمدة للزبون: ${list.customerName}*\n*رقم القائمة:* ${list.code || '-'}\n*تاريخ التحديث:* ${list.updatedAt ? getLocalDateStr(new Date(list.updatedAt)) : '-'}\n-----------------------------\n` +
      (list.items || []).slice(0, 15).map(it => `• *${it.name}*: السعر الأساسي (${(parseFloat(it.basePrice)||0).toFixed(2)}) د.أ | الخصم (%${it.discountPercent}) | *السعر النهائي: ${(parseFloat(it.discountedPrice)||0).toFixed(2)} د.أ*`).join('\n') +
      `\n-----------------------------\n*ملاحظات:* ${list.notes || 'معتمدة'}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDirectPrint = (list) => {
    setSelectedList(list);
    setShowPreviewModal(true);
    setTimeout(() => {
      handlePrint();
    }, 150);
  };

  const handlePrint = () => {
    const printContent = document.querySelector('.printable-content');
    if (!printContent) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html dir="rtl">
        <head>
          <title>طباعة قائمة الأسعار</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
            @media print {
              @page { margin: 0.5cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
            body { font-family: 'Tajawal', system-ui, -apple-system, sans-serif; padding: 0; }
            /* Simple reset for table */
            table { width: 100%; border-collapse: collapse; font-size: 11px !important; text-align: right; }
            th, td { padding: 4px 6px !important; border: 1px solid #e2e8f0 !important; white-space: nowrap !important; }
            th { background-color: #f8fafc; font-weight: 800; color: #334155; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  if(window.frameElement) window.parent.document.body.removeChild(window.frameElement);
                }, 1000);
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const filteredLists = priceLists.filter(l => {
    const matchSearch = matchesSearch(
      [l.customerName, l.customerId, l.customerNumber, l.code, l.name, l.items],
      debouncedSearchTerm
    );
    const matchCust = selectedCustomerFilter ? String(l.customerId) === String(selectedCustomerFilter) : true;
    return matchSearch && matchCust;
  });

  const displayedMasterProducts = React.useMemo(() => {
    return sortedMasterProducts.filter(p => {
      const matchesText = matchesSearch(
        [p.name, p.itemNumber, p.code, p.category, p.spec],
        debouncedMasterSearchTerm
      );
      const matchesCategory = !masterCategoryFilter || p.category === masterCategoryFilter;
      const matchesDepartment = !masterDepartmentFilter || p.department === masterDepartmentFilter;
      return matchesText && matchesCategory && matchesDepartment;
    });
  }, [sortedMasterProducts, debouncedMasterSearchTerm, masterCategoryFilter, masterDepartmentFilter]);

  const warehouseAvailabilityIndex = React.useMemo(() => {
    const byItemNumber = new Map();
    const byName = new Map();
    const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const addQuantity = (map, key, warehouse, quantity) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, new Map());
      const warehouseMap = map.get(key);
      warehouseMap.set(warehouse, (warehouseMap.get(warehouse) || 0) + quantity);
    };

    (stockItems || []).forEach(item => {
      if (item.category !== 'بضاعة جاهزة') return;
      const quantity = Number(item.quantity) || 0;
      const warehouse = String(item.warehouse || 'غير محدد').trim();
      addQuantity(byItemNumber, normalize(item.itemNumber), warehouse, quantity);
      addQuantity(byName, normalize(item.name), warehouse, quantity);
    });

    return { byItemNumber, byName, normalize };
  }, [stockItems]);

  const getProductWarehouseAvailability = product => {
    const codeKey = warehouseAvailabilityIndex.normalize(product?.itemNumber === '-' ? '' : product?.itemNumber);
    const nameKey = warehouseAvailabilityIndex.normalize(product?.name);
    const warehouseMap = (codeKey && warehouseAvailabilityIndex.byItemNumber.get(codeKey))
      || warehouseAvailabilityIndex.byName.get(nameKey)
      || new Map();

    return [...warehouseMap.entries()]
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([warehouse, quantity]) => ({ warehouse, quantity: Number(quantity) }))
      .sort((a, b) => a.warehouse.localeCompare(b.warehouse, 'ar'));
  };


  const exportMasterToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "م,رقم الصنف,اسم الصنف,الوحدة,الفئة,القسم,من كمية,إلى كمية,سعر القائمة,نسبة الخصم,السعر بعد الخصم,أقل سعر مسموح\n";
    displayedMasterProducts.forEach((p, index) => {
      getProductTiers(p).forEach(t => {
        const tierListPrice = getTierListPrice(p, t);
        const tierDiscount = getTierPriceListDiscount(p, t);
        const row = [index + 1, `"${p.itemNumber || ''}"`, `"${p.name || ''}"`, `"${p.unit || 'قطعة'}"`, `"${p.category || ''}"`, `"${p.department || ''}"`, t.from, t.to ?? 'فأكثر', formatMoney(tierListPrice), `${tierDiscount.toFixed(2)}%`, formatMoney(t.targetPrice), formatMoney(t.minimumPrice)].join(",");
        csvContent += row + "\n";
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `القائمة_الرئيسية_للأسعار_${getLocalDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMasterToWord = () => {
    const tableHtml = document.getElementById('master-print-area').outerHTML;
    const header = "<html dir='rtl'><head><meta charset='utf-8'><title>القائمة الرئيسية للأسعار المعتمدة</title><style>input{border:none;}</style></head><body><h1 style='text-align:center;'>القائمة الرئيسية للأسعار المعتمدة</h1><br/>";
    const footer = "</body></html>";
    const html = header + tableHtml + footer;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `القائمة_الرئيسية_للأسعار_${getLocalDateStr()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportMasterToPDF = () => {
    const element = document.getElementById('master-pdf-wrapper');
    if (!element) return;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `القائمة_الرئيسية_للأسعار_${getLocalDateStr()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 1200 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save();
    }
  };

  const handleMasterPrint = () => {
    const printContent = document.getElementById('master-print-area');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html dir="rtl">
        <head>
          <title>طباعة القائمة الرئيسية للأسعار</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
            @media print {
              @page { margin: 0.5cm; size: landscape; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            }
            body { font-family: 'Tajawal', system-ui, -apple-system, sans-serif; padding: 0; direction: rtl; }
            table { width: 100%; border-collapse: collapse; font-size: 11px !important; text-align: center; }
            th, td { padding: 4px 6px !important; border: 1px solid #e2e8f0 !important; white-space: nowrap !important; }
            th { background-color: #f8fafc; font-weight: 800; color: #334155; }
            .no-print { display: none !important; }
            input { border: none !important; background: transparent !important; pointer-events: none; width: auto !important; min-width: 0 !important; color: #000 !important; font-weight: bold; font-family: inherit; font-size: inherit; text-align: center !important; outline: none; }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; color: #0f766e; margin-bottom: 20px;">القائمة الرئيسية للأسعار المعتمدة</h2>
          ${printContent.outerHTML}
          <script>
            window.onload = () => {
              // Convert inputs to their values so they print cleanly
              const inputs = document.querySelectorAll('input');
              inputs.forEach(inp => {
                const span = document.createElement('span');
                span.textContent = inp.value;
                span.style.fontWeight = 'bold';
                inp.parentNode.replaceChild(span, inp);
              });
              
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  if(window.frameElement) window.parent.document.body.removeChild(window.frameElement);
                }, 1000);
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      
      {/* Custom Scrollbar Style matching User Screenshot 100% */}
      <style>{`
        /* Force visible, prominent scrollbars to override index.css hidden scrollbars */
        .visible-scrollbar {
          scrollbar-width: auto !important;
          -ms-overflow-style: auto !important;
        }
        .visible-scrollbar::-webkit-scrollbar {
          width: 16px !important;
          height: 16px !important;
          display: block !important;
          background: transparent !important;
        }
        .visible-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc !important;
          border-radius: 8px !important;
          border-left: 1px solid #e2e8f0 !important;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 8px !important;
          border: 3px solid #f8fafc !important;
          min-height: 40px !important;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }

        /* Dropdown Menu Scrollbar */
        div[class*="-MenuList"] {
          max-height: 380px !important;
          scrollbar-width: auto !important;
          scrollbar-color: #78716c #f1f5f9 !important;
        }
        div[class*="-MenuList"]::-webkit-scrollbar {
          width: 14px !important;
          display: block !important;
        }
        div[class*="-MenuList"]::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-left: 1px solid #e2e8f0 !important;
        }
        div[class*="-MenuList"]::-webkit-scrollbar-thumb {
          background: #78716c !important;
          border-radius: 8px !important;
          border: 2px solid #f1f5f9 !important;
        }

      `}</style>

      {/* Header Banner */}
      {isMobile ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', border: '1.5px solid #ccfbf1', backgroundColor: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Tag size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
             <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>نظام قوائم الأسعار</h2>
             <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 'bold' }}>للزبائن</span>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '22px 28px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
              <Tag size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                  نظام قوائم الأسعار للزبائن
                </h1>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexDirection: 'row' }}>
        {/* Master Price List Tab (Right side in RTL) */}
        <button
          onClick={() => setActiveTab('master')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'master' ? '#0f766e' : '#fff',
            color: activeTab === 'master' ? '#fff' : '#475569',
            border: activeTab === 'master' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: isMobile ? '16px 8px' : '16px 12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            fontWeight: 'bold',
            fontSize: isMobile ? '12px' : '15px',
            boxShadow: activeTab === 'master' ? '0 4px 12px rgba(15,118,110,0.15)' : 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: activeTab === 'master' ? 'rgba(255,255,255,0.2)' : '#f0fdfa', color: activeTab === 'master' ? '#fff' : '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} />
          </div>
          <span style={{ flex: 1, textAlign: 'center', lineHeight: '1.4' }}>القائمة الرئيسية المعتمدة للأسعار</span>
          <span
            title="إجمالي الأصناف"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              minWidth: isMobile ? '70px' : '108px',
              padding: isMobile ? '6px 9px' : '8px 14px',
              borderRadius: '11px',
              backgroundColor: activeTab === 'master' ? 'rgba(255,255,255,0.16)' : '#ecfdf5',
              border: activeTab === 'master' ? '2px solid rgba(255,255,255,0.65)' : '2px solid #34d399',
              color: activeTab === 'master' ? '#fff' : '#047857',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '900',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === 'master' ? '0 3px 8px rgba(0,0,0,0.12)' : '0 3px 8px rgba(4,120,87,0.12)'
            }}
          >
            <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '950', lineHeight: 1 }}>{displayedMasterProducts.length}</span>
            {!isMobile && <span>صنفًا</span>}
          </span>
          <ChevronLeft size={16} style={{ opacity: 0.7 }} />
        </button>

        {/* Customer Prices Tab (Left side in RTL) */}
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            flex: 1,
            backgroundColor: activeTab === 'customers' ? '#0f766e' : '#fff',
            color: activeTab === 'customers' ? '#fff' : '#475569',
            border: activeTab === 'customers' ? 'none' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: isMobile ? '16px 8px' : '16px 12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            fontWeight: 'bold',
            fontSize: isMobile ? '12px' : '15px',
            boxShadow: activeTab === 'customers' ? '0 4px 12px rgba(15,118,110,0.15)' : 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: activeTab === 'customers' ? 'rgba(255,255,255,0.2)' : '#f0fdfa', color: activeTab === 'customers' ? '#fff' : '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <span style={{ flex: 1, textAlign: 'center', lineHeight: '1.4' }}>قوائم أسعار{isMobile && <br/>}العملاء</span>
          <ChevronLeft size={16} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {activeTab === 'customers' && (
        <>
          {/* Filter Bar */}
          {/* Filter Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: isMobile ? '16px' : '16px 22px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {isMobile ? (
          <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="بحث..."
                  style={{
                    width: '100%',
                    height: '48px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0 40px 0 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={20} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <div style={{ position: 'relative', width: '130px' }}>
                <select
                  style={{
                    width: '100%',
                    height: '48px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0 12px 0 32px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#334155',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                  value={selectedCustomerFilter}
                  onChange={(e) => setSelectedCustomerFilter(e.target.value)}
                >
                  <option value="">جميع الزبائن</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* Stats Block (Right in RTL) */}
              <div style={{ flex: 1, height: '76px', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={12} color="#0f766e" />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>إجمالي القوائم</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#0f766e', fontSize: '20px', fontWeight: '900' }}>{filteredLists.length}</span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>قائمة</span>
                </div>
              </div>

              {/* Create Button (Left in RTL) */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                style={{
                  flex: 2,
                  height: '76px',
                  backgroundColor: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>إنشاء قائمة أسعار<br/>جديدة</span>
                  <span style={{ fontSize: '9px', color: '#ccfbf1', marginTop: '2px' }}>ابدأ بإنشاء قائمة جديدة</span>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="بحث باسم الزبون أو كود القائمة..."
                  style={{ width: '100%', height: '40px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 38px 0 14px', fontSize: '13px', color: '#0f172a', backgroundColor: '#f8fafc', outline: 'none', fontWeight: 'bold' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
              <select style={{ height: '40px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 14px', fontSize: '13px', fontWeight: 'bold', color: '#334155', backgroundColor: '#f8fafc', outline: 'none', cursor: 'pointer' }} value={selectedCustomerFilter} onChange={(e) => setSelectedCustomerFilter(e.target.value)}>
                <option value="">جميع الزبائن</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
                إجمالي القوائم: <span style={{ color: '#0f766e', fontSize: '15px', fontWeight: '900' }}>{filteredLists.length}</span>
              </div>
              <button type="button" onClick={handleOpenCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 118, 110, 0.2)', transition: 'all 0.2s' }}>
                <Plus size={18} />
                <span>إنشاء قائمة أسعار جديدة</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Grid / List */}
      {loading ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={32} style={{ color: '#0f766e', animation: 'spin 1s linear infinite' }} />
          <p style={{ margin: 0, fontWeight: 'bold', color: '#64748b' }}>جاري تحميل قوائم الأسعار...</p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
            <Tag size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>لا توجد قوائم أسعار حالياً</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>انقر على "إنشاء قائمة أسعار جديدة" لبدء تخصيص الأسعار</p>
        </div>
      ) : (
        <>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '6rem' }}>
              {filteredLists.map((list) => {
                const itemCount = (list.items || []).length;
                const avgDiscount = itemCount > 0 
                  ? ((list.items || []).reduce((acc, curr) => acc + (parseFloat(curr.discountPercent) || 0), 0) / itemCount).toFixed(1)
                  : '0.0';

                const customerData = customers.find(c => c.id === list.customerId || c.name === list.customerName);
                const customerNum = customerData?.customerNumber || '-';

                return (
                  <div key={list.id} style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    
                    {/* Top Row: Pill and Options */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ backgroundColor: '#f0fdfa', color: '#0f766e', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '900' }}>
                        {customerNum}
                      </span>
                      <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
                        <MoreHorizontal size={24} />
                      </button>
                    </div>

                    {/* Customer Name */}
                    <div style={{ textAlign: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{list.customerName}</h3>
                    </div>

                    {/* 3 Info Blocks */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1, border: '1px solid #f1f5f9', borderRadius: '16px', padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="#94a3b8" />
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>تاريخ الإنشاء</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>{list.updatedAt ? getLocalDateStr(new Date(list.updatedAt)) : '-'}</span>
                      </div>
                      
                      <div style={{ flex: 1, border: '1px solid #f1f5f9', borderRadius: '16px', padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Percent size={12} color="#10b981" />
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>الخصم</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{avgDiscount}%</span>
                      </div>

                      <div style={{ flex: 1, border: '1px solid #f1f5f9', borderRadius: '16px', padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={12} color="#0f766e" />
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>السعر</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{itemCount} بند</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => handleDelete(list.id)} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #fecaca', backgroundColor: '#fff', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={20} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>حذف</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => handleDirectPrint(list)} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #bbf7d0', backgroundColor: '#fff', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Printer size={20} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>طباعة</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => handleCloneList(list)} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #fef08a', backgroundColor: '#fff', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Copy size={20} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>نسخ</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => handleOpenEditModal(list)} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Edit2 size={20} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>تعديل</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => { setSelectedList(list); setShowPreviewModal(true); }} style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #ccfbf1', backgroundColor: '#fff', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Eye size={20} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>عرض</span>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: '800' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>رقم الزبون</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>الزبون</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>عدد البنود</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>متوسط الخصم</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>تاريخ التحديث</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>ملاحظات / المصدر</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLists.map((list) => {
                    const itemCount = (list.items || []).length;
                    const avgDiscount = itemCount > 0 
                      ? ((list.items || []).reduce((acc, curr) => acc + (parseFloat(curr.discountPercent) || 0), 0) / itemCount).toFixed(1)
                      : '0.0';

                    const customerData = customers.find(c => c.id === list.customerId || c.name === list.customerName);
                    const customerNum = customerData?.customerNumber || '-';

                    return (
                      <tr key={list.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '900', color: '#0f766e' }}>
                          <span style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '4px 10px', fontSize: '12px' }}>
                            {customerNum}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '900', color: '#0f172a', fontSize: '14.5px' }}>
                          {list.customerName}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#475569' }}>
                          <span style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '3px 10px', fontSize: '12.5px' }}>
                            {itemCount} بند
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>
                          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '3px 10px', fontSize: '12.5px', fontWeight: '900' }}>
                            %{avgDiscount}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12.5px', fontWeight: 'bold' }}>
                          {list.updatedAt ? getLocalDateStr(new Date(list.updatedAt)) : '-'}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12.5px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {list.notes || '-'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                            <button type="button" onClick={() => { setSelectedList(list); setShowPreviewModal(true); }} style={{ width: '34px', height: '34px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', color: '#0f766e', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="عرض وطباعة"><Eye size={16} /></button>
                            <button type="button" onClick={() => handleOpenEditModal(list)} style={{ width: '34px', height: '34px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="تعديل"><Edit2 size={16} /></button>
                            <button type="button" onClick={() => handleCloneList(list)} style={{ width: '34px', height: '34px', backgroundColor: '#fffdf0', border: '1px solid #fef08a', color: '#92400e', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="نسخ"><Copy size={16} /></button>
                            <button type="button" onClick={() => handleDirectPrint(list)} style={{ width: '34px', height: '34px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="طباعة"><Printer size={16} /></button>
                            <button type="button" onClick={() => handleDelete(list.id)} style={{ width: '34px', height: '34px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="حذف"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </>
      )}

      {activeTab === 'master' && (
        <>
          {/* Master Toolbar */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Right Group in RTL: Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              minWidth: isMobile ? '100%' : '300px',
              justifyContent: isMobile ? 'stretch' : 'flex-start'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  placeholder="بحث باسم الصنف أو الكود..."
                  style={{
                    width: '100%',
                    height: '42px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0 38px 0 14px',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                    outline: 'none',
                    fontWeight: 'bold',
                    boxSizing: 'border-box'
                  }}
                  value={masterSearchTerm}
                  onChange={(e) => setMasterSearchTerm(e.target.value)}
                />
                <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>

            {/* Left Group in RTL: Add Product Button + Export Icons right next to it */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }}>
              {/* Add Product Button */}
              {canEditMasterPricing && <button
                type="button"
                onClick={handleOpenCreateMaster}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0 20px',
                  height: '42px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  flex: isMobile ? 1 : 'none'
                }}
              >
                <Plus size={18} />
                <span>إضافة صنف للمخزون</span>
              </button>}

              {/* Action Buttons Right Next To It */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="no-print">
                <button onClick={handleMasterPrint} title="طباعة" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff', color: '#2563eb', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <Printer size={20} strokeWidth={2.5} />
                </button>
                <button onClick={exportMasterToWord} title="تصدير إلى Word" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <WordIcon size={22} />
                </button>
                <button onClick={exportMasterToExcel} title="تصدير إلى Excel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <ExcelIcon size={22} />
                </button>
                <button onClick={exportMasterToPDF} title="تصدير إلى PDF" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#ffffff', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg" alt="PDF" width="22" height="22" />
                </button>
                {canDeleteMasterPricing && selectedMasterIds && selectedMasterIds.length > 0 && (
                  <button onClick={handleDeleteSelectedMaster} title="حذف المحدد" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '42px', border: 'none', borderRadius: '10px', backgroundColor: '#ef4444', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)', whiteSpace: 'nowrap' }}>
                    <Trash2 size={16} /> حذف ({selectedMasterIds.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          <div 
            ref={tableScrollRef}
            onMouseDown={handleTableMouseDown}
            onMouseLeave={handleTableMouseLeave}
            onMouseUp={handleTableMouseUp}
            onMouseMove={handleTableMouseMove}
            className="print-table-container visible-scrollbar" 
            dir="rtl" 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: isMobile ? '0' : '16px', 
              border: isMobile ? 'none' : '1px solid #e2e8f0', 
              overflowX: 'auto', 
              overflowY: isMobile ? 'visible' : 'scroll', 
              maxHeight: isMobile ? 'none' : '700px', 
              direction: 'rtl', 
              boxShadow: isMobile ? 'none' : '0 1px 3px rgba(0,0,0,0.02)', 
              scrollBehavior: 'smooth' 
            }}
          >
            <div id="master-pdf-wrapper" style={{ direction: 'rtl', width: '100%', backgroundColor: 'white' }} dir="rtl">
            <style>{`
              #master-print-area thead th {
                white-space: nowrap !important;
                line-height: 1.2;
                vertical-align: middle;
                text-align: center !important;
                border-left: 1px solid #e2e8f0;
                font-size: 9px;
                padding: 11px 2px !important;
              }
              #master-print-area thead th > div {
                display: flex !important;
                width: 100%;
                min-width: 0;
                align-items: center;
                justify-content: center !important;
                gap: 2px !important;
                white-space: nowrap !important;
              }
              #master-print-area thead th svg {
                width: 10px !important;
                height: 10px !important;
                flex: 0 0 10px;
              }
              #master-print-area thead th:last-child {
                border-left: none;
              }
              #master-print-area th,
              #master-print-area td {
                box-sizing: border-box;
                vertical-align: middle;
              }
              #master-print-area input[type="checkbox"] {
                display: block;
                margin: 0 auto;
              }
            `}</style>
            <table id="master-print-area" style={{ width: '100%', minWidth: '1180px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', direction: 'rtl' }} dir="rtl">
              <colgroup>
                {canDeleteMasterPricing && <col style={{width:'3.5%'}}/>}
                <col style={{width:'4%'}}/>
                <col style={{width:'8%'}}/>
                <col style={{width:canDeleteMasterPricing?'29%':'32%'}}/>
                <col style={{width:'9%'}}/>
                <col style={{width:'8%'}}/>
                <col style={{width:'11%'}}/>
                <col style={{width:'10%'}}/>
                <col style={{width:'11%'}}/>
                <col style={{width:canDeleteMasterPricing?'6.5%':'7%'}}/>
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: '800' }}>
                  {canDeleteMasterPricing && <th className="no-print" style={{ padding: '10px 3px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => handleSelectAllMaster(e, displayedMasterProducts.map(p => p.id))}
                      checked={displayedMasterProducts.length > 0 && displayedMasterProducts.every(product => selectedMasterIds.includes(product.id))}
                      style={{ transform: 'scale(1.2)' }}
                    />
                  </th>}
                  <th style={{ padding: '10px 3px', textAlign: 'center' }}>م</th>
                  <th 
                    style={{ padding: '10px 4px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleMasterSort('itemNumber')}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                      كود الصنف
                      {masterSortConfig.key === 'itemNumber' && (masterSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                      {masterSortConfig.key !== 'itemNumber' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                  <th 
                    style={{ padding: '10px 5px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleMasterSort('name')}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      اسم الصنف
                      {masterSortConfig.key === 'name' && (masterSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                      {masterSortConfig.key !== 'name' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                                    <th style={{ padding: '10px 3px' }}>الكمية</th>
                  <th style={{ padding: '10px 3px' }}>شريحة الكمية</th>
                  <th onClick={() => handleMasterSort('basePrice')} style={{ padding: '10px 3px', cursor: 'pointer', color: '#2563eb' }}>سعر القائمة ↕</th>
                  <th style={{ padding: '10px 3px', color: '#ea580c' }}>نسبة الخصم</th>
                  <th style={{ padding: '10px 3px', color: '#16a34a' }}>السعر بعد الخصم</th>
                  <th className="no-print" style={{ padding: '10px 3px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayedMasterProducts.map((product, idx) => {
                  const tier = getActiveTier(product);
                  const listPrice = getTierListPrice(product, tier);
                  const discount = getTierPriceListDiscount(product, tier);
                  const priceAfterDiscount = getTierPriceAfterDiscount(product, tier);
                  const warehouseAvailability = getProductWarehouseAvailability(product);
                  return (
                  <tr key={`${product.id || 'product'}-${product.itemNumber || 'no-code'}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: product.isFromStock ? 'transparent' : '#fef2f2', opacity: product.isFromStock ? 1 : 0.85, fontSize:'12.5px' }}>
                    {canDeleteMasterPricing && <td className="no-print" style={{ padding: '8px 2px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedMasterIds.includes(product.id)} 
                        onChange={() => handleToggleMasterSelection(product.id)}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      />
                    </td>}
                    <td style={{ padding: '8px 2px', fontWeight: 'bold', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 2px', textAlign: 'center', fontWeight: '900', color: '#0f766e' }}>
                      <span style={{ display:'block',backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '6px', padding: '4px 2px', fontSize: '10px', whiteSpace: 'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>
                        {product.itemNumber && product.itemNumber !== '-' ? product.itemNumber : 'بدون كود'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right',overflow:'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display:'block', minWidth:0 }}>
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => product.isFromStock ? null : handleInlineMasterChange(product.id, 'name', e.target.value)}
                            onBlur={(e) => { e.target.style.border = '1px solid transparent'; product.isFromStock ? null : handleInlineMasterBlur(product); }}
                            readOnly={product.isFromStock}
                            style={{ display:'block', width:'100%', minWidth:0, height: '34px', border: '1px solid transparent', borderRadius: '6px', padding: '0 4px', fontWeight: '900', fontSize:'12.5px', color: '#0f172a', backgroundColor: 'transparent', outline: 'none', transition: 'border 0.2s', textAlign: 'right', cursor: product.isFromStock ? 'default' : 'text', textOverflow:'ellipsis' }}
                            onFocus={(e) => { if(!product.isFromStock) e.target.style.border = '1px solid #cbd5e1'; }}
                          />
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:'3px', flexWrap:'wrap', width:'100%', marginTop:'2px', paddingRight:'4px' }}>
                            {warehouseAvailability.length > 0 ? warehouseAvailability.map(({ warehouse, quantity }) => (
                              <span
                                key={warehouse}
                                title={`${warehouse}: ${quantity.toLocaleString('en-US')} متوفر`}
                                style={{ display:'inline-flex', alignItems:'center', gap:'3px', padding:'3px 5px', border:'1px solid #99f6e4', borderRadius:'6px', background:'#f0fdfa', color:'#0f766e', fontSize:'9px', fontWeight:'900', lineHeight:1.2, whiteSpace:'nowrap' }}
                              >
                                <span>{warehouse.replace(/^مستودع\s*/, '')}</span>
                                <strong style={{ color:'#047857', fontSize:'10px' }}>{quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
                              </span>
                            )) : (
                              <span title="غير متوفر في المستودعات" style={{ padding:'3px 5px', border:'1px solid #e2e8f0', borderRadius:'6px', background:'#f8fafc', color:'#94a3b8', fontSize:'9px', fontWeight:'800', whiteSpace:'nowrap' }}>غير متوفر</span>
                            )}
                          </div>
                        </div>
                        {product.isFromStock === false && (
                          <span style={{ fontSize: '11px', color: '#ef4444', marginRight: '8px', fontWeight: 'bold' }}>* غير موجود في المخزون الحالي</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" min="1" value={requestedQuantities[product.id] || ''} placeholder="1"
                        onChange={(e) => setRequestedQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                        style={{ width: '100%', minWidth:0, height: '34px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center', fontWeight: '900',fontSize:'12.5px' }} />
                    </td>
                    <td style={{ padding: '7px 2px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <select
                        value={tier?.from ?? 1}
                        onChange={(event) => handleTierSelectionChange(product, event.target.value)}
                        title="اختر شريحة الكمية"
                        style={{width:'88%',height:'32px',margin:'0 auto',display:'block',border:'1px solid #cbd5e1',background:'#f8fafc',borderRadius:'8px',padding:'0 2px',fontSize:'10.5px',fontWeight:'800',cursor:'pointer',color:'#334155',outline:'none',textAlign:'center',textAlignLast:'center'}}
                      >
                        {[...getProductTiers(product)].sort((a,b)=>Number(a.from)-Number(b.from)).map((quantityTier,tierIndex) => (
                          <option key={`${quantityTier.from}-${quantityTier.to ?? 'plus'}-${tierIndex}`} value={quantityTier.from}>{quantityTier.from || 1}–{quantityTier.to ?? 'فأكثر'}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', background: '#eff6ff' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={listPriceInputs[`${product.id}-${tier?.from}`] ?? formatMoney(listPrice)}
                        readOnly={!canEditMasterPricing}
                        onChange={(event) => handleTierListPriceChange(product, tier, event.target.value)}
                        onBlur={(event) => handleTierListPriceChange(product, tier, event.target.value, true)}
                        onFocus={(event) => {
                          if (Number(event.currentTarget.value) === 0) event.currentTarget.select();
                        }}
                        title={canEditMasterPricing ? 'سعر الشريحة من حاسبة التسعير — يمكن للمدير تعديله' : 'سعر الشريحة المعتمد من حاسبة التسعير'}
                        style={{ width: '100%', minWidth:0,height: '34px', border: canEditMasterPricing ? '1px solid #bfdbfe' : 'none', borderRadius: '6px', textAlign: 'center', fontWeight: '900', fontSize:'12.5px',color: '#1d4ed8', backgroundColor: 'transparent', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '8px 5px', background: '#fff7ed', color: '#c2410c', fontWeight: '950', fontSize:'12px' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'2px', direction:'ltr', width:'100%' }}>
                        <span style={{ fontWeight:'900', lineHeight:1 }}>%</span>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="1"
                          value={discountInputs[`${product.id}-${tier?.from}`] ?? Math.min(99, Math.round(discount)).toString()}
                          readOnly={!canEditMasterPricing}
                          onChange={(event) => handleTierDiscountChange(product, tier, event.target.value)}
                          onBlur={(event) => handleTierDiscountChange(product, tier, event.target.value, true)}
                          onFocus={(event) => {
                            if (canEditMasterPricing && Number(event.currentTarget.value) === 0) event.currentTarget.select();
                          }}
                          title={canEditMasterPricing ? 'يمكنك تعديل خصم هذه الشريحة حسب صلاحيتك' : 'خصم الشريحة — التعديل متاح للمدير أو لمن يملك صلاحية تعديل قوائم الأسعار'}
                          onKeyDown={(event) => {
                            if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
                          }}
                          style={{ width:'46px', minWidth:'46px', height:'32px', padding:'0 3px', border:discount > 50?'2px solid #ef4444':(canEditMasterPricing?'1px solid #fed7aa':'none'), borderRadius:'6px', background:discount > 50?'#fef2f2':'transparent', color:discount > 50?'#dc2626':'#c2410c', textAlign:'center', fontWeight:'900', fontSize:'12px', outline:'none', cursor:canEditMasterPricing?'text':'default' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '10px 4px', background: '#f0fdf4', color: '#15803d', fontWeight: '950', fontSize: '12.5px' }}>
                      <span style={{fontSize:'12.5px'}}>{formatMoney(priceAfterDiscount)}</span>
                    </td>
                    <td className="no-print" style={{ padding: '8px 3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {canDeleteMasterPricing && <button onClick={() => handleDeleteMaster(product)} style={{ width: '30px', height: '30px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="حذف من قائمة الأسعار">
                          <Trash2 size={16} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create / Edit Customer Price List - Clean Calm White */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '95vw',
            maxWidth: '1420px',
            maxHeight: '94vh',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
            border: '1px solid #cbd5e1'
          }}>
            {/* Calm Clean Modal Header */}
            <div style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e' }}>
                  <Tag size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                    {formData.id ? 'تعديل قائمة أسعار الزبون' : 'إنشاء قائمة أسعار جديدة للزبون'}
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                    تحديد الأسعار الأساسية ونسب الخصم المخصصة للزبون
                  </p>
                </div>
              </div>

              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              
              {/* Meta Inputs Card */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                backgroundColor: '#f8fafc',
                padding: '16px 18px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>اسم الزبون *</label>
                  <input
                    type="text"
                    required
                    placeholder="ادخل اسم الزبون..."
                    style={{ width: '100%', height: '40px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '13px', fontWeight: 'bold', outline: 'none', backgroundColor: '#ffffff' }}
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    list="customer-suggestions"
                  />
                  <datalist id="customer-suggestions">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '6px' }}>ملاحظات إضافية (اختياري)</label>
                  <input
                    type="text"
                    placeholder="ملاحظات خاصة بالطلب أو الزبون..."
                    style={{ width: '100%', height: '40px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '13px', fontWeight: 'bold', outline: 'none', backgroundColor: '#ffffff' }}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Dedicated Terms & Conditions Section */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #ccfbf1',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} style={{ color: '#0f766e' }} />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>الشروط والأحكام المعتمدة للقائمة:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowTermsPanel(!showTermsPanel)}
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      backgroundColor: '#ffffff',
                      color: '#0f766e',
                      border: '1.5px solid #0f766e',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span>تعديل الشروط والأحكام</span>
                    <SlidersHorizontal size={15} style={{ color: '#0f766e' }} />
                  </button>
                </div>

                {/* Display selected terms as badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(formData.terms && formData.terms.length > 0) ? (
                    formData.terms.map((t, idx) => (
                      <span key={idx} style={{
                        backgroundColor: '#f0fdfa',
                        color: '#0f766e',
                        border: '1px solid #ccfbf1',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Check size={12} style={{ color: '#0f766e', strokeWidth: 3 }} />
                        <span>{t}</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                      لا توجد شروط وأحكام محددة .. اضغط على زر "تعديل الشروط والأحكام" لاختيار الشروط المعتمدة.
                    </span>
                  )}
                </div>

                {showTermsPanel && (
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        'قائمة أسعار معتمدة',
                        'الأسعار شاملة التوصيل',
                        'الأسعار غير شاملة ضريبة المبيعات',
                        'الأسعار سارية لمدة 30 يوماً من تاريخه',
                        'الدفع نقداً عند الاستلام',
                        'خصم إضافي للكميات الكبيرة'
                      ].map((term, tIdx) => {
                        const isSelected = (formData.terms || []).includes(term);
                        return (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => {
                              let current = [...(formData.terms || [])];
                              if (isSelected) {
                                current = current.filter(t => t !== term);
                              } else {
                                current.push(term);
                              }
                              setFormData(prev => ({ ...prev, terms: current }));
                            }}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '7px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #0f766e' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                              color: isSelected ? '#0f766e' : '#334155',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{
                              width: '15px',
                              height: '15px',
                              borderRadius: '3.5px',
                              backgroundColor: isSelected ? '#0f766e' : '#ffffff',
                              border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s'
                            }}>
                              {isSelected && <Check size={11} style={{ color: '#ffffff', strokeWidth: 3 }} />}
                            </div>
                            <span>{term}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk Discount & Catalog Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                backgroundColor: '#f0fdfa',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '1px solid #ccfbf1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f766e' }}>تطبيق خصم موحد (%):</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="15"
                    style={{ width: '75px', height: '36px', border: '1px solid #99f6e4', backgroundColor: '#ffffff', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', color: '#0f766e', outline: 'none' }}
                    value={formData.bulkDiscount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bulkDiscount: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkDiscount}
                    style={{ height: '36px', padding: '0 16px', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    تطبيق على الكل
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>


                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    style={{ height: '36px', minWidth: '130px', padding: '0 16px', backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    + إضافة سطر جديد
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateMaster}
                    style={{ height: '36px', minWidth: '130px', padding: '0 16px', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    + إضافة صنف للمخزون
                  </button>
                </div>
              </div>


              {/* Items Table Container */}
              <div 
                className="visible-scrollbar" 
                dir="rtl"
                style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'visible', direction: 'rtl' }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: '800' }}>
                      <th className="no-print" style={{ padding: '10px', width: '32px', textAlign: 'center' }}></th>
                      <th style={{ padding: '10px', width: '36px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>كود الصنف</th>
                      <th 
                        style={{ padding: '10px', minWidth: '320px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleModalSort('name')}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          اسم البند / المنتج
                          {modalSortConfig.key === 'name' && (modalSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          {modalSortConfig.key !== 'name' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                        </div>
                      </th>
                      <th 
                        style={{ padding: '10px', width: '120px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleModalSort('basePrice')}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          السعر الأساسي (د.أ)
                          {modalSortConfig.key === 'basePrice' && (modalSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          {modalSortConfig.key !== 'basePrice' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                        </div>
                      </th>
                      <th 
                        style={{ padding: '10px', width: '110px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleModalSort('discountPercent')}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          نسبة الخصم (%)
                          {modalSortConfig.key === 'discountPercent' && (modalSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          {modalSortConfig.key !== 'discountPercent' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                        </div>
                      </th>
                      <th 
                        style={{ padding: '10px', width: '130px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleModalSort('discountedPrice')}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          السعر بعد الخصم (د.أ)
                          {modalSortConfig.key === 'discountedPrice' && (modalSortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          {modalSortConfig.key !== 'discountedPrice' && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
                        </div>
                      </th>
                      <th style={{ padding: '10px', width: '160px' }}>ملاحظات / التعبئة</th>
                      <th className="no-print" style={{ padding: '10px', width: '44px', textAlign: 'center' }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr 
                        key={item.id || idx} 
                        style={{ 
                          borderBottom: '1px solid #f1f5f9', 
                          backgroundColor: draggedIndex === idx ? '#f0fdfa' : (idx % 2 === 0 ? '#ffffff' : '#fafafa'),
                          opacity: draggedIndex === idx ? 0.6 : 1,
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td 
                          className="no-print"
                          style={{ padding: '8px', textAlign: 'center', cursor: 'grab' }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          title="اضغط واسحب بالماوس لترتيب البند لجميع الاتجاهات"
                        >
                          <GripVertical size={16} style={{ color: '#94a3b8', margin: '0 auto' }} />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <div style={{ width: '100%', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontSize: '12px', fontWeight: 'bold', color: '#64748b', cursor: 'not-allowed', userSelect: 'none', whiteSpace: 'nowrap' }}>
                            {item.itemNumber || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <Select
                            options={masterProducts.filter(p => p.isFromStock !== false).map(p => ({
                              value: p.id,
                              label: p.name,
                              itemNumber: p.itemNumber || '-',
                              basePrice: p.basePrice || 0,
                              defaultDiscount: p.defaultDiscount || 0
                            }))}
                            value={{ value: item.name, label: item.name || 'اختر الصنف...' }}
                            onChange={(selected) => {
                              if (!selected) return;
                              const updated = [...formData.items];
                              
                              const isDuplicate = updated.some((it, i) => i !== idx && it.name === selected.label);
                              if (isDuplicate) {
                                MySwal.fire({
                                  toast: true,
                                  position: 'top-end',
                                  icon: 'warning',
                                  title: 'هذا الصنف موجود مسبقاً في هذه القائمة',
                                  showConfirmButton: false,
                                  timer: 2000
                                });
                                return;
                              }

                              const discount = selected.defaultDiscount || 0;
                              const base = selected.basePrice || 0;
                              const discounted = parseFloat((base * (1 - discount / 100)).toFixed(3));
                              updated[idx] = {
                                ...updated[idx],
                                name: selected.label,
                                itemNumber: selected.itemNumber,
                                basePrice: base,
                                discountPercent: discount,
                                discountedPrice: discounted
                              };
                              setFormData(prev => ({ ...prev, items: updated }));
                            }}
                            placeholder="اختر الصنف..."
                            isSearchable
                            styles={{
                              control: (base) => ({ ...base, minHeight: '36px', borderRadius: '6px', borderColor: '#e2e8f0', fontWeight: 'bold', color: '#0f172a', textAlign: 'right', minWidth: '300px' }),
                              menu: (base) => ({ ...base, textAlign: 'right', zIndex: 9999 }),
                              option: (base, { isFocused }) => ({ ...base, backgroundColor: isFocused ? '#f1f5f9' : 'white', color: '#0f172a', fontWeight: '600' })
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.01"
                            style={{ width: '100%', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a', outline: 'none', backgroundColor: '#ffffff' }}
                            value={item.basePrice}
                            onChange={(e) => handleItemChange(idx, 'basePrice', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.1"
                            style={{ width: '100%', height: '36px', border: '1px solid #fef08a', backgroundColor: '#fffdf0', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: '#92400e', outline: 'none' }}
                            value={item.discountPercent}
                            onChange={(e) => handleItemChange(idx, 'discountPercent', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.001"
                            style={{ width: '100%', height: '36px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: '#166534', outline: 'none' }}
                            value={item.discountedPrice}
                            onChange={(e) => handleItemChange(idx, 'discountedPrice', e.target.value)}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            placeholder="ملاحظات..."
                            style={{ width: '100%', height: '36px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 8px', fontSize: '12px', outline: 'none', backgroundColor: '#ffffff' }}
                            value={item.notes || ''}
                            onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                          />
                        </td>
                        <td className="no-print" style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="حذف البند"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 118, 110, 0.2)', fontSize: '13.5px' }}
                >
                  حفظ قائمة الأسعار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Printable View */}
      {showPreviewModal && selectedList && (
        <div className="print-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="print-modal-container" style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: '1150px',
            maxHeight: '94vh',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.2)',
            border: '1px solid #cbd5e1'
          }}>
            <div className="print-hide" style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: '800', fontSize: '15px' }}>معاينة وطباعة قائمة الأسعار الرسمية</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#0f766e', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  <span>طباعة</span>
                </button>
                <button type="button" onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="printable-content" style={{ padding: '32px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>قائمة الاسعار المعتمدة</h1>
                  <p style={{ margin: '8px 0 0 0', fontSize: '15px', fontWeight: 'bold', color: '#0f766e' }}>
                    الزبون: <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{selectedList.customerName}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>تاريخ التحديث: <span style={{ color: '#0f172a', fontWeight: '800' }}>{selectedList.updatedAt ? getLocalDateStr(new Date(selectedList.updatedAt)) : getLocalDateStr()}</span></div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#334155', fontWeight: '800', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '40px', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>#</th>
                    <th 
                      style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handlePreviewSort('name')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>البند / المنتج</span>
                        <span className="no-print">
                          {previewSortConfig.key === 'name' ? (previewSortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '100px', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handlePreviewSort('basePrice')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>السعر (د.أ)</span>
                        <span className="no-print">
                          {previewSortConfig.key === 'basePrice' ? (previewSortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '90px', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handlePreviewSort('discountPercent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>نسبة الخصم</span>
                        <span className="no-print">
                          {previewSortConfig.key === 'discountPercent' ? (previewSortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th 
                      style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', textAlign: 'center', width: '120px', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => handlePreviewSort('discountedPrice')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>السعر النهائي (د.أ)</span>
                        <span className="no-print">
                          {previewSortConfig.key === 'discountedPrice' ? (previewSortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </div>
                    </th>
                    <th style={{ position: 'static', padding: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPreviewItems.map((item, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{i + 1}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a', whiteSpace: 'nowrap' }}>{item.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{parseFloat(item.basePrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#92400e', fontWeight: 'bold', backgroundColor: '#fffdf0', whiteSpace: 'nowrap' }}>%{item.discountPercent}</td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', color: '#166534', backgroundColor: '#f0fdf4', whiteSpace: 'nowrap' }}>
                        {parseFloat(item.discountedPrice || 0).toFixed(3)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedList.notes && (
                <div style={{ backgroundColor: '#f0fdfa', padding: '12px', borderRadius: '8px', border: '1px solid #ccfbf1', fontSize: '12px', fontWeight: 'bold', color: '#0f766e' }}>
                  ملاحظات: {selectedList.notes}
                </div>
              )}

              <div style={{ paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
                <div>توقيع قسم المبيعات: .........................</div>
                <div>اعتماد الإدارة: .........................</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPriceLists;
